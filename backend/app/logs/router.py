from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel.ext.asyncio.session import AsyncSession
from datetime import datetime
from typing import Optional, List
import uuid
from bson import ObjectId
from pymongo import DESCENDING
from pymongo.errors import PyMongoError

from app.core.database import get_db
from app.core.mongo import get_activity_events_collection
from app.core.dependencies import require_role
from app.logs import crud
from app.logs.schemas import ActivityEventResponse
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


def _activity_event_payload(document: dict[str, object]) -> dict[str, object]:
    raw_id = document.pop("_id", None)
    document["id"] = str(raw_id) if isinstance(raw_id, ObjectId) else str(raw_id or "")
    return document


@router.get("/events", response_model=list[ActivityEventResponse])
async def list_activity_events(
    usuario_id: Optional[uuid.UUID] = Query(None),
    tipo_actividad: Optional[str] = Query(None),
    fecha_desde: Optional[datetime] = Query(None),
    fecha_hasta: Optional[datetime] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    _: User = Depends(require_role("Admin")),
):
    collection = get_activity_events_collection()
    if collection is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="MongoDB no está configurado para eventos de auditoría",
        )

    query: dict[str, object] = {}
    if usuario_id:
        query["usuario_id"] = str(usuario_id)
    if tipo_actividad:
        query["tipo_actividad"] = tipo_actividad
    date_range: dict[str, datetime] = {}
    if fecha_desde:
        date_range["$gte"] = fecha_desde
    if fecha_hasta:
        date_range["$lte"] = fecha_hasta
    if date_range:
        query["occurred_at"] = date_range

    try:
        cursor = (
            collection.find(query)
            .sort("occurred_at", DESCENDING)
            .skip(skip)
            .limit(limit)
        )
        documents = await cursor.to_list(length=limit)
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No se pudo consultar MongoDB",
        ) from exc

    return [_activity_event_payload(document) for document in documents]
