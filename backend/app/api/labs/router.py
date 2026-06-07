from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import Optional

from app.core.database import get_db
from app.core.users import get_optional_user
from app.api.labs import crud
from app.api.labs.schemas import ModuloLaboratorioResponse
from app.logs.crud import log_activity
from app.models.activity import TipoActividad
from app.models.user import User

router = APIRouter()


@router.get("", response_model=list[ModuloLaboratorioResponse])
@router.get("/", response_model=list[ModuloLaboratorioResponse])
async def list_modules(
    nivel_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    return await crud.get_modules(db, nivel_id=nivel_id)


@router.get("/{module_id}", response_model=ModuloLaboratorioResponse)
async def get_module(
    request: Request,
    module_id: int,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    module = await crud.get_module_by_id(db, module_id)
    if not module:
        raise HTTPException(status_code=404, detail="Módulo de laboratorio no encontrado")
    if user:
        tipo_res = await db.execute(select(TipoActividad).where(TipoActividad.nombre == "lab_access"))
        tipo = tipo_res.scalar_one_or_none()
        if tipo:
            await log_activity(
                db,
                usuario_id=user.id,
                tipo_actividad_id=tipo.id,
                ip_origen=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent"),
                detalle_accion={"lab_id": module.id, "titulo": module.titulo},
            )
    return module
