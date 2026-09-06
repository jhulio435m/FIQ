import pytest
from fastapi import HTTPException
from app.core.config import Settings, settings
from app.core.antivirus import scan_bytes
from app.reports.router import _require_dashboard_api_key


def test_production_rejects_development_defaults():
    config = Settings(_env_file=None, ENVIRONMENT="production")
    with pytest.raises(RuntimeError, match="Configuración no apta"):
        config.validate_runtime()


def test_production_accepts_explicit_secure_configuration():
    config = Settings(_env_file=None, ENVIRONMENT="production", SECRET_KEY="a" * 64, SESSION_COOKIE_SECURE=True,
                      CLAMAV_ENABLED=True, REDIS_URL="redis://redis:6379/0",
                      S3_ACCESS_KEY="fiq-service", S3_SECRET_KEY="b" * 64,
                      FRONTEND_URL="https://fiq.uncp.edu.pe", CORS_ORIGINS=["https://fiq.uncp.edu.pe"])
    config.validate_runtime()
    config.CORS_ORIGINS = ["https://*.uncp.edu.pe"]
    with pytest.raises(RuntimeError, match="CORS"):
        config.validate_runtime()


async def test_antivirus_cannot_be_bypassed_in_production(monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "CLAMAV_ENABLED", False)
    with pytest.raises(HTTPException) as error:
        await scan_bytes(b"unscanned")
    assert error.value.status_code == 503


async def test_reports_fail_closed_without_header(monkeypatch):
    monkeypatch.setattr(settings, "DASHBOARD_API_KEY", "test-report-key")
    with pytest.raises(HTTPException) as error:
        await _require_dashboard_api_key(None)
    assert error.value.status_code == 401
    assert await _require_dashboard_api_key("test-report-key") == "test-report-key"
