from fastapi import APIRouter, Depends
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_role
from app.models.resource import Recurso
from app.models.user import User
from app.models.activity import RegistroActividad, TipoActividad

router = APIRouter()


@router.get("/most-viewed")
async def most_viewed(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("Admin")),
):
    result = await db.execute(
        select(Recurso)
        .order_by(Recurso.visualizaciones.desc())
        .limit(10)
    )
    resources = result.scalars().all()
    return [
        {
            "id": r.id,
            "titulo": r.titulo,
            "visualizaciones": r.visualizaciones,
            "descargas": r.descargas,
        }
        for r in resources
    ]


@router.get("/labs-usage")
async def labs_usage(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("Admin")),
):
    # Fix the activity type name to match actual production logs
    lab_access_res = await db.execute(
        select(TipoActividad).where(TipoActividad.nombre == "lab_access")
    )
    lab_access = lab_access_res.scalar_one_or_none()
    
    if not lab_access:
        return {"total": 0}
        
    count_res = await db.execute(
        select(func.count(RegistroActividad.id))
        .where(RegistroActividad.tipo_actividad_id == lab_access.id)
    )
    total = count_res.scalar_one()
    return {"total_accesos_laboratorios": total}
