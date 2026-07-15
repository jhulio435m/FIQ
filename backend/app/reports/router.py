import json
from typing import Any

from fastapi import APIRouter, Depends, Query, HTTPException, status, Header
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy import cast, Date

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import require_role
from app.core.mongo import get_activity_events_collection, get_external_cache_collection
from app.models.resource import Recurso, TipoRecurso, Curso
from app.models.user import User
from app.models.activity import RegistroActividad, TipoActividad
from app.reports.schemas import LOOKER_STUDIO_SCHEMAS
from app.reports.queries import (
    _summary_rows,
    _resource_rows,
    _course_rows,
    _user_rows,
    _activity_rows,
    _document_metrics_payload as _queries_document_metrics_payload,
    _date_yyyymmdd
)

router = APIRouter()

async def _require_dashboard_api_key(
    x_api_key: str | None = Header(None, alias="X-API-Key"),
    api_key: str | None = Query(None),
) -> str:
    if not settings.DASHBOARD_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Dashboard API key no configurada",
        )
    provided_key = x_api_key or api_key
    if provided_key != settings.DASHBOARD_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API Key",
        )
    return provided_key


async def _document_metrics_payload(limit: int) -> dict[str, Any]:
    return await _queries_document_metrics_payload(
        limit,
        activity_collection=get_activity_events_collection(),
        cache_collection=get_external_cache_collection(),
    )

@router.get("/most-viewed")
async def most_viewed(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("Admin")),
):
    result = await db.execute(
        select(Recurso)
        .order_by(Recurso.visualizaciones.desc())
        .limit(10)
    )
    resources = result.scalars().all()
    return [
        {
            "id": r.id,
            "titulo": r.titulo,
            "visualizaciones": r.visualizaciones,
            "descargas": r.descargas,
        }
        for r in resources
    ]


@router.get("/labs-usage")
async def labs_usage(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("Admin")),
):
    # Fix the activity type name to match actual production logs
    lab_access_res = await db.execute(
        select(TipoActividad).where(TipoActividad.nombre == "lab_access")
    )
    lab_access = lab_access_res.scalar_one_or_none()

    if not lab_access:
        return {"total": 0}

    count_res = await db.execute(
        select(func.count(RegistroActividad.id))
        .where(RegistroActividad.tipo_actividad_id == lab_access.id)
    )
    total = count_res.scalar_one()
    return {"total_accesos_laboratorios": total}


@router.get("/public/dashboard-data")
async def public_dashboard_data(
    _: str = Depends(_require_dashboard_api_key),
    db: AsyncSession = Depends(get_db),
):

    # 1. Counts for Summary Cards
    total_resources_res = await db.execute(select(func.count(Recurso.id)))
    total_resources = total_resources_res.scalar_one()

    total_courses_res = await db.execute(select(func.count(Curso.id)))
    total_courses = total_courses_res.scalar_one()

    total_users_res = await db.execute(select(func.count(User.id)))
    total_users = total_users_res.scalar_one()

    total_views_res = await db.execute(select(func.sum(Recurso.visualizaciones)))
    total_views = total_views_res.scalar_one() or 0

    total_downloads_res = await db.execute(select(func.sum(Recurso.descargas)))
    total_downloads = total_downloads_res.scalar_one() or 0

    # 2. Detailed resources list (with Type and Course names)
    resources_query = (
        select(
            Recurso.id,
            Recurso.titulo,
            TipoRecurso.nombre.label("tipo"),
            Curso.nombre.label("curso"),
            Recurso.visualizaciones,
            Recurso.descargas,
            Recurso.autores,
            Recurso.anio,
            Recurso.created_at
        )
        .join(TipoRecurso, Recurso.tipo_recurso_id == TipoRecurso.id)
        .outerjoin(Curso, Recurso.curso_id == Curso.id)
    )
    resources_res = await db.execute(resources_query)
    resources_list = [
        {
            "id": r.id,
            "titulo": r.titulo,
            "tipo": r.tipo,
            "curso": r.curso or "N/A",
            "visualizaciones": r.visualizaciones,
            "descargas": r.descargas,
            "autores": r.autores or "Anónimo",
            "anio": r.anio,
            "created_at": r.created_at.isoformat() if r.created_at else None
        }
        for r in resources_res.all()
    ]

    # 3. Activities by date and type
    activities_query = (
        select(
            cast(RegistroActividad.fecha_hora, Date).label("fecha"),
            TipoActividad.nombre.label("tipo_actividad"),
            func.count(RegistroActividad.id).label("cantidad")
        )
        .join(TipoActividad, RegistroActividad.tipo_actividad_id == TipoActividad.id)
        .group_by(
            cast(RegistroActividad.fecha_hora, Date),
            TipoActividad.nombre
        )
        .order_by(
            cast(RegistroActividad.fecha_hora, Date).desc()
        )
    )
    activities_res = await db.execute(activities_query)
    activities_list = [
        {
            "fecha": str(a.fecha),
            "tipo_actividad": a.tipo_actividad,
            "cantidad": a.cantidad
        }
        for a in activities_res.all()
    ]

    return {
        "summary": {
            "total_resources": total_resources,
            "total_courses": total_courses,
            "total_users": total_users,
            "total_views": total_views,
            "total_downloads": total_downloads
        },
        "resources": resources_list,
        "activities": activities_list
    }


