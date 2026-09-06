"""Opaque, single-use refresh credentials; only hashes are persisted."""
import hashlib
import secrets
from datetime import timedelta, timezone

from fastapi import HTTPException, Request, Response
from sqlalchemy import update
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.models.session import RefreshSession, utc_now
from app.models.user import User

COOKIE = "fiq_refresh"


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def check_browser_origin(request: Request) -> None:
    origin = request.headers.get("origin")
    if origin and origin not in settings.CORS_ORIGINS:
        raise HTTPException(403, "Origen no permitido")


def check_session_request(request: Request) -> None:
    check_browser_origin(request)
    if request.headers.get("x-requested-with") != "FIQ":
        raise HTTPException(403, "Cabecera de sesión requerida")


async def revoke_sessions(db: AsyncSession, user: User) -> None:
    await db.exec(update(User).where(User.id == user.id).values(auth_version=User.auth_version + 1))
    await db.commit()
    await db.refresh(user)


async def issue_refresh(db: AsyncSession, user: User, response: Response) -> None:
    token = secrets.token_urlsafe(48)
    max_age = settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400
    db.add(RefreshSession(
        token_hash=token_hash(token), user_id=user.id, auth_version=user.auth_version,
        expires_at=utc_now() + timedelta(seconds=max_age),
    ))
    await db.commit()
    response.set_cookie(COOKIE, token, max_age=max_age, httponly=True,
                        secure=settings.SESSION_COOKIE_SECURE, samesite="strict", path="/")
    response.headers["Cache-Control"] = "no-store"


async def consume_refresh(db: AsyncSession, request: Request) -> User:
    check_session_request(request)
    token = request.cookies.get(COOKIE, "")
    session = await db.get(RefreshSession, token_hash(token))
    if not session or session.expires_at.replace(tzinfo=timezone.utc) <= utc_now():
        raise HTTPException(401, "Sesión no válida")
    user = await db.get(User, session.user_id)
    if not user or not user.is_effectively_active or user.auth_version != session.auth_version:
        raise HTTPException(401, "Sesión no válida")
    result = await db.exec(update(RefreshSession).where(
        RefreshSession.token_hash == session.token_hash,
        RefreshSession.consumed.is_(False),
    ).values(consumed=True))
    if result.rowcount != 1:
        await revoke_sessions(db, user)
        raise HTTPException(401, "Sesión revocada por reutilización")
    # Commit consumption before issuing a replacement: a crash fails closed.
    await db.commit()
    return user
