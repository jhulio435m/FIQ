import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func
from sqlmodel import delete, or_, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.resources.crud import _resource_list_payload, _state_id
from app.core.database import get_db, get_read_db
from app.core.dependencies import require_role
from app.core.users import current_active_user
from app.models.community import ReporteRecurso, ValoracionRecurso
from app.models.resource import Recurso
from app.models.user import User
from app.schemas.community import (
    FeaturedResourcesResponse,
    ReportCreate,
    ReportRead,
    ReportUpdate,
    ReviewCreate,
    ReviewRead,
    ReviewsSummary,
)
from app.schemas.resource import RecursoRead

router = APIRouter(redirect_slashes=False)


@router.get("/featured", response_model=FeaturedResourcesResponse)
async def featured_resources(db: AsyncSession = Depends(get_read_db)):
    """Return featured resource carousels: newest, most viewed, and most downloaded."""
    approved_id = await _state_id(db, "Aprobado")

    # 1. Newest
    recent_query = (
        select(Recurso)
        .where(Recurso.estado_id == approved_id)
        .order_by(Recurso.created_at.desc())
        .limit(6)
    )
    recent_res = await db.exec(recent_query)
    recientes = await _resource_list_payload(db, list(recent_res.all()))

    # 2. Most viewed
    viewed_query = (
        select(Recurso)
        .where(Recurso.estado_id == approved_id)
        .order_by(Recurso.visualizaciones.desc(), Recurso.created_at.desc())
        .limit(6)
    )
    viewed_res = await db.exec(viewed_query)
    mas_vistos = await _resource_list_payload(db, list(viewed_res.all()))

    # 3. Most downloaded
    downloaded_query = (
        select(Recurso)
        .where(Recurso.estado_id == approved_id)
        .order_by(Recurso.descargas.desc(), Recurso.created_at.desc())
        .limit(6)
    )
    downloaded_res = await db.exec(downloaded_query)
    mas_descargados = await _resource_list_payload(db, list(downloaded_res.all()))

    return {
        "recientes": recientes,
        "mas_vistos": mas_vistos,
        "mas_descargados": mas_descargados,
    }


@router.get("/reports/pending", response_model=List[ReportRead])
async def list_pending_reports(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("Admin")),
):
    """List pending issue reports (Admin only)."""
    stmt = (
        select(ReporteRecurso, Recurso.titulo, User.email)
        .join(Recurso, Recurso.id == ReporteRecurso.recurso_id)
        .join(User, User.id == ReporteRecurso.usuario_id)
        .where(ReporteRecurso.estado == "pendiente")
        .order_by(ReporteRecurso.created_at.asc())
    )
    result = await db.exec(stmt)
    rows = result.all()
    return [
        {
            "id": r.id,
            "recurso_id": r.recurso_id,
            "recurso_titulo": titulo,
            "usuario_id": r.usuario_id,
            "usuario_email": email,
            "motivo": r.motivo,
            "descripcion": r.descripcion,
            "estado": r.estado,
            "resolucion": r.resolucion,
            "created_at": r.created_at,
            "updated_at": r.updated_at,
        }
        for r, titulo, email in rows
    ]


@router.patch("/reports/{report_id}", response_model=ReportRead)
async def update_report(
    report_id: uuid.UUID,
    payload: ReportUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("Admin")),
):
    """Update report resolution or status (Admin only)."""
    report = await db.get(ReporteRecurso, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")

    report.estado = payload.estado
    if payload.resolucion is not None:
        report.resolucion = payload.resolucion
    report.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)

    await db.commit()
    await db.refresh(report)

    recurso = await db.get(Recurso, report.recurso_id)
    user = await db.get(User, report.usuario_id)

    return {
        "id": report.id,
        "recurso_id": report.recurso_id,
        "recurso_titulo": recurso.titulo if recurso else None,
        "usuario_id": report.usuario_id,
        "usuario_email": user.email if user else None,
        "motivo": report.motivo,
        "descripcion": report.descripcion,
        "estado": report.estado,
        "resolucion": report.resolucion,
        "created_at": report.created_at,
        "updated_at": report.updated_at,
    }


@router.get("/{resource_id}/related", response_model=List[RecursoRead])
async def related_resources(
    resource_id: int,
    db: AsyncSession = Depends(get_read_db),
):
    """Find recommended resources matching course, topic or type."""
    target = await db.get(Recurso, resource_id)
    approved_id = await _state_id(db, "Aprobado")
    if not target or target.estado_id != approved_id:
        raise HTTPException(status_code=404, detail="Recurso no encontrado")

    # Match by course or topics or type, excluding current resource
    conditions = []
    if target.curso_id:
        conditions.append(Recurso.curso_id == target.curso_id)
    if target.temas and target.temas.strip():
        # Look for first theme term
        first_term = target.temas.split(",")[0].strip()
        if len(first_term) > 3:
            conditions.append(Recurso.temas.ilike(f"%{first_term}%"))
    conditions.append(Recurso.tipo_recurso_id == target.tipo_recurso_id)

    query = (
        select(Recurso)
        .where(
            Recurso.id != target.id,
            Recurso.estado_id == approved_id,
            or_(*conditions),
        )
        .order_by(Recurso.visualizaciones.desc(), Recurso.created_at.desc())
        .limit(6)
    )
    result = await db.exec(query)
    return await _resource_list_payload(db, list(result.all()))


