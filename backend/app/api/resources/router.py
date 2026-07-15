from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.responses import RedirectResponse
from sqlalchemy import or_
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

from app.core.database import get_db
from app.core.users import current_active_user, get_optional_user
from app.core.dependencies import require_role
from app.core.config import settings
from app.core.s3 import s3_service
from app.models.user import User
from app.models.resource import Curso, Recurso, RecursoEstadoHistorial, TipoRecurso, EstadoRecurso
from app.models.activity import TipoActividad
from app.schemas.resource import (
    PresignedPost,
    RecursoCreate,
    RecursoRead,
    RecursoUpdate,
    ResourceModeration,
    TipoRecursoRead,
    ExternalResourceImport,
)
from app.logs.crud import log_activity

from app.api.resources.crud import (
    _activity_type,
    _state_id,
    _resource_payload,
    _resource_list_payload
)
from app.api.resources.upload import (
    _safe_upload_filename,
    _assert_pdf_upload,
    _log_upload_rejected,
    PDF_MIME_TYPES
)
from app.api.resources.service import (
    process_approve_resource,
    process_observe_resource,
    process_archive_resource
)

router = APIRouter(redirect_slashes=False)


@router.get("/types", response_model=List[TipoRecursoRead])
async def list_types(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TipoRecurso))
    return result.scalars().all()


@router.get("/courses")
async def list_courses(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Curso).where(Curso.esta_activo.is_(True)).order_by(Curso.nombre))
    return result.scalars().all()


@router.get("", response_model=List[RecursoRead])
@router.get("/", response_model=List[RecursoRead])
async def search_resources(
    search: Optional[str] = None,
    tipo_recurso_id: Optional[int] = None,
    curso_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    approved_id = await _state_id(db, "Aprobado")
    query = select(Recurso).where(Recurso.estado_id == approved_id)
    if search:
        pattern = f"%{search.strip()}%"
        query = query.where(or_(Recurso.titulo.ilike(pattern), Recurso.resumen.ilike(pattern)))
    if tipo_recurso_id:
        query = query.where(Recurso.tipo_recurso_id == tipo_recurso_id)
    if curso_id:
        query = query.where(Recurso.curso_id == curso_id)
    
    result = await db.execute(query.order_by(Recurso.created_at.desc()).offset(skip).limit(limit))
    return await _resource_list_payload(db, list(result.scalars().all()))


@router.post("", response_model=RecursoRead, status_code=201)
@router.post("/", response_model=RecursoRead, status_code=201)
async def upload_resource(
    request: Request,
    file: UploadFile = File(...),
    titulo: str = Form(...),
    resumen: Optional[str] = Form(None),
    tipo_recurso_id: int = Form(...),
    curso_id: Optional[int] = Form(None),
    autores: Optional[str] = Form(None),
    editorial: Optional[str] = Form(None),
    doi: Optional[str] = Form(None),
    anio: Optional[int] = Form(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("Docente", "Admin")),
):
    content = await file.read()
    try:
        safe_name = _assert_pdf_upload(file, content)
    except HTTPException as exc:
        await _log_upload_rejected(db, request, user, str(exc.detail), file.filename)
        raise
    await file.seek(0)

    key = await s3_service.upload_file(file, safe_filename=safe_name)
    pending_id = await _state_id(db, "Pendiente")
    recurso = Recurso(
        titulo=titulo,
        resumen=resumen,
        url_archivo=key,
        archivo_size=len(content),
        archivo_mime=file.content_type or "application/pdf",
        tipo_recurso_id=tipo_recurso_id,
        subido_por=user.id,
        estado_id=pending_id,
        curso_id=curso_id,
        autores=autores,
        editorial=editorial,
        doi=doi,
        anio=anio,
    )
    db.add(recurso)
    await db.commit()
    await db.refresh(recurso)

    tipo = await _activity_type(db, "upload")
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


@router.post("/init-upload", response_model=PresignedPost)
async def init_upload(
    request: Request,
    data: RecursoCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("Docente", "Admin")),
):
    """Initializes a professional S3 direct upload"""
    if data.file_size > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="El archivo excede 20MB")
    if data.file_size <= 0:
        raise HTTPException(status_code=422, detail="El archivo está vacío")
    if data.file_mime not in PDF_MIME_TYPES:
        raise HTTPException(status_code=415, detail="Solo se permiten archivos PDF")
    _safe_upload_filename(data.file_name)
    
    # 1. Generate Presigned Post
    post_data, key = await s3_service.generate_presigned_post(data.file_name)
    if not post_data:
        raise HTTPException(status_code=500, detail="Error al preparar el almacenamiento")

    # 2. Create database entry in 'Pending' state
    estado_pendiente_res = await db.execute(select(EstadoRecurso).where(EstadoRecurso.nombre == "Pendiente"))
    estado = estado_pendiente_res.scalar_one()

    recurso = Recurso(
        titulo=data.titulo,
        resumen=data.resumen,
        url_archivo=key, # Store the key
        archivo_size=data.file_size,
        archivo_mime=data.file_mime,
        tipo_recurso_id=data.tipo_recurso_id,
        subido_por=user.id,
        estado_id=estado.id,
        curso_id=data.curso_id,
        autores=data.autores,
        editorial=data.editorial,
        doi=data.doi,
        anio=data.anio,
    )
    db.add(recurso)
    await db.commit()
    await db.refresh(recurso)

    # Log activity
    tipo = await _activity_type(db, "upload")
    if tipo:
        await log_activity(
            db,
            usuario_id=user.id,
            tipo_actividad_id=tipo.id,
            ip_origen=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            detalle_accion={"resource_id": recurso.id, "titulo": recurso.titulo}
        )

    return {
        "url": post_data["url"],
        "fields": post_data["fields"],
        "key": key,
        "resource_id": recurso.id
    }


