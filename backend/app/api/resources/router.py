from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy import or_
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional
from datetime import datetime, timezone

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
)
from app.logs.crud import log_activity

router = APIRouter()


async def _activity_type(db: AsyncSession, name: str) -> TipoActividad | None:
    result = await db.execute(select(TipoActividad).where(TipoActividad.nombre == name))
    return result.scalar_one_or_none()


async def _state_id(db: AsyncSession, name: str) -> int:
    result = await db.execute(select(EstadoRecurso).where(EstadoRecurso.nombre == name))
    state = result.scalar_one_or_none()
    if not state or state.id is None:
        raise HTTPException(status_code=500, detail=f"Estado de recurso no configurado: {name}")
    return state.id


async def _resource_payload(db: AsyncSession, recurso: Recurso) -> dict:
    tipo_nombre = None
    curso_nombre = None
    tipo = await db.get(TipoRecurso, recurso.tipo_recurso_id)
    if tipo:
        tipo_nombre = tipo.nombre
    if recurso.curso_id:
        curso = await db.get(Curso, recurso.curso_id)
        if curso:
            curso_nombre = curso.nombre
    data = recurso.model_dump()
    data["tipo_recurso_nombre"] = tipo_nombre
    data["curso_nombre"] = curso_nombre
    return data


async def _resource_list_payload(db: AsyncSession, recursos: list[Recurso]) -> list[dict]:
    return [await _resource_payload(db, recurso) for recurso in recursos]


def _assert_pdf(file: UploadFile, first_bytes: bytes) -> None:
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=415, detail="Solo se permiten archivos PDF")
    if not first_bytes.startswith(b"%PDF"):
        raise HTTPException(status_code=415, detail="El archivo no es un PDF válido")


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
    first_bytes = await file.read(4)
    _assert_pdf(file, first_bytes)
    await file.seek(0)

    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail="El archivo excede 20MB")
    await file.seek(0)

    key = await s3_service.upload_file(file)
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
    url = await s3_service.get_presigned_url(recurso.url_archivo)
    return {"url": url or recurso.url_archivo}


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

    # Generate professional presigned URL
    url = await s3_service.get_presigned_url(recurso.url_archivo)
    return {"download_url": url or recurso.url_archivo, "resource": await _resource_payload(db, recurso)}


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
    approved_id = await _state_id(db, "Aprobado")
    previous_state = recurso.estado_id
    recurso.estado_id = approved_id
    db.add(RecursoEstadoHistorial(
        recurso_id=recurso.id,
        estado_anterior_id=previous_state,
        estado_nuevo_id=approved_id,
        comentario=data.comentario if data else None,
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
    return await _resource_payload(db, recurso)


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
    observed_id = await _state_id(db, "Observado")
    previous_state = recurso.estado_id
    recurso.estado_id = observed_id
    db.add(RecursoEstadoHistorial(
        recurso_id=recurso.id,
        estado_anterior_id=previous_state,
        estado_nuevo_id=observed_id,
        comentario=data.comentario,
        cambiado_por=user.id,
    ))
    await db.commit()
    await db.refresh(recurso)
    return await _resource_payload(db, recurso)


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

    archived_id = await _state_id(db, "Archivado")
    previous_state = recurso.estado_id
    recurso.estado_id = archived_id
    recurso.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.add(
        RecursoEstadoHistorial(
            recurso_id=recurso.id,
            estado_anterior_id=previous_state,
            estado_nuevo_id=archived_id,
            comentario=data.comentario if data else None,
            cambiado_por=user.id,
        )
    )
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
    return await _resource_payload(db, recurso)
