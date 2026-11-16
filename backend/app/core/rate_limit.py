import hashlib

from fastapi import HTTPException, Request, status

from app.core.config import settings
from app.core.kvstore import get_store


def client_ip(request: Request) -> str:
    # Uvicorn corre con --proxy-headers detrás de nginx/cloudflared, así que
    # request.client ya refleja la IP real reenviada por el proxy.
    return request.client.host if request.client else "unknown"


def _key(request: Request, scope: str, identifier: str) -> str:
    raw = f"{client_ip(request)}|{identifier.lower().strip()}"
    digest = hashlib.sha256(raw.encode()).hexdigest()[:32]
    return f"ratelimit:{scope}:{digest}"


async def reset_rate_limit(request: Request, scope: str, identifier: str = "") -> None:
    """Tras un login exitoso: el límite apunta a intentos fallidos (fuerza bruta)."""
    await get_store().delete(_key(request, scope, identifier))


async def enforce_rate_limit(
    request: Request, scope: str, identifier: str = "", *, multiplier: int = 1
) -> None:
    """Ventana fija por IP (+ identificador opcional, p. ej. el email).

    `multiplier` amplía el umbral en endpoints limitados solo por IP: detrás del
    NAT del campus muchos usuarios comparten la misma dirección.
    """
    key = _key(request, scope, identifier)
    window = settings.AUTH_RATE_LIMIT_WINDOW_SECONDS
    count = await get_store().incr(key, window)
    if count > settings.AUTH_RATE_LIMIT_ATTEMPTS * multiplier:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados intentos. Intenta nuevamente en unos minutos.",
            headers={"Retry-After": str(window)},
        )