@router.get("/{resource_id}/reviews", response_model=ReviewsSummary)
async def get_resource_reviews(
    resource_id: int,
    db: AsyncSession = Depends(get_read_db),
):
    """Get ratings, average score, and reviews for an approved resource."""
    target = await db.get(Recurso, resource_id)
    approved_id = await _state_id(db, "Aprobado")
    if not target or target.estado_id != approved_id:
        raise HTTPException(status_code=404, detail="Recurso no encontrado")

    stmt = (
        select(ValoracionRecurso, User.nombre)
        .join(User, User.id == ValoracionRecurso.usuario_id)
        .where(ValoracionRecurso.recurso_id == resource_id)
        .order_by(ValoracionRecurso.created_at.desc())
    )
    result = await db.exec(stmt)
    rows = result.all()

    total = len(rows)
    promedio = round(sum(r.puntuacion for r, _ in rows) / total, 1) if total > 0 else 0.0

    return {
        "promedio": promedio,
        "total": total,
        "reviews": [
            {
                "id": r.id,
                "recurso_id": r.recurso_id,
                "usuario_id": r.usuario_id,
                "usuario_nombre": nombre,
                "puntuacion": r.puntuacion,
                "comentario": r.comentario,
                "created_at": r.created_at,
                "updated_at": r.updated_at,
            }
            for r, nombre in rows
        ],
    }


@router.post("/{resource_id}/reviews", response_model=ReviewRead)
async def submit_resource_review(
    resource_id: int,
    payload: ReviewCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    """Add or update rating & review for an approved resource."""
    target = await db.get(Recurso, resource_id)
    approved_id = await _state_id(db, "Aprobado")
    if not target or target.estado_id != approved_id:
        raise HTTPException(status_code=404, detail="Recurso no encontrado")

    # Upsert: check if user already reviewed this resource
    existing_stmt = select(ValoracionRecurso).where(
        ValoracionRecurso.recurso_id == resource_id,
        ValoracionRecurso.usuario_id == user.id,
    )
    existing = (await db.exec(existing_stmt)).first()
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    if existing:
        existing.puntuacion = payload.puntuacion
        existing.comentario = payload.comentario
        existing.updated_at = now
        review = existing
    else:
        review = ValoracionRecurso(
            recurso_id=resource_id,
            usuario_id=user.id,
            puntuacion=payload.puntuacion,
            comentario=payload.comentario,
            created_at=now,
            updated_at=now,
        )
        db.add(review)

    await db.commit()
    await db.refresh(review)

    return {
        "id": review.id,
        "recurso_id": review.recurso_id,
        "usuario_id": review.usuario_id,
        "usuario_nombre": user.nombre,
        "puntuacion": review.puntuacion,
        "comentario": review.comentario,
        "created_at": review.created_at,
        "updated_at": review.updated_at,
    }


@router.delete("/{resource_id}/reviews/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_resource_review(
    resource_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    """Delete current user's rating & review for the specified resource."""
    await db.exec(
        delete(ValoracionRecurso).where(
            ValoracionRecurso.recurso_id == resource_id,
            ValoracionRecurso.usuario_id == user.id,
        )
    )
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{resource_id}/reports", response_model=ReportRead, status_code=status.HTTP_201_CREATED)
async def create_resource_report(
    resource_id: int,
    payload: ReportCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    """Report an issue (corrupt file, wrong metadata, duplicate) on a resource."""
    target = await db.get(Recurso, resource_id)
    if not target:
        raise HTTPException(status_code=404, detail="Recurso no encontrado")

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    report = ReporteRecurso(
        recurso_id=resource_id,
        usuario_id=user.id,
        motivo=payload.motivo,
        descripcion=payload.descripcion,
        estado="pendiente",
        created_at=now,
        updated_at=now,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)

    return {
        "id": report.id,
        "recurso_id": report.recurso_id,
        "recurso_titulo": target.titulo,
        "usuario_id": report.usuario_id,
        "usuario_email": user.email,
        "motivo": report.motivo,
        "descripcion": report.descripcion,
        "estado": report.estado,
        "resolucion": report.resolucion,
        "created_at": report.created_at,
        "updated_at": report.updated_at,
    }
