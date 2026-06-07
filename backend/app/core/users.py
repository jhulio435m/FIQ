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
from app.models.user import User

# --- Database Adapter ---

async def get_user_db(session=Depends(get_db)):
    yield SQLModelUserDatabaseAsync(session, User)


# --- User Manager ---

class UserManager(UUIDIDMixin, BaseUserManager[User, uuid.UUID]):
    reset_password_token_secret = settings.SECRET_KEY
    verification_token_secret = settings.SECRET_KEY

    async def on_after_register(self, user: User, request: Optional[Request] = None):
        print(f"User {user.id} has registered.")

    async def on_after_forgot_password(
        self, user: User, token: str, request: Optional[Request] = None
    ):
        print(f"User {user.id} forgot their password. Reset token: {token}")

    async def on_after_request_verify(
        self, user: User, token: str, request: Optional[Request] = None
    ):
        print(f"Verification requested for user {user.id}. Verification token: {token}")


async def get_user_manager(user_db=Depends(get_user_db)):
    yield UserManager(user_db)


# --- Authentication Backends ---

# 1. Bearer Transport (Standard Header-based)
bearer_transport = BearerTransport(tokenUrl="auth/jwt/login")

# 2. Cookie Transport (Secure HttpOnly)
cookie_transport = CookieTransport(cookie_max_age=3600, cookie_secure=False) # Set secure=True in prod

def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(secret=settings.SECRET_KEY, lifetime_seconds=3600)


auth_backend_jwt = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)

auth_backend_cookie = AuthenticationBackend(
    name="cookie",
    transport=cookie_transport,
    get_strategy=get_jwt_strategy,
)

# --- FastAPI Users Instance ---

fastapi_users = FastAPIUsers[User, uuid.UUID](
    get_user_manager,
    [auth_backend_jwt, auth_backend_cookie],
)

current_active_user = fastapi_users.current_user(active=True)
current_superuser = fastapi_users.current_user(active=True, superuser=True)
get_optional_user = fastapi_users.current_user(optional=True, active=True)
