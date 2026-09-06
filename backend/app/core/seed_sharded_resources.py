import argparse
import asyncio
import uuid
from datetime import datetime, timezone

from sqlalchemy import text
from sqlmodel import SQLModel, select

from app.core.seed_base import (
    seed_actividades,
    seed_estados_recurso,
    seed_roles,
    seed_tipos_recurso,
)
from app.core.sharding import (
    resource_session,
    resource_shard_count,
    resource_shard_index,
    resource_sharding_enabled,
    resource_write_engine,
)
from app.models.resource import Curso, EstadoRecurso, Recurso
from app.models.user import User


COURSES = [
    (1, "Quimica General", "QUI101", 1),
    (2, "Operaciones Unitarias I", "QUI301", 5),
    (3, "Termodinamica", "QUI202", 4),
    (4, "Reactores Quimicos", "QUI401", 7),
    (5, "Transferencia de Calor", "QUI302", 6),
    (6, "Fenomenos de Transporte", "QUI303", 5),
    (7, "Control de Procesos", "QUI402", 8),
    (8, "Ingenieria Ambiental", "QUI405", 9),
]


async def _table_has_rows(db, table_name: str) -> bool:
    result = await db.execute(text(f"select exists(select 1 from {table_name} limit 1)"))
    return bool(result.scalar_one())


async def _ensure_reference_data(shard_index: int) -> uuid.UUID:
    async with resource_write_engine(shard_index).begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    async with resource_session(shard_index, read=False) as db:
        if not await _table_has_rows(db, "roles"):
            await seed_roles(db)
        if not await _table_has_rows(db, "tipos_recurso"):
            await seed_tipos_recurso(db)
        if not await _table_has_rows(db, "estados_recurso"):
            await seed_estados_recurso(db)
        if not await _table_has_rows(db, "tipos_actividad"):
            await seed_actividades(db)

        for course_id, nombre, codigo, ciclo in COURSES:
            if not await db.get(Curso, course_id):
                db.add(Curso(id=course_id, nombre=nombre, codigo=codigo, ciclo=ciclo, esta_activo=True))

        result = await db.execute(select(User).where(User.email == "seed-load@fiq.uncp.edu.pe"))
        user = result.scalar_one_or_none()
        if not user:
            user = User(
                id=uuid.uuid4(),
                email="seed-load@fiq.uncp.edu.pe",
                hashed_password="seed-load-disabled",
                nombre="Carga Masiva FIQ",
                rol_id=1,
                is_active=False,
                is_superuser=False,
                is_verified=True,
            )
            db.add(user)

        await db.commit()
        return user.id


async def _seed_shard(shard_index: int, count: int, batch_size: int, user_id: uuid.UUID) -> int:
    inserted = 0
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    async with resource_session(shard_index, read=False) as db:
        approved = await db.execute(select(EstadoRecurso).where(EstadoRecurso.nombre == "Aprobado"))
        approved_id = approved.scalar_one().id
        if approved_id is None:
            raise RuntimeError("Estado Aprobado no tiene id")

        batch: list[Recurso] = []
        i = 0
        while inserted < count:
            course_id = COURSES[(shard_index + i) % len(COURSES)][0]
            i += 1
            if resource_shard_index(course_id) != shard_index:
                continue
            resource_number = shard_index * count + inserted + 1
            batch.append(
                Recurso(
                    titulo=f"[seed-load] Recurso FIQ {resource_number:06d}",
                    resumen=(
                        "Registro sintetico para prueba de sharding y carga. "
                        f"shard={shard_index}; lote=seed-load."
                    ),
                    url_archivo=f"https://fiq.example.invalid/seed-load/{shard_index}/{resource_number}.pdf",
                    archivo_size=128000 + (resource_number % 8192),
                    archivo_mime="application/pdf",
                    tipo_recurso_id=(resource_number % 4) + 1,
                    subido_por=user_id,
                    estado_id=approved_id,
                    curso_id=course_id,
                    autores="Carga Masiva FIQ",
                    editorial="FIQ UNCP",
                    doi=f"10.0000/fiq.seed.{shard_index}.{resource_number}",
                    anio=2026,
                    visualizaciones=resource_number % 500,
                    descargas=resource_number % 120,
                    created_at=now,
                    updated_at=now,
                )
            )
            inserted += 1
            if len(batch) >= batch_size:
                db.add_all(batch)
                await db.commit()
                batch.clear()

        if batch:
            db.add_all(batch)
            await db.commit()

    return inserted


async def seed(count: int, batch_size: int) -> None:
    if not resource_sharding_enabled():
        raise RuntimeError("RESOURCE_SHARD_DATABASE_URLS no esta configurado")

    user_ids: list[uuid.UUID] = []
    for shard_index in range(resource_shard_count()):
        user_ids.append(await _ensure_reference_data(shard_index))

    per_shard = max(1, count // resource_shard_count())
    totals = await asyncio.gather(
        *[
            _seed_shard(shard_index, per_shard, batch_size, user_ids[shard_index])
            for shard_index in range(resource_shard_count())
        ]
    )
    print({"requested": count, "inserted": sum(totals), "per_shard": totals})


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=50000)
    parser.add_argument("--batch-size", type=int, default=1000)
    args = parser.parse_args()
    asyncio.run(seed(args.count, args.batch_size))


if __name__ == "__main__":
    main()
