from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import Optional
from app.core.database import get_db
from app.core.sharding import encode_resource_id, resource_session, resource_sharding_enabled, resource_shard_count, resource_write_session_for_course
from app.core.dependencies import require_role
from app.core.config import settings
from app.core.antivirus import scan_bytes
from app.core.s3 import s3_service
from app.models.user import User
from app.models.resource import Curso, Recurso, TipoRecurso, EstadoRecurso
from app.schemas.resource import PresignedPost, RecursoCreate, RecursoRead, ExternalResourceImport
from app.logs.crud import log_activity
from app.api.resources.crud import _activity_type, _state_id, _resource_payload
from app.api.resources.upload import _safe_upload_filename, _assert_pdf_upload, _log_upload_rejected, PDF_MIME_TYPES
from app.api.bibliography.service import ensure_resource_bibliography
from app.api.resources.operations import (
    ALLOWED_EXTERNAL_SOURCES,
    _external_duplicate_filter,
    _normalize_doi,
    _normalize_isbn,
    _safe_external_url,
    _with_resource_from_shards
)
from app.core.text_extraction import extract_text_from_pdf

router = APIRouter(redirect_slashes=False)

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
    isbn: Optional[str] = Form(None),
    anio: Optional[int] = Form(None),
    idioma: Optional[str] = Form(None),
    licencia: Optional[str] = Form(None),
    temas: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("Docente", "Admin")),
):
    content = await file.read()
    try:
        safe_name = _assert_pdf_upload(file, content)
    except HTTPException as exc:
        await _log_upload_rejected(db, request, user, str(exc.detail), file.filename)
        raise
    if await scan_bytes(content) == "infected":
        await _log_upload_rejected(db, request, user, "Malware detectado", file.filename)
        raise HTTPException(status_code=422, detail="El archivo fue rechazado por el antivirus")
    await file.seek(0)
    extracted_text = extract_text_from_pdf(content)

    key = await s3_service.upload_file(file, safe_filename=safe_name)
    if resource_sharding_enabled():
        async with resource_write_session_for_course(curso_id) as (shard_index, shard_db):
            pending_id = await _state_id(shard_db, "Pendiente")
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
                doi=_normalize_doi(doi),
                isbn=_normalize_isbn(isbn),
                anio=anio,
                idioma=idioma.strip()[:16] if idioma else None,
                licencia=licencia.strip()[:300] if licencia else None,
                temas=temas.strip()[:1000] if temas else None,
                scan_status="clean",
                contenido_texto=extracted_text,
            )
            shard_db.add(recurso)
            await shard_db.commit()
            await shard_db.refresh(recurso)
            public_id = encode_resource_id(shard_index, recurso.id)
            payload = await _resource_payload(shard_db, recurso, public_id=public_id)

        await ensure_resource_bibliography(db, public_id, recurso)
        tipo = await _activity_type(db, "upload")
        if tipo:
            await log_activity(
                db,
                usuario_id=user.id,
                tipo_actividad_id=tipo.id,
                ip_origen=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent"),
                detalle_accion={"resource_id": public_id, "titulo": recurso.titulo},
            )
        return payload

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
        doi=_normalize_doi(doi),
        isbn=_normalize_isbn(isbn),
        anio=anio,
        idioma=idioma.strip()[:16] if idioma else None,
        licencia=licencia.strip()[:300] if licencia else None,
        temas=temas.strip()[:1000] if temas else None,
        scan_status="clean",
        contenido_texto=extracted_text,
    )
    db.add(recurso)
    await db.commit()
    await db.refresh(recurso)
    await ensure_resource_bibliography(db, recurso.id, recurso)

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

    if resource_sharding_enabled():
        async with resource_write_session_for_course(data.curso_id) as (shard_index, shard_db):
            estado_pendiente_res = await shard_db.exec(
                select(EstadoRecurso).where(EstadoRecurso.nombre == "Pendiente")
            )
            estado = estado_pendiente_res.one()

            recurso = Recurso(
                titulo=data.titulo,
                resumen=data.resumen,
                url_archivo=key,
                archivo_size=data.file_size,
                archivo_mime=data.file_mime,
                tipo_recurso_id=data.tipo_recurso_id,
                subido_por=user.id,
                estado_id=estado.id,
                curso_id=data.curso_id,
                autores=data.autores,
                editorial=data.editorial,
                doi=_normalize_doi(data.doi),
                isbn=_normalize_isbn(data.isbn),
                anio=data.anio,
                idioma=data.idioma.strip()[:16] if data.idioma else None,
                licencia=data.licencia.strip()[:300] if data.licencia else None,
                temas=data.temas.strip()[:1000] if data.temas else None,
                scan_status="pending",
            )
            shard_db.add(recurso)
            await shard_db.commit()
            await shard_db.refresh(recurso)
            public_id = encode_resource_id(shard_index, recurso.id)

        await ensure_resource_bibliography(db, public_id, recurso)
        tipo = await _activity_type(db, "upload")
        if tipo:
            await log_activity(
                db,
                usuario_id=user.id,
                tipo_actividad_id=tipo.id,
                ip_origen=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent"),
                detalle_accion={"resource_id": public_id, "titulo": recurso.titulo}
            )

        return {
            "url": post_data["url"],
            "fields": post_data["fields"],
            "key": key,
            "resource_id": public_id
        }

    # 2. Create database entry in 'Pending' state
    estado_pendiente_res = await db.exec(select(EstadoRecurso).where(EstadoRecurso.nombre == "Pendiente"))
    estado = estado_pendiente_res.one()

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
        doi=_normalize_doi(data.doi),
        isbn=_normalize_isbn(data.isbn),
        anio=data.anio,
        idioma=data.idioma.strip()[:16] if data.idioma else None,
        licencia=data.licencia.strip()[:300] if data.licencia else None,
        temas=data.temas.strip()[:1000] if data.temas else None,
        scan_status="pending",
    )
    db.add(recurso)
    await db.commit()
    await db.refresh(recurso)
    await ensure_resource_bibliography(db, recurso.id, recurso)

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



