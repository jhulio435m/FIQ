from datetime import datetime, timezone
from fastapi import HTTPException, Request
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.resource import Recurso, RecursoEstadoHistorial
from app.models.user import User
from app.logs.crud import log_activity
from app.api.resources.crud import _state_id, _activity_type

async def process_approve_resource(
    db: AsyncSession,
    recurso: Recurso,
    comentario: str | None,
    user: User,
    request: Request
) -> Recurso:
    approved_id = await _state_id(db, "Aprobado")
    previous_state = recurso.estado_id
    recurso.estado_id = approved_id
    db.add(RecursoEstadoHistorial(
        recurso_id=recurso.id,
        estado_anterior_id=previous_state,
        estado_nuevo_id=approved_id,
        comentario=comentario,
        cambiado_por=user.id,
    ))
    await db.commit()
    await db.refresh(recurso)

    tipo = await _activity_type(db, "resource_approve")
    if tipo:
        await log_activity(
            db,
            usuario_id=user.id,
            tipo_actividad_id=tipo.id,
            ip_origen=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            detalle_accion={"resource_id": recurso.id, "titulo": recurso.titulo},
        )
    return recurso

async def process_observe_resource(
    db: AsyncSession,
    recurso: Recurso,
    comentario: str,
    user: User
) -> Recurso:
    observed_id = await _state_id(db, "Observado")
    previous_state = recurso.estado_id
    recurso.estado_id = observed_id
    db.add(RecursoEstadoHistorial(
        recurso_id=recurso.id,
        estado_anterior_id=previous_state,
        estado_nuevo_id=observed_id,
        comentario=comentario,
        cambiado_por=user.id,
    ))
    await db.commit()
    await db.refresh(recurso)
    return recurso

async def process_archive_resource(
    db: AsyncSession,
    recurso: Recurso,
    comentario: str | None,
    user: User,
    request: Request
) -> Recurso:
    archived_id = await _state_id(db, "Archivado")
    previous_state = recurso.estado_id
    recurso.estado_id = archived_id
    recurso.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.add(RecursoEstadoHistorial(
        recurso_id=recurso.id,
        estado_anterior_id=previous_state,
        estado_nuevo_id=archived_id,
        comentario=comentario,
        cambiado_por=user.id,
    ))
    await db.commit()
    await db.refresh(recurso)

    tipo = await _activity_type(db, "resource_archive")
    if tipo:
        await log_activity(
            db,
            usuario_id=user.id,
            tipo_actividad_id=tipo.id,
            ip_origen=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            detalle_accion={"resource_id": recurso.id, "titulo": recurso.titulo},
        )
    return recurso