@router.post("/import-external", response_model=RecursoRead, status_code=201)
async def import_external_resource(
    request: Request,
    data: ExternalResourceImport,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("Docente", "Admin")),
):
    if data.doi:
        existing_result = await db.execute(select(Recurso).where(Recurso.doi == data.doi))
        if existing_result.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Ya existe un recurso con ese DOI")

    tipo = await db.get(TipoRecurso, data.tipo_recurso_id)
    if not tipo:
        raise HTTPException(status_code=422, detail="Tipo de recurso no válido")
    if data.curso_id and not await db.get(Curso, data.curso_id):
        raise HTTPException(status_code=422, detail="Curso no válido")

    pending_id = await _state_id(db, "Pendiente")
    external_target = data.open_access_url or data.external_url
    if not external_target:
        external_target = f"external:{data.source}:{data.external_id}"

    origin_note = (
        f"Fuente externa: {data.source} ({data.external_id}). "
        f"URL: {external_target}"
    )
    summary = data.resumen.strip() if data.resumen else ""
    resumen = f"{summary}\n\n{origin_note}".strip()

    recurso = Recurso(
        titulo=data.titulo.strip(),
        resumen=resumen,
        url_archivo=external_target[:500],
        archivo_size=0,
        archivo_mime="text/html",
        tipo_recurso_id=data.tipo_recurso_id,
        subido_por=user.id,
        estado_id=pending_id,
        curso_id=data.curso_id,
        autores=data.autores,
        editorial=data.editorial,
        doi=data.doi,
        anio=data.anio,
    )
    db.add(recurso)
    await db.commit()
    await db.refresh(recurso)

    activity = await _activity_type(db, "upload")
    if activity:
        await log_activity(
            db,
            usuario_id=user.id,
            tipo_actividad_id=activity.id,
            ip_origen=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            detalle_accion={
                "resource_id": recurso.id,
                "titulo": recurso.titulo,
                "action": "external_import",
                "source": data.source,
                "external_id": data.external_id,
            },
        )
    return await _resource_payload(db, recurso)


@router.post("/{resource_id}/view", response_model=RecursoRead)
async def track_view(
    request: Request,
    resource_id: int,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    recurso = await db.get(Recurso, resource_id)
    if not recurso:
        raise HTTPException(status_code=404, detail="Recurso no encontrado")
    
    recurso.visualizaciones += 1
    await db.commit()
    await db.refresh(recurso)

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
    db: AsyncSession = Depends(get_db),
):
    recurso = await db.get(Recurso, resource_id)
    if not recurso:
        raise HTTPException(status_code=404, detail="Recurso no encontrado")
    if recurso.url_archivo.startswith(("http://", "https://")):
        return {"url": recurso.url_archivo}
    return {"url": f"/api/resources/{resource_id}/file"}


@router.get("/{resource_id}/file")
async def get_resource_file(
    resource_id: int,
    db: AsyncSession = Depends(get_db),
):
    recurso = await db.get(Recurso, resource_id)
    if not recurso:
        raise HTTPException(status_code=404, detail="Recurso no encontrado")
    if recurso.url_archivo.startswith(("http://", "https://")):
        return RedirectResponse(recurso.url_archivo, status_code=307)

    async with s3_service.session.client(**s3_service.config) as s3:
        try:
            obj = await s3.get_object(Bucket=s3_service.bucket_name, Key=recurso.url_archivo)
            body = await obj["Body"].read()
        except Exception as exc:
            print(f"Error reading resource file from object storage: {exc}")
            raise HTTPException(status_code=404, detail="Archivo no encontrado") from exc

    filename = quote(recurso.url_archivo.rsplit("/", 1)[-1])
    return Response(
        content=body,
        media_type=recurso.archivo_mime or "application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{filename}"',
            "Cache-Control": "private, max-age=300",
        },
    )


@router.post("/{resource_id}/download")
async def track_download(
    request: Request,
    resource_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    recurso = await db.get(Recurso, resource_id)
    if not recurso:
        raise HTTPException(status_code=404, detail="Recurso no encontrado")
    
    recurso.descargas += 1
    await db.commit()

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


@router.get("/pending", response_model=List[RecursoRead])
async def pending_resources(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("Admin")),
):
    pending_id = await _state_id(db, "Pendiente")
    result = await db.execute(
        select(Recurso)
        .where(Recurso.estado_id == pending_id)
        .order_by(Recurso.created_at.desc())
    )
    return await _resource_list_payload(db, list(result.scalars().all()))


@router.patch("/{resource_id}/approve", response_model=RecursoRead)
async def approve_resource(
    request: Request,
    resource_id: int,
    data: ResourceModeration | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("Admin")),
):
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
        recurso.doi = data.doi
    if data.anio is not None:
        recurso.anio = data.anio
        
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
    recurso = await db.get(Recurso, resource_id)
    if not recurso:
        raise HTTPException(status_code=404, detail="Recurso no encontrado")

    return await process_archive_resource(db, recurso, data.comentario if data else None, user, request)
