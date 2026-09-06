from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings

def _async_database_url(url: str) -> str:
    return url.replace("postgresql://", "postgresql+asyncpg://")


async_url = _async_database_url(settings.DATABASE_URL)
read_async_url = _async_database_url(settings.DATABASE_READ_URL or settings.DATABASE_URL)

engine = create_async_engine(
    async_url,
    echo=False,
    future=True,
    pool_size=20,
    max_overflow=10,
)

async_session_maker = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

read_engine = create_async_engine(
    read_async_url,
    echo=False,
    future=True,
    pool_size=20,
    max_overflow=10,
)

read_session_maker = sessionmaker(
    read_engine, class_=AsyncSession, expire_on_commit=False
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session


async def get_read_db() -> AsyncGenerator[AsyncSession, None]:
    async with read_session_maker() as session:
        yield session
