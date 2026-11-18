"""Protección de los seeds de desarrollo (`app.core.seed`, `app.core.seed_mock`).

Ambos vacían todas las tablas y el bucket. Para que no se ejecuten por error:
- en staging/producción están prohibidos siempre;
- con una base vacía corren directamente (primera puesta en marcha);
- si ya hay datos, exigen `--reset` y muestran qué se va a borrar.
"""

import argparse
import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from app.core.config import settings

logger = logging.getLogger(__name__)

# (etiqueta, consulta) — cada una en su propia conexión: si la tabla no existe,
# PostgreSQL aborta la transacción y no debe afectar a las demás.
_COUNTS = (
    ("usuarios", 'SELECT count(*) FROM "user"'),
    ("recursos", "SELECT count(*) FROM recursos"),
)


def parse_reset_flag(command: str, argv: list[str] | None = None) -> bool:
    parser = argparse.ArgumentParser(
        prog=f"python -m {command}",
        description="Seed de DESARROLLO: vacía todas las tablas y el bucket y carga datos de ejemplo.",
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Confirma que se puede borrar la base actual si ya tiene datos.",
    )
    return parser.parse_args(argv).reset


async def existing_data(engine: AsyncEngine) -> dict[str, int]:
    counts: dict[str, int] = {}
    for label, query in _COUNTS:
        try:
            async with engine.connect() as conn:
                counts[label] = int((await conn.execute(text(query))).scalar_one())
        except Exception:
            counts[label] = 0  # la tabla aún no existe: base nueva
    return counts


async def guard_reset(engine: AsyncEngine, command: str, reset: bool) -> None:
    if settings.is_production_like:
        raise SystemExit(
            f"`{command}` vacía la base de datos y el bucket: prohibido en "
            f"ENVIRONMENT={settings.ENVIRONMENT}. Usa `python -m app.core.bootstrap`."
        )

    counts = await existing_data(engine)
    if not any(counts.values()):
        return

    resumen = ", ".join(f"{n} {label}" for label, n in counts.items())
    if not reset:
        raise SystemExit(
            f"La base ya tiene datos ({resumen}).\n"
            f"`{command}` borra TODAS las tablas y los archivos del bucket «{settings.S3_BUCKET_NAME}».\n"
            f"Si es lo que quieres, ejecútalo con --reset:\n\n"
            f"    uv run python -m {command} --reset\n"
        )
    logger.warning("--reset: se borrarán %s y el contenido del bucket %s", resumen, settings.S3_BUCKET_NAME)
