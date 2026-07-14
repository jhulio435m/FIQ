from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from datetime import datetime
from typing import Optional
import uuid

from pymongo.errors import PyMongoError

from app.core.mongo import get_activity_events_collection
from app.models.activity import RegistroActividad, TipoActividad


async def get_activities(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    usuario_id: Optional[uuid.UUID] = None,
    fecha_desde: Optional[datetime] = None,
    fecha_hasta: Optional[datetime] = None,
):
    query = select(RegistroActividad)
    if usuario_id:
        query = query.where(RegistroActividad.usuario_id == usuario_id)
    if fecha_desde:
        query = query.where(RegistroActividad.fecha_hora >= fecha_desde)
    if fecha_hasta:
        query = query.where(RegistroActividad.fecha_hora <= fecha_hasta)
    
    result = await db.execute(query.order_by(RegistroActividad.fecha_hora.desc()).offset(skip).limit(limit))
    return result.scalars().all()


async def log_activity(
    db: AsyncSession,
    usuario_id: uuid.UUID,
    tipo_actividad_id: int,
    ip_origen: Optional[str] = None,
    user_agent: Optional[str] = None,
    entidad_relacionada_id: Optional[uuid.UUID] = None,
    detalle_accion: Optional[dict] = None,
):
    activity = RegistroActividad(
        usuario_id=usuario_id,
        tipo_actividad_id=tipo_actividad_id,
        ip_origen=ip_origen,
        user_agent=user_agent,
        entidad_relacionada_id=entidad_relacionada_id,
        detalle_accion=_mongo_safe(detalle_accion) if detalle_accion is not None else None,
    )
    db.add(activity)
    await db.commit()
    await db.refresh(activity)
    await log_activity_event(activity, db)
    return activity


def _mongo_safe(value: object) -> object:
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, datetime):
        return value
    if isinstance(value, dict):
        return {str(key): _mongo_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_mongo_safe(item) for item in value]
    if isinstance(value, tuple):
        return [_mongo_safe(item) for item in value]
    return value


async def log_activity_event(activity: RegistroActividad, db: AsyncSession) -> None:
    collection = get_activity_events_collection()
    if collection is None:
        return

    tipo_nombre: str | None = None
    tipo = await db.get(TipoActividad, activity.tipo_actividad_id)
    if tipo:
        tipo_nombre = tipo.nombre

    document = {
        "sql_activity_id": activity.id,
        "usuario_id": str(activity.usuario_id),
        "tipo_actividad_id": activity.tipo_actividad_id,
        "tipo_actividad": tipo_nombre,
        "entidad_relacionada_id": (
            str(activity.entidad_relacionada_id)
            if activity.entidad_relacionada_id
            else None
        ),
        "occurred_at": activity.fecha_hora,
        "ip_origen": activity.ip_origen,
        "user_agent": activity.user_agent,
        "detalle_accion": _mongo_safe(activity.detalle_accion),
    }
    try:
        await collection.insert_one(document)
    except PyMongoError:
        return