@router.post("/{resource_id}/complete-upload", response_model=RecursoRead)
async def complete_direct_upload(
    resource_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("Docente", "Admin")),
):
    async def complete(recurso: Recurso, resource_db: AsyncSession, public_id: int) -> dict:
        if recurso.subido_por != user.id and user.rol != "Admin":
            raise HTTPException(status_code=403, detail="No puedes completar este recurso")
        if recurso.scan_status == "clean":
            return await _resource_payload(resource_db, recurso, public_id=public_id)
        try:
            content = await s3_service.read_object(recurso.url_archivo, settings.MAX_UPLOAD_SIZE)
        except ValueError as exc:
            raise HTTPException(status_code=413, detail="El archivo excede el tamaño máximo permitido") from exc
        except Exception as exc:
            raise HTTPException(status_code=404, detail="La carga directa no fue encontrada") from exc

        if not content.startswith(b"%PDF") or b"%%EOF" not in content[-2048:]:
            recurso.scan_status = "infected"
            await s3_service.quarantine_object(recurso.url_archivo)
            await resource_db.commit()
            raise HTTPException(status_code=422, detail="El archivo cargado no es un PDF válido")

        recurso.scan_status = await scan_bytes(content)
        if recurso.scan_status == "infected":
            await s3_service.quarantine_object(recurso.url_archivo)
            recurso.estado_id = await _state_id(resource_db, "Observado")
            await resource_db.commit()
            raise HTTPException(status_code=422, detail="El archivo fue enviado a cuarentena")

        recurso.contenido_texto = extract_text_from_pdf(content)
        await resource_db.commit()
        await resource_db.refresh(recurso)
        return await _resource_payload(resource_db, recurso, public_id=public_id)

    if resource_sharding_enabled():
        async def handler(shard_index: int, _local_id: int, recurso: Recurso, shard_db: AsyncSession):
            return await complete(recurso, shard_db, encode_resource_id(shard_index, recurso.id))

        return await _with_resource_from_shards(resource_id, handler)

    recurso = await db.get(Recurso, resource_id)
    if not recurso:
        raise HTTPException(status_code=404, detail="Recurso no encontrado")
    return await complete(recurso, db, resource_id)



