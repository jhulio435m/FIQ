from pydantic_settings import BaseSettings
from pydantic import ConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "FIQ Plataforma Digital"
    VERSION: str = "1.0.0"
    DEBUG: bool = False

    DATABASE_URL: str = "postgresql://fiq:fiq123@localhost:5433/fiq_db"
    # REDIS_URL: str = "redis://localhost:6379/0" # TODO: uncomment when implementing rate limiting
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

    S3_ENDPOINT: str = "http://localhost:9000"
    S3_PUBLIC_URL: str = ""
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
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

    model_config = ConfigDict(env_file=".env", extra="ignore")


settings = Settings()
