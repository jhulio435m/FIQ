from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List
import uuid
from pydantic import BaseModel

from app.core.database import get_db
from app.core.dependencies import require_role
from app.models.user import User
from app.schemas.user import UserRead, UserUpdate

router = APIRouter()


class RoleUpdate(BaseModel):
    rol_id: int


class StatusUpdate(BaseModel):
    esta_activo: bool


@router.get("", response_model=List[UserRead])
@router.get("/", response_model=List[UserRead])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("Admin")),
):
    result = await db.execute(select(User))
    return result.scalars().all()


@router.patch("/{user_id}/role", response_model=UserRead)
async def update_user_role(
    user_id: uuid.UUID,
    data: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("Admin")),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if data.rol_id not in {1, 2, 3}:
        raise HTTPException(status_code=422, detail="Rol inválido")
    user.rol_id = data.rol_id
    user.is_superuser = data.rol_id == 1
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/{user_id}/status", response_model=UserRead)
async def update_user_status(
    user_id: uuid.UUID,
    data: StatusUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("Admin")),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    user.esta_activo = data.esta_activo
    user.is_active = data.esta_activo
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