@router.post("/import-external", response_model=RecursoRead, status_code=201)
async def import_external_resource(
    request: Request,
    data: ExternalResourceImport,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("Docente", "Admin")),
):
    source = data.source.strip().lower()
    external_id = data.external_id.strip()[:200]
    if source not in ALLOWED_EXTERNAL_SOURCES:
        raise HTTPException(status_code=422, detail="Fuente externa no permitida")
    if not external_id:
        raise HTTPException(status_code=422, detail="Identificador externo obligatorio")

    doi = _normalize_doi(data.doi)
    isbn = _normalize_isbn(data.isbn)
    temas = ", ".join(
        dict.fromkeys(topic.strip()[:100] for topic in data.temas if topic.strip())
    )[:1000] or None
    external_url = _safe_external_url(data.external_url)
    open_access_url = _safe_external_url(data.open_access_url)
    cover_url = _safe_external_url(data.cover_url)
    if data.external_url and not external_url:
        raise HTTPException(status_code=422, detail="La URL externa debe usar HTTPS")
    if data.open_access_url and not open_access_url:
        raise HTTPException(status_code=422, detail="La URL de acceso abierto debe usar HTTPS")
    if data.cover_url and not cover_url:
        raise HTTPException(status_code=422, detail="La URL de portada debe usar HTTPS")
    duplicate_filter = _external_duplicate_filter(doi, isbn, source, external_id)

    if resource_sharding_enabled():
        for shard_index in range(resource_shard_count()):
            async with resource_session(shard_index, read=True) as shard_db:
                existing_result = await shard_db.exec(select(Recurso).where(duplicate_filter))
                if existing_result.first():
                    raise HTTPException(status_code=409, detail="El recurso externo ya existe")

        async with resource_write_session_for_course(data.curso_id) as (shard_index, shard_db):
            tipo = await shard_db.get(TipoRecurso, data.tipo_recurso_id)
            if not tipo:
                raise HTTPException(status_code=422, detail="Tipo de recurso no válido")
            if data.curso_id and not await shard_db.get(Curso, data.curso_id):
                raise HTTPException(status_code=422, detail="Curso no válido")

            pending_id = await _state_id(shard_db, "Pendiente")
            external_target = open_access_url or external_url
            if not external_target:
                external_target = f"external:{source}:{external_id}"

            origin_note = (
                f"Fuente externa: {source} ({external_id}). "
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
                doi=doi,
                isbn=isbn,
                anio=data.anio,
                idioma=data.idioma.strip()[:16] if data.idioma else None,
                cover_url=cover_url,
                licencia=data.licencia.strip()[:300] if data.licencia else None,
                temas=temas,
                fuente_externa=source,
                external_id=external_id,
            )
            shard_db.add(recurso)
            await shard_db.commit()
            await shard_db.refresh(recurso)
            public_id = encode_resource_id(shard_index, recurso.id)
            payload = await _resource_payload(shard_db, recurso, public_id=public_id)

        await ensure_resource_bibliography(db, public_id, recurso)
        activity = await _activity_type(db, "upload")
        if activity:
            await log_activity(
                db,
                usuario_id=user.id,
                tipo_actividad_id=activity.id,
                ip_origen=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent"),
                detalle_accion={
                    "resource_id": public_id,
                    "titulo": recurso.titulo,
                    "action": "external_import",
                    "source": source,
                    "external_id": external_id,
                },
            )
        return payload

    existing_result = await db.exec(select(Recurso).where(duplicate_filter))
    if existing_result.first():
        raise HTTPException(status_code=409, detail="El recurso externo ya existe")

    tipo = await db.get(TipoRecurso, data.tipo_recurso_id)
    if not tipo:
        raise HTTPException(status_code=422, detail="Tipo de recurso no válido")
    if data.curso_id and not await db.get(Curso, data.curso_id):
        raise HTTPException(status_code=422, detail="Curso no válido")

    pending_id = await _state_id(db, "Pendiente")
    external_target = open_access_url or external_url
    if not external_target:
        external_target = f"external:{source}:{external_id}"

    origin_note = (
        f"Fuente externa: {source} ({external_id}). "
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
        doi=doi,
        isbn=isbn,
        anio=data.anio,
        idioma=data.idioma.strip()[:16] if data.idioma else None,
        cover_url=cover_url,
        licencia=data.licencia.strip()[:300] if data.licencia else None,
        temas=temas,
        fuente_externa=source,
        external_id=external_id,
    )
    db.add(recurso)
    await db.commit()
    await db.refresh(recurso)
    await ensure_resource_bibliography(db, recurso.id, recurso)

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
                "source": source,
                "external_id": external_id,
            },
        )
    return await _resource_payload(db, recurso)
