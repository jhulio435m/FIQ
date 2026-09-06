import pytest
from httpx import AsyncClient
from sqlmodel.ext.asyncio.session import AsyncSession
from urllib.parse import urlparse, parse_qs

from app.core.config import settings
from app.models.user import User
from tests.conftest import seed_reference_data
from tests.test_mvp import login

SESSION_HEADERS = {"X-Requested-With": "FIQ"}


async def test_public_registration_cannot_choose_role(client: AsyncClient, db: AsyncSession):
    await seed_reference_data(db)
    response = await client.post("/auth/register", json={
        "email": "new@uncp.edu.pe", "password": "password123", "nombre": "Nuevo", "rol_id": 1,
    })
    assert response.status_code == 422
    response = await client.post("/auth/register", json={
        "email": "new@uncp.edu.pe", "password": "password123", "nombre": "Nuevo",
    })
    assert response.status_code == 201
    assert response.json()["rol_id"] == 3
    assert response.json()["is_superuser"] is False


@pytest.mark.parametrize("field,value", [("rol_id", 1), ("esta_activo", True)])
async def test_profile_cannot_change_privileges(client: AsyncClient, db: AsyncSession, field, value):
    ids = await seed_reference_data(db)
    token = await login(client, "estudiante@fiq.uncp.edu.pe")
    headers = {"Authorization": f"Bearer {token}"}
    result = await client.patch("/users/me", headers=headers, json={field: value})
    assert result.status_code == 422
    user = await db.get(User, ids["student_id"])
    assert user.rol_id == 3
    assert (await client.get("/resources/pending", headers=headers)).status_code == 403
    assert (await client.patch("/users/me", headers=headers, json={"nombre": "Nombre nuevo"})).status_code == 200


async def test_rotation_reuse_revokes_access_and_replacement(client: AsyncClient, db: AsyncSession):
    await seed_reference_data(db)
    token = await login(client)
    original = client.cookies.get("fiq_refresh")
    response = await client.post("/auth/refresh", headers=SESSION_HEADERS)
    assert response.status_code == 200
    replacement = client.cookies.get("fiq_refresh")
    reused = await client.post("/auth/refresh", headers={**SESSION_HEADERS, "Cookie": f"fiq_refresh={original}"})
    assert reused.status_code == 401
    assert (await client.get("/users/me", headers={"Authorization": f"Bearer {token}"})).status_code == 401
    assert (await client.post("/auth/refresh", headers={**SESSION_HEADERS, "Cookie": f"fiq_refresh={replacement}"})).status_code == 401


async def test_logout_revokes_tokens_and_clears_cookie(client: AsyncClient, db: AsyncSession):
    await seed_reference_data(db)
    token = await login(client)
    cookie = client.cookies.get("fiq_refresh")
    response = await client.post("/auth/logout", headers=SESSION_HEADERS)
    assert response.status_code == 200
    assert client.cookies.get("fiq_refresh") is None
    assert (await client.get("/users/me", headers={"Authorization": f"Bearer {token}"})).status_code == 401
    assert (await client.post("/auth/refresh", headers={**SESSION_HEADERS, "Cookie": f"fiq_refresh={cookie}"})).status_code == 401


async def test_cookie_endpoints_reject_cross_origin_and_missing_header(client: AsyncClient, db: AsyncSession):
    await seed_reference_data(db)
    await login(client)
    for path in ("/auth/refresh", "/auth/logout"):
        assert (await client.post(path)).status_code == 403
        assert (await client.post(path, headers={**SESSION_HEADERS, "Origin": "https://attacker.invalid"})).status_code == 403
    assert (await client.post("/auth/refresh", headers=SESSION_HEADERS)).status_code == 200


async def test_oauth_binds_state_pkce_and_redirect(client: AsyncClient, monkeypatch):
    monkeypatch.setattr(settings, "MICROSOFT_CLIENT_ID", "test-client")
    redirect = settings.FRONTEND_URL.rstrip("/") + "/login"
    assert (await client.get("/auth/microsoft/authorize-url", params={"redirect_uri": "https://attacker.invalid"})).status_code == 400
    response = await client.get("/auth/microsoft/authorize-url", params={"redirect_uri": redirect})
    assert response.status_code == 200
    params = parse_qs(urlparse(response.json()["url"]).query)
    assert params["state"][0]
    assert params["code_challenge_method"] == ["S256"]
    assert len(params["code_challenge"][0]) == 43
    assert "httponly" in response.headers["set-cookie"].lower()
    assert (await client.post("/auth/microsoft", json={
        "code": "unused", "redirect_uri": redirect, "state": "invalid",
    })).status_code == 400


async def test_secure_refresh_cookie_and_no_body_secret(client: AsyncClient, db: AsyncSession, monkeypatch):
    await seed_reference_data(db)
    monkeypatch.setattr(settings, "SESSION_COOKIE_SECURE", True)
    response = await client.post("/auth/login", json={"email": "admin@fiq.uncp.edu.pe", "password": "password123"})
    cookie = response.headers["set-cookie"].lower()
    assert "secure" in cookie and "httponly" in cookie and "samesite=strict" in cookie
    assert "refresh_token" not in response.json()
    assert response.headers["cache-control"] == "no-store"


async def test_password_change_revokes_sessions_but_same_email_edit_does_not(client: AsyncClient, db: AsyncSession):
    await seed_reference_data(db)
    token = await login(client)
    headers = {"Authorization": f"Bearer {token}"}
    assert (await client.patch("/users/me", headers=headers, json={"nombre": "Perfil", "email": "admin@fiq.uncp.edu.pe"})).status_code == 200
    assert (await client.get("/users/me", headers=headers)).status_code == 200
    assert (await client.patch("/users/me", headers=headers, json={"password": "a-new-password-123"})).status_code == 200
    assert (await client.get("/users/me", headers=headers)).status_code == 401
    assert (await client.post("/auth/refresh", headers=SESSION_HEADERS)).status_code == 401


async def test_generated_jwt_logout_also_revokes(client: AsyncClient, db: AsyncSession):
    await seed_reference_data(db)
    result = await client.post("/auth/jwt/login", data={"username": "admin@fiq.uncp.edu.pe", "password": "password123"})
    assert result.status_code == 200
    headers = {"Authorization": f"Bearer {result.json()['access_token']}"}
    assert (await client.post("/auth/jwt/logout", headers=headers)).status_code == 204
    assert (await client.get("/users/me", headers=headers)).status_code == 401
