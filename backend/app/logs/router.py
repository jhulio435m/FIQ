from fastapi import APIRouter, Depends, Query
from sqlmodel.ext.asyncio.session import AsyncSession
from datetime import datetime
from typing import Optional, List
import uuid

from app.core.database import get_db
from app.core.dependencies import require_role
from app.logs import crud
from app.models.user import User

router = APIRouter()


@router.get("")
@router.get("/")
async def list_activities(
    usuario_id: Optional[uuid.UUID] = Query(None),
    fecha_desde: Optional[datetime] = Query(None),
    fecha_hasta: Optional[datetime] = Query(None),
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("Admin")),
):
    return await crud.get_activities(
        db,
        skip=skip,
        limit=limit,
        usuario_id=usuario_id,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
    )