@router.get("/public/resources")
async def public_resources(
    _: str = Depends(_require_dashboard_api_key),
    db: AsyncSession = Depends(get_db),
):
    return await _resource_rows(db)


@router.get("/public/courses")
async def public_courses(
    _: str = Depends(_require_dashboard_api_key),
    db: AsyncSession = Depends(get_db),
):
    return await _course_rows(db)


@router.get("/public/users")
async def public_users(
    _: str = Depends(_require_dashboard_api_key),
    db: AsyncSession = Depends(get_db),
):
    return await _user_rows(db)


@router.get("/public/activities")
async def public_activities(
    _: str = Depends(_require_dashboard_api_key),
    db: AsyncSession = Depends(get_db),
):
    return await _activity_rows(db)


@router.get("/public/document-metrics")
async def public_document_metrics(
    _: str = Depends(_require_dashboard_api_key),
    limit: int = Query(25, ge=1, le=100),
):
    return await _document_metrics_payload(limit)


@router.get("/public/looker-studio/tables")
async def public_looker_studio_tables(
    _: str = Depends(_require_dashboard_api_key),
):
    return {
        "tables": [
            {"name": table_name, "fields": fields}
            for table_name, fields in LOOKER_STUDIO_SCHEMAS.items()
        ]
    }


@router.get("/public/looker-studio/schema/{table_name}")
async def public_looker_studio_schema(
    table_name: str,
    _: str = Depends(_require_dashboard_api_key),
):
    fields = LOOKER_STUDIO_SCHEMAS.get(table_name)
    if fields is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unknown Looker Studio table",
        )
    return {"table": table_name, "fields": fields}


@router.get("/public/looker-studio/data/{table_name}")
async def public_looker_studio_data(
    table_name: str,
    _: str = Depends(_require_dashboard_api_key),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):

    if table_name == "summary":
        return {"table": table_name, "rows": await _summary_rows(db)}
    if table_name == "resources":
        return {"table": table_name, "rows": await _resource_rows(db)}
    if table_name == "courses":
        return {"table": table_name, "rows": await _course_rows(db)}
    if table_name == "users":
        return {"table": table_name, "rows": await _user_rows(db)}
    if table_name == "activities":
        return {"table": table_name, "rows": await _activity_rows(db)}

    document_metrics = await _document_metrics_payload(limit)
    if table_name == "document_activity_by_type":
        return {
            "table": table_name,
            "rows": document_metrics["activity_events"]["by_type"],
        }
    if table_name == "document_activity_by_date":
        rows = [
            {"fecha": row["fecha"].replace("-", ""), "cantidad": row["cantidad"]}
            for row in document_metrics["activity_events"]["by_date"]
        ]
        return {"table": table_name, "rows": rows}
    if table_name == "external_cache_by_kind":
        return {
            "table": table_name,
            "rows": document_metrics["external_catalog_cache"]["by_kind"],
        }
    if table_name == "external_cache_recent":
        rows = [
            {
                "kind": row["kind"],
                "params": json.dumps(row["params"], ensure_ascii=False, sort_keys=True),
                "created_date": row.get("created_date"),
                "created_at": row["created_at"],
                "expires_at": row["expires_at"],
            }
            for row in document_metrics["external_catalog_cache"]["recent"]
        ]
        return {"table": table_name, "rows": rows}

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Unknown Looker Studio table",
    )
