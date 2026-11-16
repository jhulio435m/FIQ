import asyncio
import logging

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import text
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.kvstore import get_store
from app.core.mongo import get_mongo_db, mongo_is_enabled
from app.core.s3 import s3_service

logger = logging.getLogger(__name__)
router = APIRouter()

_CHECK_TIMEOUT_SECONDS = 3.0


@router.get("/health")
async def liveness() -> dict[str, str]:
    """Liveness: el proceso responde. No toca dependencias para no reiniciar
    pods por una caída de la base de datos."""
    return {"status": "ok", "version": settings.VERSION}


async def _check_db(db: AsyncSession) -> None:
    await db.execute(text("SELECT 1"))


async def _check_s3() -> None:
    async with s3_service.session.client(**s3_service.config) as s3:
        await s3.head_bucket(Bucket=s3_service.bucket_name)


async def _check_mongo() -> None:
    mongo_db = get_mongo_db()
    if mongo_db is None:
        raise RuntimeError("MongoDB habilitado pero no inicializado")
    await mongo_db.command("ping")


async def _run(name: str, check) -> tuple[str, str]:
    try:
        await asyncio.wait_for(check, timeout=_CHECK_TIMEOUT_SECONDS)
        return name, "ok"
    except Exception as exc:
        logger.warning("Readiness check '%s' failed: %s", name, exc)
        return name, "error"


@router.get("/health/ready")
async def readiness(response: Response, db: AsyncSession = Depends(get_db)) -> dict[str, object]:
    """Readiness: PostgreSQL y Redis son críticos (sin ellos no hay login).
    S3 y MongoDB se reportan pero solo degradan, no sacan al pod del balanceo."""
    critical = [_run("database", _check_db(db)), _run("cache", get_store().ping())]
    optional = [_run("storage", _check_s3())]
    if mongo_is_enabled():
        optional.append(_run("mongo", _check_mongo()))

    critical_results = dict(await asyncio.gather(*critical))
    optional_results = dict(await asyncio.gather(*optional))

    ready = all(value == "ok" for value in critical_results.values())
    degraded = any(value != "ok" for value in optional_results.values())
    if not ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return {
        "status": "ready" if ready and not degraded else ("degraded" if ready else "unavailable"),
        "checks": {**critical_results, **optional_results},
        "version": settings.VERSION,
    }
