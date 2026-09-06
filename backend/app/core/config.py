from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import Literal


class Settings(BaseSettings):
    PROJECT_NAME: str = "FIQ Plataforma Digital"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: Literal["development", "test", "staging", "production"] = "development"
    SESSION_COOKIE_SECURE: bool = True

    DATABASE_URL: str = "postgresql://fiq:fiq123@localhost:5433/fiq_db"
    DATABASE_READ_URL: str = ""
    RESOURCE_SHARD_DATABASE_URLS: str = ""
    RESOURCE_SHARD_READ_DATABASE_URLS: str = ""
    RESOURCE_SHARD_ID_STRIDE: int = 1000000000
    REDIS_URL: str = ""
    TRUST_PROXY_HEADERS: bool = False
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
    AUTH_RATE_LIMIT_REQUESTS: int = 10
    SESSION_RATE_LIMIT_REQUESTS: int = 120
    EXTERNAL_SEARCH_RATE_LIMIT_REQUESTS: int = 30
    RATE_LIMIT_WINDOW_SECONDS: int = 60

    S3_ENDPOINT: str = "http://localhost:9000"
    S3_PUBLIC_URL: str = ""
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_BUCKET_NAME: str = "fiq-recursos"
    S3_QUARANTINE_BUCKET_NAME: str = "fiq-cuarentena"

    CLAMAV_ENABLED: bool = False
    CLAMAV_HOST: str = "clamav"
    CLAMAV_PORT: int = 3310
    CLAMAV_TIMEOUT_SECONDS: float = 30.0

    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
    MAX_UPLOAD_SIZE: int = 20 * 1024 * 1024

    MICROSOFT_CLIENT_ID: str = ""
    MICROSOFT_CLIENT_SECRET: str = ""
    MICROSOFT_TENANT_ID: str = "57c17caf-c500-4ffc-9976-f85fc6c66d47"

    FRONTEND_URL: str = "http://localhost:5173"
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    SMTP_STARTTLS: bool = True

    DASHBOARD_API_KEY: str = ""
    EXTERNAL_API_EMAIL: str = ""
    EXTERNAL_API_USER_AGENT: str = "FIQ Plataforma Digital/1.0 (biblioteca virtual academica)"
    EXTERNAL_API_TIMEOUT_SECONDS: float = 8.0
    EXTERNAL_CACHE_TTL_SECONDS: int = 86400

    model_config = ConfigDict(env_file=".env", extra="ignore")

    def validate_runtime(self) -> None:
        if self.ENVIRONMENT not in {"staging", "production"}:
            return
        errors = []
        if self.DEBUG:
            errors.append("DEBUG debe estar desactivado")
        if len(self.SECRET_KEY) < 32 or any(marker in self.SECRET_KEY.lower() for marker in ("dev-secret", "replace-with", "change-in")):
            errors.append("SECRET_KEY requiere un secreto independiente")
        if not self.SESSION_COOKIE_SECURE:
            errors.append("SESSION_COOKIE_SECURE debe estar activado")
        if not self.CLAMAV_ENABLED or not self.REDIS_URL:
            errors.append("ClamAV y Redis son obligatorios")
        if self.S3_ACCESS_KEY == "minioadmin" or self.S3_SECRET_KEY == "minioadmin":
            errors.append("S3 requiere credenciales independientes")
        if not self.FRONTEND_URL.startswith("https://") or "example." in self.FRONTEND_URL:
            errors.append("FRONTEND_URL requiere el dominio HTTPS real")
        if not self.CORS_ORIGINS or any("*" in origin or not origin.startswith("https://") for origin in self.CORS_ORIGINS):
            errors.append("CORS requiere orígenes HTTPS explícitos")
        if self.FRONTEND_URL.rstrip("/") not in self.CORS_ORIGINS:
            errors.append("FRONTEND_URL debe figurar en CORS_ORIGINS")
        if errors:
            raise RuntimeError("Configuración no apta para despliegue: " + "; ".join(errors))


settings = Settings()
