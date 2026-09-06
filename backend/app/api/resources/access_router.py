from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlmodel.ext.asyncio.session import AsyncSession
from app.core.database import get_db, get_read_db
from app.core.sharding import encode_resource_id, resource_sharding_enabled
from app.core.users import current_active_user, get_optional_user
from app.models.user import User
from app.models.resource import Recurso
from app.schemas.resource import RecursoRead
from app.logs.crud import log_activity
from app.api.resources.crud import _activity_type, _state_id, _resource_payload
from app.api.resources.operations import (
    _add_bibliography_summary,
    _increment_resource_counter,
    _require_approved_resource,
    _resource_stream_response,
    _with_resource_from_shards
)

router = APIRouter(redirect_slashes=False)

@router.post("/{resource_id}/view", response_model=RecursoRead)
async def track_view(
    request: Request,
    resource_id: int,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    if resource_sharding_enabled():
        async def handler(shard_index: int, _local_id: int, recurso: Recurso, shard_db: AsyncSession):
            await _require_approved_resource(shard_db, recurso)
            await _increment_resource_counter(shard_db, recurso, "visualizaciones")
            public_id = encode_resource_id(shard_index, recurso.id)

            if user:
                tipo = await _activity_type(db, "view")
                if tipo:
                    await log_activity(
                        db,
                        usuario_id=user.id,
                        tipo_actividad_id=tipo.id,
                        ip_origen=request.client.host if request.client else None,
                        user_agent=request.headers.get("user-agent"),
                        detalle_accion={"resource_id": public_id, "titulo": recurso.titulo},
                    )
            return await _resource_payload(shard_db, recurso, public_id=public_id)

        return await _with_resource_from_shards(resource_id, handler)

    recurso = await db.get(Recurso, resource_id)
    if not recurso:
        raise HTTPException(status_code=404, detail="Recurso no encontrado")
    await _require_approved_resource(db, recurso)
    
    await _increment_resource_counter(db, recurso, "visualizaciones")

    if user:
        tipo = await _activity_type(db, "view")
        if tipo:
            await log_activity(
                db,
                usuario_id=user.id,
                tipo_actividad_id=tipo.id,
                ip_origen=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent"),
                detalle_accion={"resource_id": recurso.id, "titulo": recurso.titulo},
            )
    return await _resource_payload(db, recurso)



@router.get("/{resource_id}/url")
async def get_resource_url(
    resource_id: int,
    db: AsyncSession = Depends(get_read_db),
):
    if resource_sharding_enabled():
        async def handler(shard_index: int, _local_id: int, recurso: Recurso, _shard_db: AsyncSession):
            await _require_approved_resource(_shard_db, recurso)
            public_id = encode_resource_id(shard_index, recurso.id)
            if recurso.url_archivo.startswith(("http://", "https://")):
                return {"url": recurso.url_archivo}
            return {"url": f"/api/resources/{public_id}/file"}

        return await _with_resource_from_shards(resource_id, handler, read=True)

    recurso = await db.get(Recurso, resource_id)
    if not recurso:
        raise HTTPException(status_code=404, detail="Recurso no encontrado")
    await _require_approved_resource(db, recurso)
    if recurso.url_archivo.startswith(("http://", "https://")):
        return {"url": recurso.url_archivo}
    return {"url": f"/api/resources/{resource_id}/file"}



@router.get("/{resource_id}/file")
async def get_resource_file(
    resource_id: int,
    db: AsyncSession = Depends(get_read_db),
):
    if resource_sharding_enabled():
        async def handler(_shard_index: int, _local_id: int, recurso: Recurso, _shard_db: AsyncSession):
            await _require_approved_resource(_shard_db, recurso)
            if recurso.url_archivo.startswith(("http://", "https://")):
                return RedirectResponse(recurso.url_archivo, status_code=307)

            return await _resource_stream_response(recurso)

        return await _with_resource_from_shards(resource_id, handler, read=True)

    recurso = await db.get(Recurso, resource_id)
    if not recurso:
        raise HTTPException(status_code=404, detail="Recurso no encontrado")
    await _require_approved_resource(db, recurso)
    if recurso.url_archivo.startswith(("http://", "https://")):
        return RedirectResponse(recurso.url_archivo, status_code=307)

    return await _resource_stream_response(recurso)



@router.post("/{resource_id}/download")
async def track_download(
    request: Request,
    resource_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    if resource_sharding_enabled():
        async def handler(shard_index: int, _local_id: int, recurso: Recurso, shard_db: AsyncSession):
            await _require_approved_resource(shard_db, recurso)
            await _increment_resource_counter(shard_db, recurso, "descargas")
            public_id = encode_resource_id(shard_index, recurso.id)

            tipo = await _activity_type(db, "download")
            if tipo:
                await log_activity(
                    db,
                    usuario_id=user.id,
                    tipo_actividad_id=tipo.id,
                    ip_origen=request.client.host if request.client else None,
                    user_agent=request.headers.get("user-agent"),
                    detalle_accion={"resource_id": public_id, "titulo": recurso.titulo}
                )

            download_url = (
                recurso.url_archivo
                if recurso.url_archivo.startswith(("http://", "https://"))
                else f"/api/resources/{public_id}/file"
            )
            return {"download_url": download_url, "resource": await _resource_payload(shard_db, recurso, public_id=public_id)}

        return await _with_resource_from_shards(resource_id, handler)

    recurso = await db.get(Recurso, resource_id)
    if not recurso:
        raise HTTPException(status_code=404, detail="Recurso no encontrado")
    await _require_approved_resource(db, recurso)
    
    await _increment_resource_counter(db, recurso, "descargas")

    # Log activity
    tipo = await _activity_type(db, "download")
    if tipo:
        await log_activity(
            db,
            usuario_id=user.id,
            tipo_actividad_id=tipo.id,
            ip_origen=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            detalle_accion={"resource_id": recurso.id, "titulo": recurso.titulo}
        )

    download_url = (
        recurso.url_archivo
        if recurso.url_archivo.startswith(("http://", "https://"))
        else f"/api/resources/{resource_id}/file"
    )
    return {"download_url": download_url, "resource": await _resource_payload(db, recurso)}



@router.get("/{resource_id}", response_model=RecursoRead)
async def get_public_resource(
    resource_id: int,
    db: AsyncSession = Depends(get_read_db),
):
    if resource_sharding_enabled():
        async def handler(
            shard_index: int,
            _local_id: int,
            resource: Recurso,
            shard_db: AsyncSession,
        ):
            approved_id = await _state_id(shard_db, "Aprobado")
            if resource.estado_id != approved_id:
                raise HTTPException(status_code=404, detail="Recurso no encontrado")
            payload = await _resource_payload(
                shard_db,
                resource,
                public_id=encode_resource_id(shard_index, resource.id),
            )
            return await _add_bibliography_summary(db, payload, payload["id"])

        return await _with_resource_from_shards(resource_id, handler, read=True)

    resource = await db.get(Recurso, resource_id)
    approved_id = await _state_id(db, "Aprobado")
    if not resource or resource.estado_id != approved_id:
        raise HTTPException(status_code=404, detail="Recurso no encontrado")
    payload = await _resource_payload(db, resource)
    return await _add_bibliography_summary(db, payload, resource_id)
