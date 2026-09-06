from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.sharding import encode_resource_id, resource_session, resource_sharding_enabled, resource_shard_count, resource_shard_index
from app.core.dependencies import require_role
from app.models.user import User
from app.models.resource import Recurso
from app.schemas.resource import RecursoRead, RecursoUpdate, ResourceModeration
from app.logs.crud import log_activity
from app.api.resources.crud import _activity_type, _state_id, _resource_payload, _resource_list_payload
from app.api.resources.service import process_approve_resource, process_observe_resource, process_archive_resource
from app.api.resources.operations import (
    _normalize_doi,
    _normalize_isbn,
    _safe_external_url,
    _with_resource_from_shards
)

router = APIRouter(redirect_slashes=False)

@router.get("/pending", response_model=List[RecursoRead])
async def pending_resources(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("Admin")),
):
    if resource_sharding_enabled():
        rows: list[tuple[int, Recurso]] = []
        for shard_index in range(resource_shard_count()):
            async with resource_session(shard_index, read=True) as shard_db:
                pending_id = await _state_id(shard_db, "Pendiente")
                result = await shard_db.exec(
                    select(Recurso)
                    .where(Recurso.estado_id == pending_id)
                    .order_by(Recurso.created_at.desc())
                )
                rows.extend((shard_index, recurso) for recurso in result.all())
        rows.sort(key=lambda item: item[1].created_at, reverse=True)
        payload: list[dict] = []
        for shard_index, recurso in rows:
            async with resource_session(shard_index, read=True) as shard_db:
                payload.append(
                    await _resource_payload(
                        shard_db,
                        recurso,
                        public_id=encode_resource_id(shard_index, recurso.id),
                    )
                )
        return payload

    pending_id = await _state_id(db, "Pendiente")
    result = await db.exec(
        select(Recurso)
        .where(Recurso.estado_id == pending_id)
        .order_by(Recurso.created_at.desc())
    )
    return await _resource_list_payload(db, list(result.all()))



@router.patch("/{resource_id}/approve", response_model=RecursoRead)
async def approve_resource(
    request: Request,
    resource_id: int,
    data: ResourceModeration | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("Admin")),
):
    if resource_sharding_enabled():
        async def handler(shard_index: int, _local_id: int, recurso: Recurso, shard_db: AsyncSession):
            updated = await process_approve_resource(shard_db, recurso, data.comentario if data else None, user, request)
            return await _resource_payload(
                shard_db,
                updated,
                public_id=encode_resource_id(shard_index, updated.id),
            )

        return await _with_resource_from_shards(resource_id, handler)

    recurso = await db.get(Recurso, resource_id)
    if not recurso:
        raise HTTPException(status_code=404, detail="Recurso no encontrado")
    return await process_approve_resource(db, recurso, data.comentario if data else None, user, request)



@router.patch("/{resource_id}/observe", response_model=RecursoRead)
async def observe_resource(
    resource_id: int,
    data: ResourceModeration,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("Admin")),
):
    if resource_sharding_enabled():
        async def handler(shard_index: int, _local_id: int, recurso: Recurso, shard_db: AsyncSession):
            updated = await process_observe_resource(shard_db, recurso, data.comentario, user)
            return await _resource_payload(
                shard_db,
                updated,
                public_id=encode_resource_id(shard_index, updated.id),
            )

        return await _with_resource_from_shards(resource_id, handler)

    recurso = await db.get(Recurso, resource_id)
    if not recurso:
        raise HTTPException(status_code=404, detail="Recurso no encontrado")
    return await process_observe_resource(db, recurso, data.comentario, user)



