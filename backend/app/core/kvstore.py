"""Almacén clave-valor con TTL: Redis en staging/producción, memoria en desarrollo/tests.

Se usa para la lista de refresh tokens vigentes y para el rate limiting. En
producción la configuración exige REDIS_URL para que el estado se comparta
entre réplicas del backend.
"""

import logging
import time
from typing import Protocol

from redis.asyncio import Redis

from app.core.config import settings

logger = logging.getLogger(__name__)


class KVStore(Protocol):
    async def set(self, key: str, value: str, ttl_seconds: int) -> None: ...
    async def get(self, key: str) -> str | None: ...
    async def pop(self, key: str) -> str | None: ...
    async def delete(self, key: str) -> None: ...
    async def incr(self, key: str, ttl_seconds: int) -> int: ...
    async def ping(self) -> bool: ...
    async def close(self) -> None: ...


class MemoryStore:
    def __init__(self) -> None:
        self._data: dict[str, tuple[str, float]] = {}

    def _live(self, key: str) -> str | None:
        item = self._data.get(key)
        if item is None:
            return None
        value, expires_at = item
        if expires_at <= time.monotonic():
            self._data.pop(key, None)
            return None
        return value

    async def set(self, key: str, value: str, ttl_seconds: int) -> None:
        self._data[key] = (value, time.monotonic() + ttl_seconds)

    async def get(self, key: str) -> str | None:
        return self._live(key)

    async def pop(self, key: str) -> str | None:
        value = self._live(key)
        self._data.pop(key, None)
        return value

    async def delete(self, key: str) -> None:
        self._data.pop(key, None)

    async def incr(self, key: str, ttl_seconds: int) -> int:
        current = self._live(key)
        if current is None:
            await self.set(key, "1", ttl_seconds)
            return 1
        _, expires_at = self._data[key]
        new_value = int(current) + 1
        self._data[key] = (str(new_value), expires_at)
        return new_value

    async def ping(self) -> bool:
        return True

    async def close(self) -> None:
        self._data.clear()


class RedisStore:
    def __init__(self, url: str) -> None:
        self._client: Redis = Redis.from_url(url, decode_responses=True, socket_timeout=3)

    async def set(self, key: str, value: str, ttl_seconds: int) -> None:
        await self._client.set(key, value, ex=ttl_seconds)

    async def get(self, key: str) -> str | None:
        return await self._client.get(key)

    async def pop(self, key: str) -> str | None:
        # GETDEL es atómico: un refresh token solo puede canjearse una vez.
        return await self._client.getdel(key)

    async def delete(self, key: str) -> None:
        await self._client.delete(key)

    async def incr(self, key: str, ttl_seconds: int) -> int:
        async with self._client.pipeline(transaction=True) as pipe:
            pipe.incr(key)
            pipe.expire(key, ttl_seconds, nx=True)
            count, _ = await pipe.execute()
        return int(count)

    async def ping(self) -> bool:
        return bool(await self._client.ping())

    async def close(self) -> None:
        await self._client.aclose()


_store: KVStore | None = None


def get_store() -> KVStore:
    global _store
    if _store is None:
        if settings.REDIS_URL:
            _store = RedisStore(settings.REDIS_URL)
        else:
            logger.warning("REDIS_URL no configurado: usando almacén en memoria (solo una instancia)")
            _store = MemoryStore()
    return _store


def set_store(store: KVStore | None) -> None:
    """Reemplaza el almacén global (usado por los tests)."""
    global _store
    _store = store


async def close_store() -> None:
    global _store
    if _store is not None:
        await _store.close()
        _store = None
