from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from datetime import datetime
from typing import Optional
import uuid

from app.models.activity import RegistroActividad


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
        detalle_accion=detalle_accion,
    )
    db.add(activity)
    await db.commit()
    await db.refresh(activity)
    return activity
