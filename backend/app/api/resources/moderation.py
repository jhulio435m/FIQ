"""Flujo de moderación entre docentes y administradores.

Estados y transiciones permitidas (cualquier otra devuelve 409):

    Pendiente ──aprobar──▶ Aprobado
    Pendiente ──observar─▶ Observado ──reenviar (autor)──▶ Pendiente
    Pendiente/Observado ──rechazar──▶ Rechazado

Observar y rechazar exigen un comentario: es lo que el docente ve en
"Mis recursos" para saber qué corregir.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from sqlalchemy import func
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.resources.crud import _activity_type, _resource_list_payload, _resource_payload
from app.api.resources.upload import _assert_pdf_upload, _log_upload_rejected
from app.core.database import get_db
from app.core.dependencies import require_role
from app.core.s3 import s3_service
from app.logs.crud import log_activity
from app.models.resource import EstadoRecurso, Recurso, RecursoEstadoHistorial
from app.models.user import User
from app.schemas.resource import (
    BulkApproveRequest,
    BulkModerationResult,
    HistoryEntry,
    ModerationComment,
    ModerationItem,
    MyResourcesResponse,
    RecursoRead,
    ResourceModeration,
    ResubmitRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter(redirect_slashes=False)

PENDIENTE, APROBADO, OBSERVADO, RECHAZADO = "Pendiente", "Aprobado", "Observado", "Rechazado"

# destino -> estados de origen permitidos
TRANSITIONS: dict[str, set[str]] = {
    APROBADO: {PENDIENTE},
    OBSERVADO: {PENDIENTE},
    RECHAZADO: {PENDIENTE, OBSERVADO},
}
# El autor puede editar metadatos o reemplazar el archivo mientras no esté resuelto.
OWNER_EDITABLE = {PENDIENTE, OBSERVADO}


async def _state_maps(db: AsyncSession) -> tuple[dict[str, int], dict[int, str]]:
    estados = (await db.execute(select(EstadoRecurso))).scalars().all()
    by_name = {e.nombre: e.id for e in estados if e.id is not None}
    return by_name, {v: k for k, v in by_name.items()}


async def _get_resource(db: AsyncSession, resource_id: int) -> Recurso:
    recurso = await db.get(Recurso, resource_id)
    if not recurso:
        raise HTTPException(status_code=404, detail="Recurso no encontrado")
    return recurso


async def _log(db: AsyncSession, request: Request, user: User, activity: str, recurso: Recurso, **extra) -> None:
    tipo = await _activity_type(db, activity)
    if tipo:
        await log_activity(
            db,
            usuario_id=user.id,
            tipo_actividad_id=tipo.id,
            ip_origen=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            detalle_accion={"resource_id": recurso.id, "titulo": recurso.titulo, **extra},
        )


async def transition(
    db: AsyncSession,
    recurso: Recurso,
    destino: str,
    user: User,
    comentario: str | None,
    *,
    allowed_from: set[str] | None = None,
    commit: bool = True,
) -> Recurso:
    by_name, by_id = await _state_maps(db)
    actual = by_id.get(recurso.estado_id, "")
    permitidos = allowed_from if allowed_from is not None else TRANSITIONS[destino]
    if actual not in permitidos:
        raise HTTPException(
            status_code=409,
            detail=f"No se puede pasar de «{actual or 'desconocido'}» a «{destino}».",
        )
    recurso.estado_id = by_name[destino]
    recurso.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.add(
        RecursoEstadoHistorial(
            recurso_id=recurso.id,
            estado_anterior_id=by_name.get(actual),
            estado_nuevo_id=by_name[destino],
            comentario=comentario,
            cambiado_por=user.id,
        )
    )
    if commit:
        await db.commit()
        await db.refresh(recurso)
    return recurso


async def _moderation_items(db: AsyncSession, recursos: list[Recurso]) -> list[ModerationItem]:
    """Enriquece recursos con estado, autor, último comentario y número de reenvíos."""
    if not recursos:
        return []
    payloads = await _resource_list_payload(db, recursos)
    _, by_id = await _state_maps(db)
    ids = [r.id for r in recursos]

    owner_ids = {r.subido_por for r in recursos}
    owners = {
        u.id: u for u in (await db.execute(select(User).where(User.id.in_(owner_ids)))).scalars().all()
    }

    historial = (
        await db.execute(
            select(RecursoEstadoHistorial)
            .where(RecursoEstadoHistorial.recurso_id.in_(ids))
            .order_by(RecursoEstadoHistorial.fecha_hora.asc(), RecursoEstadoHistorial.id.asc())
        )
    ).scalars().all()
    last_entry: dict[int, RecursoEstadoHistorial] = {}
    resubmits: dict[int, int] = {}
    observado_id = next((k for k, v in by_id.items() if v == OBSERVADO), None)
    for entry in historial:
        last_entry[entry.recurso_id] = entry
        if entry.estado_anterior_id == observado_id and by_id.get(entry.estado_nuevo_id) == PENDIENTE:
            resubmits[entry.recurso_id] = resubmits.get(entry.recurso_id, 0) + 1

    items = []
    for recurso, payload in zip(recursos, payloads):
        owner = owners.get(recurso.subido_por)
        last = last_entry.get(recurso.id)
        items.append(
            ModerationItem(
                **payload,
                estado_nombre=by_id.get(recurso.estado_id, ""),
                subido_por_nombre=owner.nombre if owner else None,
                subido_por_email=owner.email if owner else None,
                ultimo_comentario=last.comentario if last else None,
                ultimo_cambio=last.fecha_hora if last else None,
                reenvios=resubmits.get(recurso.id, 0),
            )
        )
    return items


# --- Cola de moderación (Admin) -------------------------------------------------

@router.get("/pending", response_model=list[ModerationItem])
async def pending_resources(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("Admin")),
):
    """Cola de revisión, del más antiguo al más reciente (FIFO)."""
    by_name, _ = await _state_maps(db)
    result = await db.execute(
        select(Recurso).where(Recurso.estado_id == by_name[PENDIENTE]).order_by(Recurso.created_at.asc(), Recurso.id.asc())
    )
    return await _moderation_items(db, list(result.scalars().all()))


@router.post("/bulk-approve", response_model=BulkModerationResult)
async def bulk_approve(
    request: Request,
    data: BulkApproveRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("Admin")),
):
    """Aprueba varios recursos pendientes. Los que no están pendientes se omiten."""
    procesados, omitidos = [], []
    for resource_id in dict.fromkeys(data.ids):
        recurso = await db.get(Recurso, resource_id)
        if recurso is None:
            omitidos.append(resource_id)
            continue
        try:
            await transition(db, recurso, APROBADO, user, data.comentario, commit=False)
        except HTTPException:
            omitidos.append(resource_id)
            continue
        procesados.append(resource_id)
    await db.commit()
    for resource_id in procesados:
        recurso = await db.get(Recurso, resource_id)
        if recurso:
            await _log(db, request, user, "resource_approve", recurso, bulk=True)
    return BulkModerationResult(procesados=procesados, omitidos=omitidos)


@router.patch("/{resource_id}/approve", response_model=RecursoRead)
async def approve_resource(
    request: Request,
    resource_id: int,
    data: ResourceModeration | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("Admin")),
):
    recurso = await transition(db, await _get_resource(db, resource_id), APROBADO, user, data.comentario if data else None)
    await _log(db, request, user, "resource_approve", recurso)
    return await _resource_payload(db, recurso)


@router.patch("/{resource_id}/observe", response_model=RecursoRead)
async def observe_resource(
    request: Request,
    resource_id: int,
    data: ModerationComment,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("Admin")),
):
    recurso = await transition(db, await _get_resource(db, resource_id), OBSERVADO, user, data.comentario.strip())
    await _log(db, request, user, "resource_observe", recurso)
    return await _resource_payload(db, recurso)


@router.patch("/{resource_id}/reject", response_model=RecursoRead)
async def reject_resource(
    request: Request,
    resource_id: int,
    data: ModerationComment,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("Admin")),
):
    recurso = await transition(db, await _get_resource(db, resource_id), RECHAZADO, user, data.comentario.strip())
    await _log(db, request, user, "resource_reject", recurso)
    return await _resource_payload(db, recurso)


# --- Autor (Docente/Admin) ------------------------------------------------------

def _assert_owner_or_admin(recurso: Recurso, user: User) -> None:
    if recurso.subido_por != user.id and user.rol != "Admin":
        # 404 y no 403: no revelar que el recurso existe.
        raise HTTPException(status_code=404, detail="Recurso no encontrado")


@router.get("/mine", response_model=MyResourcesResponse)
async def my_resources(
    estado: str | None = Query(None, description="Pendiente, Aprobado, Observado, Rechazado o Archivado"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("Docente", "Admin")),
):
    by_name, by_id = await _state_maps(db)
    counts_rows = (
        await db.execute(
            select(Recurso.estado_id, func.count(Recurso.id)).where(Recurso.subido_por == user.id).group_by(Recurso.estado_id)
        )
    ).all()
    conteos = {nombre: 0 for nombre in by_name}
    for estado_id, count in counts_rows:
        conteos[by_id.get(estado_id, "Desconocido")] = count

    query = select(Recurso).where(Recurso.subido_por == user.id)
    if estado:
        if estado not in by_name:
            raise HTTPException(status_code=422, detail="Estado desconocido")
        query = query.where(Recurso.estado_id == by_name[estado])
    # Lo que requiere acción del autor (observados) primero, luego lo más reciente.
    observado_id = by_name.get(OBSERVADO, -1)
    query = query.order_by((Recurso.estado_id != observado_id), Recurso.updated_at.desc(), Recurso.id.desc())
    recursos = list((await db.execute(query)).scalars().all())
    return MyResourcesResponse(items=await _moderation_items(db, recursos), conteos=conteos)


@router.get("/{resource_id}/history", response_model=list[HistoryEntry])
async def resource_history(
    resource_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("Docente", "Admin")),
):
    recurso = await _get_resource(db, resource_id)
    _assert_owner_or_admin(recurso, user)
    _, by_id = await _state_maps(db)
    rows = (
        await db.execute(
            select(RecursoEstadoHistorial, User.nombre)
            .outerjoin(User, User.id == RecursoEstadoHistorial.cambiado_por)
            .where(RecursoEstadoHistorial.recurso_id == resource_id)
            .order_by(RecursoEstadoHistorial.fecha_hora.desc(), RecursoEstadoHistorial.id.desc())
        )
    ).all()
    return [
        HistoryEntry(
            id=entry.id,
            estado_anterior=by_id.get(entry.estado_anterior_id) if entry.estado_anterior_id else None,
            estado_nuevo=by_id.get(entry.estado_nuevo_id, ""),
            comentario=entry.comentario,
            cambiado_por_nombre=nombre,
            fecha_hora=entry.fecha_hora,
        )
        for entry, nombre in rows
    ]


@router.post("/{resource_id}/resubmit", response_model=ModerationItem)
async def resubmit_resource(
    request: Request,
    resource_id: int,
    data: ResubmitRequest | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("Docente", "Admin")),
):
    """El autor reenvía a revisión un recurso observado (tras corregirlo)."""
    recurso = await _get_resource(db, resource_id)
    if recurso.subido_por != user.id:
        raise HTTPException(status_code=404, detail="Recurso no encontrado")
    nota = data.nota.strip() if data and data.nota else None
    recurso = await transition(db, recurso, PENDIENTE, user, nota, allowed_from={OBSERVADO})
    await _log(db, request, user, "resource_resubmit", recurso)
    return (await _moderation_items(db, [recurso]))[0]


@router.put("/{resource_id}/file", response_model=RecursoRead)
async def replace_resource_file(
    request: Request,
    resource_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("Docente", "Admin")),
):
    """Reemplaza el PDF de un recurso pendiente u observado (solo su autor)."""
    recurso = await _get_resource(db, resource_id)
    if recurso.subido_por != user.id:
        raise HTTPException(status_code=404, detail="Recurso no encontrado")
    _, by_id = await _state_maps(db)
    if by_id.get(recurso.estado_id) not in OWNER_EDITABLE:
        raise HTTPException(status_code=409, detail="Solo se puede reemplazar el archivo de recursos pendientes u observados.")

    content = await file.read()
    try:
        safe_name = _assert_pdf_upload(file, content)
    except HTTPException as exc:
        await _log_upload_rejected(db, request, user, str(exc.detail), file.filename)
        raise
    await file.seek(0)

    old_key = recurso.url_archivo
    recurso.url_archivo = await s3_service.upload_file(file, safe_filename=safe_name)
    recurso.archivo_size = len(content)
    recurso.archivo_mime = file.content_type or "application/pdf"
    recurso.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.add(recurso)
    await db.commit()
    await db.refresh(recurso)

    if old_key and not old_key.startswith(("http://", "https://")) and old_key != recurso.url_archivo:
        try:
            async with s3_service.session.client(**s3_service.config) as s3:
                await s3.delete_object(Bucket=s3_service.bucket_name, Key=old_key)
        except Exception:
            logger.warning("No se pudo borrar el archivo anterior %s", old_key, exc_info=True)

    await _log(db, request, user, "resource_edit", recurso, action="replace_file")
    return await _resource_payload(db, recurso)


def can_access_unpublished(recurso: Recurso, user: User | None) -> bool:
    return user is not None and user.is_effectively_active and (user.rol == "Admin" or recurso.subido_por == user.id)

