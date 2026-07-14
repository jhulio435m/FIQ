from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.users import auth_backend_jwt, auth_backend_cookie, fastapi_users
from app.schemas.user import UserRead, UserCreate, UserUpdate
from app.api.auth.router import router as auth_router
from app.api.resources.router import router as resources_router
from app.api.users.router import router as admin_users_router
from app.api.labs.router import router as labs_router
from app.api.external_catalog.router import router as external_catalog_router
from app.logs.router import router as logs_router
from app.reports.router import router as reports_router

app = FastAPI(
    title=f"{settings.PROJECT_NAME} (PRO)",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Authentication Routers ---
app.include_router(auth_router, prefix="/auth", tags=["Autenticación"])

# JWT Auth
app.include_router(
    fastapi_users.get_auth_router(auth_backend_jwt),
    prefix="/auth/jwt",
    tags=["Autenticación (JWT)"],
)

# Cookie Auth
app.include_router(
    fastapi_users.get_auth_router(auth_backend_cookie),
    prefix="/auth/cookie",
    tags=["Autenticación (Cookie)"],
)

# Registration
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
app.include_router(resources_router, prefix="/resources", tags=["Recursos"])
app.include_router(external_catalog_router, prefix="/external", tags=["Catálogo externo"])
app.include_router(labs_router, prefix="/labs", tags=["Laboratorios"])
app.include_router(logs_router, prefix="/activity", tags=["Auditoría"])
app.include_router(reports_router, prefix="/reports", tags=["Reportes"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": settings.VERSION}
