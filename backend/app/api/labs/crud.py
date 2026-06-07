from typing import Optional

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.labs.models import ModuloLaboratorio


async def get_modules(db: AsyncSession, nivel_id: Optional[int] = None):
    query = select(ModuloLaboratorio).where(ModuloLaboratorio.esta_activo.is_(True))
    if nivel_id:
        query = query.where(ModuloLaboratorio.nivel_id == nivel_id)
    result = await db.execute(query.order_by(ModuloLaboratorio.titulo))
    return result.scalars().all()


async def get_module_by_id(db: AsyncSession, module_id: int) -> Optional[ModuloLaboratorio]:
    result = await db.execute(
        select(ModuloLaboratorio).where(
            ModuloLaboratorio.id == module_id,
            ModuloLaboratorio.esta_activo.is_(True),
        )
    )
    return result.scalar_one_or_none()