@router.patch("/{resource_id}", response_model=RecursoRead)
async def update_resource(
    request: Request,
    resource_id: int,
    data: RecursoUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("Admin")),
):
    if resource_sharding_enabled():
        async def handler(shard_index: int, _local_id: int, recurso: Recurso, shard_db: AsyncSession):
            if data.curso_id is not None:
                new_curso_id = data.curso_id if data.curso_id != 0 else None
                if resource_shard_index(new_curso_id) != shard_index:
                    raise HTTPException(
                        status_code=409,
                        detail="No se puede mover un recurso entre shards desde esta operación",
                    )
                recurso.curso_id = new_curso_id
            if data.titulo is not None:
                recurso.titulo = data.titulo
            if data.resumen is not None:
                recurso.resumen = data.resumen
            if data.tipo_recurso_id is not None:
                recurso.tipo_recurso_id = data.tipo_recurso_id
            if data.autores is not None:
                recurso.autores = data.autores
            if data.editorial is not None:
                recurso.editorial = data.editorial
            if data.doi is not None:
                recurso.doi = _normalize_doi(data.doi)
            if data.isbn is not None:
                recurso.isbn = _normalize_isbn(data.isbn)
            if data.anio is not None:
                recurso.anio = data.anio
            if data.idioma is not None:
                recurso.idioma = data.idioma.strip()[:16] or None
            if data.cover_url is not None:
                recurso.cover_url = _safe_external_url(data.cover_url)
            if data.licencia is not None:
                recurso.licencia = data.licencia.strip()[:300] or None
            if data.temas is not None:
                recurso.temas = data.temas.strip()[:1000] or None

            recurso.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
            shard_db.add(recurso)
            await shard_db.commit()
            await shard_db.refresh(recurso)
            return await _resource_payload(
                shard_db,
                recurso,
                public_id=encode_resource_id(shard_index, recurso.id),
            )

        return await _with_resource_from_shards(resource_id, handler)

    recurso = await db.get(Recurso, resource_id)
    if not recurso:
        raise HTTPException(status_code=404, detail="Recurso no encontrado")
    
    if data.titulo is not None:
        recurso.titulo = data.titulo
    if data.resumen is not None:
        recurso.resumen = data.resumen
    if data.tipo_recurso_id is not None:
        recurso.tipo_recurso_id = data.tipo_recurso_id
    if data.curso_id is not None:
        recurso.curso_id = data.curso_id if data.curso_id != 0 else None
    if data.autores is not None:
        recurso.autores = data.autores
    if data.editorial is not None:
        recurso.editorial = data.editorial
    if data.doi is not None:
        recurso.doi = _normalize_doi(data.doi)
    if data.isbn is not None:
        recurso.isbn = _normalize_isbn(data.isbn)
    if data.anio is not None:
        recurso.anio = data.anio
    if data.idioma is not None:
        recurso.idioma = data.idioma.strip()[:16] or None
    if data.cover_url is not None:
        recurso.cover_url = _safe_external_url(data.cover_url)
    if data.licencia is not None:
        recurso.licencia = data.licencia.strip()[:300] or None
    if data.temas is not None:
        recurso.temas = data.temas.strip()[:1000] or None
        
    recurso.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.add(recurso)
    await db.commit()
    await db.refresh(recurso)
    
    # Log activity
    tipo = await _activity_type(db, "upload")  # Using 'upload' as a general activity logger
    if tipo:
        await log_activity(
            db,
            usuario_id=user.id,
            tipo_actividad_id=tipo.id,
            ip_origen=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            detalle_accion={"resource_id": recurso.id, "titulo": recurso.titulo, "action": "edit"}
        )
    return await _resource_payload(db, recurso)



@router.delete("/{resource_id}", response_model=RecursoRead)
async def archive_resource(
    request: Request,
    resource_id: int,
    data: ResourceModeration | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("Admin")),
):
    if resource_sharding_enabled():
        async def handler(shard_index: int, _local_id: int, recurso: Recurso, shard_db: AsyncSession):
            updated = await process_archive_resource(shard_db, recurso, data.comentario if data else None, user, request)
            return await _resource_payload(
                shard_db,
                updated,
                public_id=encode_resource_id(shard_index, updated.id),
            )

        return await _with_resource_from_shards(resource_id, handler)

    recurso = await db.get(Recurso, resource_id)
    if not recurso:
        raise HTTPException(status_code=404, detail="Recurso no encontrado")

    return await process_archive_resource(db, recurso, data.comentario if data else None, user, request)
