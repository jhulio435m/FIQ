from typing import Literal

from pydantic import ConfigDict, model_validator
from pydantic_settings import BaseSettings

# Valores de desarrollo conocidos públicamente (están en el repo). Nunca deben
# llegar a producción: el validador de abajo aborta el arranque si aparecen.
_INSECURE_SECRET_KEYS = {
    "dev-secret-key-change-in-production-32-bytes",
    "dev-secret-key-change-in-production",
    "change-me-in-production",
    "replace-with-32-plus-byte-secret",
}
_INSECURE_DB_PASSWORDS = ("fiq123", "USER:PASSWORD")
_INSECURE_S3_CREDENTIALS = {"rustfsadmin", "minioadmin", "replace-with-s3-access-key", "replace-with-s3-secret-key"}


class Settings(BaseSettings):
    PROJECT_NAME: str = "FIQ Plataforma Digital"
    VERSION: str = "1.0.0"
    ENVIRONMENT: Literal["development", "test", "staging", "production"] = "development"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    LOG_JSON: bool = False

    DATABASE_URL: str = "postgresql://fiq:fiq123@localhost:5433/fiq_db"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 10
    # Vacío = almacén en memoria (solo válido con una única instancia en desarrollo/tests).
    REDIS_URL: str = ""
    MONGO_ENABLED: bool = False
    MONGO_URL: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "fiq_events"
    MONGO_ACTIVITY_COLLECTION: str = "activity_events"
    MONGO_EXTERNAL_CACHE_COLLECTION: str = "external_catalog_cache"
    MONGO_SERVER_SELECTION_TIMEOUT_MS: int = 3000
    SECRET_KEY: str = "dev-secret-key-change-in-production-32-bytes"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    REFRESH_COOKIE_NAME: str = "fiq_refresh"
    REFRESH_COOKIE_PATH: str = "/"

    # Rate limiting de endpoints de autenticación (por IP + identificador).
    AUTH_RATE_LIMIT_ATTEMPTS: int = 10
    AUTH_RATE_LIMIT_WINDOW_SECONDS: int = 300

    # El registro público abierto permite crear cuentas sin control; en la UI
    # los usuarios entran por Microsoft SSO (@uncp.edu.pe) o los crea un Admin.
    ALLOW_PUBLIC_REGISTRATION: bool = False

    S3_ENDPOINT: str = "http://localhost:9000"
    S3_PUBLIC_URL: str = ""
    S3_ACCESS_KEY: str = "rustfsadmin"
    S3_SECRET_KEY: str = "rustfsadmin"
    S3_BUCKET_NAME: str = "fiq-recursos"

    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
    MAX_UPLOAD_SIZE: int = 20 * 1024 * 1024

    MICROSOFT_CLIENT_ID: str = ""
    MICROSOFT_CLIENT_SECRET: str = ""
    MICROSOFT_TENANT_ID: str = "57c17caf-c500-4ffc-9976-f85fc6c66d47"

    DASHBOARD_API_KEY: str = ""
    EXTERNAL_API_EMAIL: str = ""
    EXTERNAL_API_USER_AGENT: str = "FIQ Plataforma Digital/1.0 (biblioteca virtual academica)"
    EXTERNAL_API_TIMEOUT_SECONDS: float = 8.0
    EXTERNAL_CACHE_TTL_SECONDS: int = 86400

    SENTRY_DSN: str = ""
    SENTRY_TRACES_SAMPLE_RATE: float = 0.05
    METRICS_ENABLED: bool = True

    model_config = ConfigDict(env_file=".env", extra="ignore")

    @property
    def is_production_like(self) -> bool:
        return self.ENVIRONMENT in ("staging", "production")

    @property
    def docs_enabled(self) -> bool:
        return not self.is_production_like or self.DEBUG

    @model_validator(mode="after")
    def _validate_production_settings(self) -> "Settings":
        if not self.is_production_like:
            return self

        errors: list[str] = []
        if self.DEBUG:
            errors.append("DEBUG debe ser false")
        if self.SECRET_KEY in _INSECURE_SECRET_KEYS or len(self.SECRET_KEY) < 32:
            errors.append("SECRET_KEY debe ser un valor aleatorio de al menos 32 caracteres (openssl rand -hex 32)")
        if any(marker in self.DATABASE_URL for marker in _INSECURE_DB_PASSWORDS):
            errors.append("DATABASE_URL usa credenciales de desarrollo")
        if self.S3_ACCESS_KEY in _INSECURE_S3_CREDENTIALS or self.S3_SECRET_KEY in _INSECURE_S3_CREDENTIALS:
            errors.append("S3_ACCESS_KEY/S3_SECRET_KEY usan credenciales por defecto")
        if not self.REDIS_URL:
            errors.append("REDIS_URL es obligatorio (refresh tokens y rate limiting compartidos entre réplicas)")
        if not self.CORS_ORIGINS or any(origin.strip() == "*" for origin in self.CORS_ORIGINS):
            errors.append("CORS_ORIGINS debe listar dominios explícitos (no '*')")
        if any(origin.startswith("http://") and "localhost" not in origin for origin in self.CORS_ORIGINS):
            errors.append("CORS_ORIGINS debe usar https en producción")

        if errors:
            raise ValueError(
                f"Configuración insegura para ENVIRONMENT={self.ENVIRONMENT}: " + "; ".join(errors)
            )
        return self


settings = Settings()
