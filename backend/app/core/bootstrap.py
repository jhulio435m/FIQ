"""Bootstrap idempotente para staging/producción.

A diferencia de `app.core.seed` (que TRUNCA tablas y vacía el bucket), este
comando solo inserta los catálogos de referencia que falten, crea el primer
administrador si no existe ninguno y asegura el bucket S3 (con CORS para el
frontend). Es seguro ejecutarlo en cada despliegue.

Uso:
    BOOTSTRAP_ADMIN_EMAIL=... BOOTSTRAP_ADMIN_PASSWORD=... python -m app.core.bootstrap
"""

import asyncio
import logging
import os
import sys
import uuid

from sqlmodel import SQLModel, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.core.database import async_session_maker
from app.core.s3 import s3_service
from app.core.security import hash_password
from app.models.user import User

from app.core.seed_base import (
    seed_actividades,
    seed_estados_recurso,
    seed_labs,
    seed_niveles,
    seed_roles,
    seed_tipos_recurso,
)

logger = logging.getLogger("bootstrap")

_MIN_ADMIN_PASSWORD_LENGTH = 12


class _Collector:
    """Captura las filas que los seeders de `seed_base` agregarían, sin escribirlas."""

    def __init__(self) -> None:
        self.rows: list[SQLModel] = []

    def add_all(self, rows: list[SQLModel]) -> None:
        self.rows.extend(rows)

    def add(self, row: SQLModel) -> None:
        self.rows.append(row)

    async def flush(self) -> None:
        return None


async def _insert_missing(db: AsyncSession, rows: list[SQLModel]) -> int:
    inserted = 0
    for row in rows:
        if await db.get(type(row), row.id) is None:
            db.add(row)
            inserted += 1
    await db.flush()
    return inserted


async def _ensure_reference_data(db: AsyncSession) -> None:
    # Orden importa por FKs: niveles antes que laboratorios.
    for seeder in (seed_roles, seed_tipos_recurso, seed_estados_recurso, seed_actividades, seed_niveles, seed_labs):
        collector = _Collector()
        await seeder(collector)  # type: ignore[arg-type]
        inserted = await _insert_missing(db, collector.rows)
        logger.info("%s: %d filas nuevas", seeder.__name__, inserted)


async def _ensure_admin(db: AsyncSession) -> None:
    existing = await db.execute(select(User).where(User.rol_id == 1).limit(1))
    if existing.scalars().first() is not None:
        logger.info("Ya existe un administrador; no se crea otro.")
        return

    email = os.environ.get("BOOTSTRAP_ADMIN_EMAIL", "").strip().lower()
    password = os.environ.get("BOOTSTRAP_ADMIN_PASSWORD", "")
    if not email or len(password) < _MIN_ADMIN_PASSWORD_LENGTH:
        raise SystemExit(
            "No hay administrador. Define BOOTSTRAP_ADMIN_EMAIL y BOOTSTRAP_ADMIN_PASSWORD "
            f"(mínimo {_MIN_ADMIN_PASSWORD_LENGTH} caracteres) para crearlo."
        )

    db.add(
        User(
            id=uuid.uuid4(),
            email=email,
            hashed_password=hash_password(password),
            nombre="Administrador FIQ",
            rol_id=1,
            is_active=True,
            is_superuser=True,
            is_verified=True,
        )
    )
    logger.info("Administrador inicial creado: %s", email)


async def bootstrap(*, configure_storage: bool = True) -> None:
    async with async_session_maker() as db:
        await _ensure_reference_data(db)
        await _ensure_admin(db)
        await db.commit()
    if configure_storage:
        await s3_service.ensure_bucket(settings.CORS_ORIGINS)
    logger.info("Bootstrap completado.")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, stream=sys.stdout, format="%(levelname)s %(name)s: %(message)s")
    asyncio.run(bootstrap())
