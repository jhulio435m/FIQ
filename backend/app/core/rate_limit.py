import asyncio
import ipaddress
from collections import deque
from time import monotonic

from fastapi import HTTPException, Request, status

from app.core.config import settings


def _limited(retry_after: int) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail="Demasiadas solicitudes. Intenta nuevamente más tarde.",
        headers={"Retry-After": str(max(1, retry_after))},
    )


class InMemoryRateLimiter:
    def __init__(self, *, requests: int, window_seconds: int) -> None:
        self.requests = requests
        self.window_seconds = window_seconds
        self._buckets: dict[str, deque[float]] = {}
        self._lock = asyncio.Lock()

    async def check(self, key: str) -> None:
        now = monotonic()
        cutoff = now - self.window_seconds
        async with self._lock:
            bucket = self._buckets.setdefault(key, deque())
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()
            if len(bucket) >= self.requests:
                raise _limited(int(self.window_seconds - (now - bucket[0])))
            bucket.append(now)

    async def clear(self) -> None:
        async with self._lock:
            self._buckets.clear()


class RedisRateLimiter:
    _SCRIPT = """
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('TTL', KEYS[1])
return {current, ttl}
"""

    def __init__(self, *, url: str, requests: int, window_seconds: int) -> None:
        from redis.asyncio import Redis

        self.requests = requests
        self.window_seconds = window_seconds
        self._redis = Redis.from_url(url, encoding="utf-8", decode_responses=True)

    async def check(self, key: str) -> None:
        try:
            current, ttl = await self._redis.eval(
                self._SCRIPT,
                1,
                f"fiq:rate-limit:{key}",
                self.window_seconds,
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="El control de acceso está temporalmente no disponible.",
            ) from exc
        if int(current) > self.requests:
            raise _limited(int(ttl))

    async def clear(self) -> None:
        keys = [key async for key in self._redis.scan_iter(match="fiq:rate-limit:*")]
        if keys:
            await self._redis.delete(*keys)


def build_rate_limiter(*, requests: int, window_seconds: int):
    if settings.REDIS_URL:
        return RedisRateLimiter(
            url=settings.REDIS_URL,
            requests=requests,
            window_seconds=window_seconds,
        )
    return InMemoryRateLimiter(requests=requests, window_seconds=window_seconds)


def _valid_ip(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return str(ipaddress.ip_address(value.strip()))
    except ValueError:
        return None


def client_rate_key(request: Request, scope: str) -> str:
    client_host = request.client.host if request.client else "unknown"
    if settings.TRUST_PROXY_HEADERS:
        forwarded = request.headers.get("cf-connecting-ip")
        if not forwarded:
            forwarded = request.headers.get("x-forwarded-for", "").split(",", 1)[0]
        client_host = _valid_ip(forwarded) or client_host
    return f"{scope}:{client_host}"
