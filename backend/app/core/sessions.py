"""Refresh tokens con rotación y revocación.

- El refresh token es un JWT firmado (type=refresh, jti aleatorio).
- Cada jti vigente se registra en el KV store con TTL = vida del token.
- Al refrescar, el jti se canjea atómicamente (pop) y se emite uno nuevo:
  un token robado y ya usado deja de servir.
- Logout elimina el jti, invalidando la sesión aunque el JWT no haya expirado.
- Se entrega solo en cookie HttpOnly; nunca queda accesible a JavaScript.
"""

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import Response
from jose import JWTError, jwt

from app.core.config import settings
from app.core.kvstore import get_store

_REFRESH_TYPE = "refresh"
_AUDIENCE = "fiq:refresh"


def _ttl_seconds() -> int:
    return settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600


def _key(jti: str) -> str:
    return f"refresh:{jti}"


async def issue_refresh_token(user_id: uuid.UUID) -> str:
    jti = uuid.uuid4().hex
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "jti": jti,
        "type": _REFRESH_TYPE,
        "aud": _AUDIENCE,
        "iat": now,
        "exp": now + timedelta(seconds=_ttl_seconds()),
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    await get_store().set(_key(jti), str(user_id), _ttl_seconds())
    return token


def _decode(token: str) -> dict[str, str] | None:
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            audience=_AUDIENCE,
        )
    except JWTError:
        return None
    if payload.get("type") != _REFRESH_TYPE or not payload.get("jti") or not payload.get("sub"):
        return None
    return payload


async def consume_refresh_token(token: str) -> uuid.UUID | None:
    """Valida y revoca el token (un solo uso). Devuelve el id del usuario."""
    payload = _decode(token)
    if payload is None:
        return None
    stored_user = await get_store().pop(_key(payload["jti"]))
    if stored_user is None or stored_user != payload["sub"]:
        return None
    try:
        return uuid.UUID(payload["sub"])
    except ValueError:
        return None


async def revoke_refresh_token(token: str) -> None:
    payload = _decode(token)
    if payload is not None:
        await get_store().delete(_key(payload["jti"]))


def set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        value=token,
        max_age=_ttl_seconds(),
        httponly=True,
        secure=settings.is_production_like,
        samesite="strict",
        path=settings.REFRESH_COOKIE_PATH,
    )


def clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        httponly=True,
        secure=settings.is_production_like,
        samesite="strict",
        path=settings.REFRESH_COOKIE_PATH,
    )
