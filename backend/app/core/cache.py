import logging
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from app.models.activity import TipoActividad

logger = logging.getLogger(__name__)
_activity_type_cache: dict[str, int] = {}

async def preload_activity_types(db: AsyncSession) -> None:
    """Call this at app startup to populate the cache."""
    result = await db.execute(select(TipoActividad))
    tipos = result.scalars().all()
    for tipo in tipos:
        if tipo.id is not None:
            _activity_type_cache[tipo.nombre] = tipo.id
    logger.info(f"Cached {len(_activity_type_cache)} activity types")

async def get_activity_type_id(db: AsyncSession, nombre: str) -> int | None:
    if nombre in _activity_type_cache:
        return _activity_type_cache[nombre]
    result = await db.execute(select(TipoActividad).where(TipoActividad.nombre == nombre))
    tipo = result.scalar_one_or_none()
    if tipo and tipo.id is not None:
        _activity_type_cache[nombre] = tipo.id
        return tipo.id
    return None
