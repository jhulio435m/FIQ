import pytest
from httpx import AsyncClient
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import Settings, settings
from tests.conftest import seed_reference_data

ADMIN = {"email": "admin@fiq.uncp.edu.pe", "password": "password123"}


async def test_login_sets_httponly_refresh_cookie(client: AsyncClient, db: AsyncSession) -> None:
    await seed_reference_data(db)
    response = await client.post("/auth/login", json=ADMIN)
    assert response.status_code == 200
    assert "refresh_token" not in response.json()
    set_cookie = response.headers["set-cookie"]
    assert f"{settings.REFRESH_COOKIE_NAME}=" in set_cookie
    assert "HttpOnly" in set_cookie
    assert "samesite=strict" in set_cookie.lower()


async def test_refresh_rotates_and_rejects_reuse(client: AsyncClient, db: AsyncSession) -> None:
    await seed_reference_data(db)
    await client.post("/auth/login", json=ADMIN)
    old_cookie = client.cookies.get(settings.REFRESH_COOKIE_NAME)
    assert old_cookie

    refreshed = await client.post("/auth/refresh")
    assert refreshed.status_code == 200
    assert refreshed.json()["access_token"]
    new_cookie = client.cookies.get(settings.REFRESH_COOKIE_NAME)
    assert new_cookie and new_cookie != old_cookie

    client.cookies.set(settings.REFRESH_COOKIE_NAME, old_cookie)
    reused = await client.post("/auth/refresh")
    assert reused.status_code == 401


async def test_refresh_without_cookie_is_401(client: AsyncClient) -> None:
    response = await client.post("/auth/refresh")
    assert response.status_code == 401


async def test_logout_revokes_refresh_token(client: AsyncClient, db: AsyncSession) -> None:
    await seed_reference_data(db)
    await client.post("/auth/login", json=ADMIN)
    token = client.cookies.get(settings.REFRESH_COOKIE_NAME)
    assert (await client.post("/auth/logout")).status_code == 200

    client.cookies.set(settings.REFRESH_COOKIE_NAME, token)
    assert (await client.post("/auth/refresh")).status_code == 401


async def test_login_is_rate_limited(client: AsyncClient, db: AsyncSession) -> None:
    await seed_reference_data(db)
    bad = {"email": ADMIN["email"], "password": "wrong"}
    for _ in range(settings.AUTH_RATE_LIMIT_ATTEMPTS):
        assert (await client.post("/auth/login", json=bad)).status_code == 401
    blocked = await client.post("/auth/login", json=bad)
    assert blocked.status_code == 429
    assert blocked.headers["retry-after"]


async def test_successful_login_resets_rate_limit(client: AsyncClient, db: AsyncSession) -> None:
    await seed_reference_data(db)
    for _ in range(settings.AUTH_RATE_LIMIT_ATTEMPTS + 5):
        assert (await client.post("/auth/login", json=ADMIN)).status_code == 200


async def test_public_registration_disabled_by_default(client: AsyncClient) -> None:
    response = await client.post(
        "/auth/register", json={"email": "x@example.com", "password": "secret123"}
    )
    assert response.status_code in (404, 405)


async def test_fastapi_users_login_routes_not_exposed(client: AsyncClient) -> None:
    response = await client.post("/auth/jwt/login", data={"username": "a", "password": "b"})
    assert response.status_code == 404


async def test_readiness_reports_checks(client: AsyncClient) -> None:
    response = await client.get("/health/ready")
    body = response.json()
    assert body["checks"]["database"] == "ok"
    assert body["checks"]["cache"] == "ok"
    # Sin RustFS en tests el storage degrada, pero el pod sigue listo.
    assert response.status_code == 200


PROD_OK = {
    "ENVIRONMENT": "production",
    "SECRET_KEY": "a" * 64,
    "DATABASE_URL": "postgresql://fiq_app:Str0ngPass@db:5432/fiq",
    "REDIS_URL": "redis://redis:6379/0",
    "S3_ACCESS_KEY": "fiq-app",
    "S3_SECRET_KEY": "b" * 32,
    "CORS_ORIGINS": ["https://fiq.uncp.edu.pe"],
}


def test_production_settings_accept_secure_values() -> None:
    Settings(_env_file=None, **PROD_OK)


@pytest.mark.parametrize(
    "override",
    [
        {"SECRET_KEY": "dev-secret-key-change-in-production-32-bytes"},
        {"SECRET_KEY": "short"},
        {"DATABASE_URL": "postgresql://fiq:fiq123@db:5432/fiq"},
        {"S3_SECRET_KEY": "rustfsadmin"},
        {"S3_ACCESS_KEY": "minioadmin"},
        {"REDIS_URL": ""},
        {"CORS_ORIGINS": ["*"]},
        {"CORS_ORIGINS": ["http://fiq.uncp.edu.pe"]},
        {"DEBUG": True},
    ],
)
def test_production_settings_reject_insecure_values(override: dict) -> None:
    with pytest.raises(ValueError, match="Configuración insegura"):
        Settings(_env_file=None, **{**PROD_OK, **override})


async def test_bootstrap_is_idempotent_and_creates_admin(db: AsyncSession, monkeypatch) -> None:
    from sqlmodel import func, select

    from app.core import bootstrap as bootstrap_module
    from app.models.user import Rol, User

    class _SessionCtx:
        async def __aenter__(self):
            return db

        async def __aexit__(self, *exc):
            return False

    monkeypatch.setattr(bootstrap_module, "async_session_maker", lambda: _SessionCtx())
    monkeypatch.setenv("BOOTSTRAP_ADMIN_EMAIL", "Admin@UNCP.edu.pe")
    monkeypatch.setenv("BOOTSTRAP_ADMIN_PASSWORD", "una-clave-larga-segura")

    await bootstrap_module.bootstrap(configure_storage=False)
    await bootstrap_module.bootstrap(configure_storage=False)

    roles = (await db.execute(select(func.count(Rol.id)))).scalar_one()
    admins = (await db.execute(select(func.count(User.id)).where(User.rol_id == 1))).scalar_one()
    assert roles == 3
    assert admins == 1


async def test_bootstrap_requires_strong_admin_password(db: AsyncSession, monkeypatch) -> None:
    from app.core import bootstrap as bootstrap_module

    class _SessionCtx:
        async def __aenter__(self):
            return db

        async def __aexit__(self, *exc):
            return False

    monkeypatch.setattr(bootstrap_module, "async_session_maker", lambda: _SessionCtx())
    monkeypatch.setenv("BOOTSTRAP_ADMIN_EMAIL", "admin@uncp.edu.pe")
    monkeypatch.setenv("BOOTSTRAP_ADMIN_PASSWORD", "admin123")
    with pytest.raises(SystemExit):
        await bootstrap_module.bootstrap(configure_storage=False)
