from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.kvstore import close_store
from app.core.mongo import close_mongo, init_mongo
from app.core.observability import configure_logging, configure_sentry
from app.core.users import fastapi_users
from app.schemas.user import UserRead, UserCreate, UserUpdate
from app.api.auth.router import router as auth_router
from app.api.resources.router import router as resources_router
from app.api.resources.moderation import router as moderation_router
from app.api.users.router import router as admin_users_router
from app.api.labs.router import router as labs_router
from app.api.external_catalog.router import router as external_catalog_router
from app.logs.router import router as logs_router
from app.reports.router import router as reports_router
from app.api.health import router as health_router


from app.core.database import async_session_maker
from app.core.cache import preload_activity_types

configure_logging()
configure_sentry()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_mongo()
    async with async_session_maker() as session:
        await preload_activity_types(session)
    try:
        yield
    finally:
        await close_mongo()
        await close_store()


app = FastAPI(
    title=f"{settings.PROJECT_NAME} (PRO)",
    version=settings.VERSION,
    # En staging/producción la documentación interactiva y el esquema no se publican.
    docs_url="/docs" if settings.docs_enabled else None,
    redoc_url="/redoc" if settings.docs_enabled else None,
    openapi_url="/openapi.json" if settings.docs_enabled else None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
    expose_headers=["X-Total-Count"],
)

if settings.METRICS_ENABLED:
    from prometheus_fastapi_instrumentator import Instrumentator

    # /metrics no pasa por nginx (bloqueado allí); Prometheus lo raspa directo al pod.
    Instrumentator(excluded_handlers=["/health", "/health/ready", "/metrics"]).instrument(app).expose(
        app, include_in_schema=False
    )

# --- Authentication Routers ---
app.include_router(auth_router, prefix="/auth", tags=["Autenticación"])

# Los routers /auth/jwt/* y /auth/cookie/* de FastAPI Users no se exponen: duplicaban
# el login sin rate limiting ni refresh token. /auth/login es la única entrada.

# Registration: deshabilitado por defecto; las cuentas se crean por SSO institucional o por un Admin.
if settings.ALLOW_PUBLIC_REGISTRATION:
    app.include_router(
        fastapi_users.get_register_router(UserRead, UserCreate),
        prefix="/auth",
        tags=["Autenticación"],
    )

# User Management (Profile & Admin)
app.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
    tags=["Usuarios"],
)

app.include_router(
    admin_users_router,
    prefix="/users",
    tags=["Usuarios (Admin)"],
)

# --- Resource Domain ---
app.include_router(moderation_router, prefix="/resources", tags=["Moderación"])
app.include_router(resources_router, prefix="/resources", tags=["Recursos"])
app.include_router(external_catalog_router, prefix="/external", tags=["Catálogo externo"])
app.include_router(labs_router, prefix="/labs", tags=["Laboratorios"])
app.include_router(logs_router, prefix="/activity", tags=["Auditoría"])
app.include_router(reports_router, prefix="/reports", tags=["Reportes"])
app.include_router(health_router, tags=["Salud"])
