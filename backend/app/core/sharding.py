from collections.abc import AsyncGenerator, Sequence
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.core.database import _async_database_url


def _parse_urls(value: str) -> list[str]:
    return [url.strip() for url in value.split(",") if url.strip()]


_write_urls = _parse_urls(settings.RESOURCE_SHARD_DATABASE_URLS)
_read_urls = _parse_urls(settings.RESOURCE_SHARD_READ_DATABASE_URLS) or _write_urls

if _read_urls and len(_read_urls) != len(_write_urls):
    raise RuntimeError("RESOURCE_SHARD_READ_DATABASE_URLS must match RESOURCE_SHARD_DATABASE_URLS length")


def _build_engines(urls: Sequence[str]) -> list[AsyncEngine]:
    return [
        create_async_engine(
            _async_database_url(url),
            echo=False,
            future=True,
            pool_size=20,
            max_overflow=10,
        )
        for url in urls
    ]


_write_engines = _build_engines(_write_urls)
_read_engines = _build_engines(_read_urls)
_write_session_makers = [
    sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    for engine in _write_engines
]
_read_session_makers = [
    sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    for engine in _read_engines
]


def resource_sharding_enabled() -> bool:
    return bool(_write_session_makers)


def resource_shard_count() -> int:
    return len(_write_session_makers)


def resource_write_engine(shard_index: int) -> AsyncEngine:
    return _write_engines[shard_index]


def resource_shard_index(curso_id: int | None) -> int:
    if not resource_sharding_enabled():
        return 0
    if curso_id is None:
        return 0
    return (curso_id - 1) % resource_shard_count()


def encode_resource_id(shard_index: int, local_id: int | None) -> int | None:
    if local_id is None:
        return None
    if not resource_sharding_enabled():
        return local_id
    return shard_index * settings.RESOURCE_SHARD_ID_STRIDE + local_id


def decode_resource_id(resource_id: int) -> tuple[int | None, int]:
    if not resource_sharding_enabled():
        return None, resource_id
    shard_index = resource_id // settings.RESOURCE_SHARD_ID_STRIDE
    local_id = resource_id % settings.RESOURCE_SHARD_ID_STRIDE
    if shard_index >= resource_shard_count():
        return None, resource_id
    if shard_index == 0 and resource_id < settings.RESOURCE_SHARD_ID_STRIDE:
        return None, resource_id
    return shard_index, local_id


def resource_id_candidates(resource_id: int) -> list[tuple[int, int]]:
    shard_index, local_id = decode_resource_id(resource_id)
    if shard_index is not None:
        return [(shard_index, local_id)]
    return [(idx, resource_id) for idx in range(resource_shard_count())]


@asynccontextmanager
async def resource_write_session_for_course(
    curso_id: int | None,
) -> AsyncGenerator[tuple[int, AsyncSession], None]:
    shard_index = resource_shard_index(curso_id)
    async with _write_session_makers[shard_index]() as session:
        yield shard_index, session


@asynccontextmanager
async def resource_session(
    shard_index: int,
    *,
    read: bool,
) -> AsyncGenerator[AsyncSession, None]:
    maker = _read_session_makers[shard_index] if read else _write_session_makers[shard_index]
    async with maker() as session:
        yield session
