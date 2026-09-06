import uuid
from typing import Optional

from fastapi import Depends, Request
from fastapi_users import BaseUserManager, FastAPIUsers, UUIDIDMixin
from fastapi_users.authentication import (
    AuthenticationBackend,
    BearerTransport,
    CookieTransport,
    JWTStrategy,
)
from fastapi_users_db_sqlmodel import SQLModelUserDatabaseAsync

from app.core.config import settings
from app.core.database import get_db
from app.core.email import send_password_reset_email
from app.models.user import User
from app.core.sessions import revoke_sessions
from fastapi_users.jwt import decode_jwt, generate_jwt
import jwt

# --- Database Adapter ---

async def get_user_db(session=Depends(get_db)):
    yield SQLModelUserDatabaseAsync(session, User)


# --- User Manager ---

import logging

logger = logging.getLogger(__name__)

class UserManager(UUIDIDMixin, BaseUserManager[User, uuid.UUID]):
    reset_password_token_secret = settings.SECRET_KEY
    verification_token_secret = settings.SECRET_KEY

    async def on_after_reset_password(self, user: User, request: Optional[Request] = None):
        await revoke_sessions(self.user_db.session, user)

    async def update(self, user_update, user: User, safe: bool = False, request: Optional[Request] = None):
        before_email = user.email
        updated = await super().update(user_update, user, safe=safe, request=request)
        if user_update.password is not None or updated.email != before_email:
            await revoke_sessions(self.user_db.session, updated)
        return updated

    async def on_after_register(self, user: User, request: Optional[Request] = None):
        logger.info(f"User {user.id} has registered.")

    async def on_after_forgot_password(
        self, user: User, token: str, request: Optional[Request] = None
    ):
        try:
            await send_password_reset_email(user.email, token)
        except Exception:
            logger.exception("Could not send password reset email for user %s.", user.id)
            raise

    async def on_after_request_verify(
        self, user: User, token: str, request: Optional[Request] = None
    ):
        logger.info("Verification requested for user %s.", user.id)


async def get_user_manager(user_db=Depends(get_user_db)):
    yield UserManager(user_db)


# --- Authentication Backends ---

# 1. Bearer Transport (Standard Header-based)
bearer_transport = BearerTransport(tokenUrl="auth/jwt/login")

# 2. Cookie Transport (Secure HttpOnly)
cookie_transport = CookieTransport(
    cookie_max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    cookie_secure=settings.SESSION_COOKIE_SECURE,
    cookie_samesite="strict",
)

class RevocableJWTStrategy(JWTStrategy):
    def __init__(self, db=None):
        super().__init__(secret=settings.SECRET_KEY, lifetime_seconds=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
        self.db = db

    async def write_token(self, user: User) -> str:
        return generate_jwt({"sub": str(user.id), "aud": self.token_audience,
                             "ver": user.auth_version, "jti": str(uuid.uuid4())},
                            self.encode_key, self.lifetime_seconds, algorithm=self.algorithm)

    async def read_token(self, token, user_manager):
        user = await super().read_token(token, user_manager)
        if not user or not user.is_effectively_active:
            return None
        try:
            data = decode_jwt(token, self.decode_key, self.token_audience, algorithms=[self.algorithm])
        except jwt.PyJWTError:
            return None
        return user if data.get("ver") == user.auth_version else None

    async def destroy_token(self, token, user):
        await revoke_sessions(self.db, user)


def get_jwt_strategy(db=None) -> JWTStrategy:
    return RevocableJWTStrategy(db)


def strategy_dependency(db=Depends(get_db)) -> JWTStrategy:
    return get_jwt_strategy(db)


auth_backend_jwt = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=strategy_dependency,
)

auth_backend_cookie = AuthenticationBackend(
    name="cookie",
    transport=cookie_transport,
    get_strategy=strategy_dependency,
)

# --- FastAPI Users Instance ---

fastapi_users = FastAPIUsers[User, uuid.UUID](
    get_user_manager,
    [auth_backend_jwt, auth_backend_cookie],
)

current_active_user = fastapi_users.current_user(active=True)
current_superuser = fastapi_users.current_user(active=True, superuser=True)
get_optional_user = fastapi_users.current_user(optional=True, active=True)
