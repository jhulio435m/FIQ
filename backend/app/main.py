from contextlib import asynccontextmanager
from time import perf_counter

from fastapi import Depends, FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.sessions import check_session_request
from fastapi import HTTPException

from app.core.config import settings
from app.core.mongo import close_mongo, init_mongo
from app.core.users import auth_backend_jwt, auth_backend_cookie, fastapi_users
from app.schemas.user import UserRead, UserCreate, UserUpdate
from app.api.auth.router import limit_generated_login, router as auth_router
from app.api.resources.router import router as resources_router
from app.api.users.router import router as admin_users_router
from app.api.labs.router import router as labs_router
from app.api.external_catalog.router import router as external_catalog_router
from app.api.personal_library.router import router as personal_library_router
from app.api.bibliography.router import router as bibliography_router
from app.logs.router import router as logs_router
from app.reports.router import router as reports_router
from app.core.metrics import http_metrics


from app.core.database import async_session_maker
from app.core.cache import preload_activity_types

@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.validate_runtime()
    await init_mongo()
    async with async_session_maker() as session:
        await preload_activity_types(session)
    try:
        yield
    finally:
        await close_mongo()


app = FastAPI(
    title=f"{settings.PROJECT_NAME} (PRO)",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def collect_http_metrics(request: Request, call_next):
    if (request.method not in {"GET", "HEAD", "OPTIONS"}
            and request.cookies.get("fastapiusersauth")
            and not request.headers.get("authorization")):
        try:
            check_session_request(request)
        except HTTPException as exc:
            return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)
    started = perf_counter()
    response = await call_next(request)
    route = request.scope.get("route")
    path = getattr(route, "path", "unmatched")
    await http_metrics.observe(
        request.method,
        path,
        response.status_code,
        perf_counter() - started,
    )
    return response

# --- Authentication Routers ---
app.include_router(auth_router, prefix="/auth", tags=["Autenticación"])

# JWT Auth
app.include_router(
    fastapi_users.get_auth_router(auth_backend_jwt),
    prefix="/auth/jwt",
    tags=["Autenticación (JWT)"],
    dependencies=[Depends(limit_generated_login)],
)

# Cookie Auth
app.include_router(
    fastapi_users.get_auth_router(auth_backend_cookie),
    prefix="/auth/cookie",
    tags=["Autenticación (Cookie)"],
    dependencies=[Depends(limit_generated_login)],
)

# Registration
app.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/auth",
    tags=["Autenticación"],
    dependencies=[Depends(limit_generated_login)],
)

app.include_router(
    fastapi_users.get_reset_password_router(),
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
app.include_router(resources_router, tags=["Recursos"])
app.include_router(external_catalog_router, prefix="/external", tags=["Catálogo externo"])
app.include_router(personal_library_router, prefix="/library", tags=["Biblioteca personal"])
app.include_router(bibliography_router, prefix="/works", tags=["Obras bibliográficas"])
app.include_router(labs_router, prefix="/labs", tags=["Laboratorios"])
app.include_router(logs_router, prefix="/activity", tags=["Auditoría"])
app.include_router(reports_router, prefix="/reports", tags=["Reportes"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": settings.VERSION}


@app.get("/metrics", include_in_schema=False)
async def metrics():
    return Response(await http_metrics.render(), media_type="text/plain; version=0.0.4")
