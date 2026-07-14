from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy import cast, Date
from pymongo.errors import PyMongoError


from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import require_role
from app.core.mongo import get_activity_events_collection, get_external_cache_collection
from app.models.resource import Recurso, TipoRecurso, Curso
from app.models.user import User
from app.models.activity import RegistroActividad, TipoActividad

router = APIRouter()


def _require_dashboard_api_key(api_key: str) -> None:
    if not settings.DASHBOARD_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Dashboard API key no configurada",
        )
    if api_key != settings.DASHBOARD_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API Key",
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
    api_key: str = Query(..., description="API Key for PowerBI access"),
    db: AsyncSession = Depends(get_db),
):
    _require_dashboard_api_key(api_key)

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
    api_key: str = Query(..., description="API Key for PowerBI access"),
    db: AsyncSession = Depends(get_db),
):
    _require_dashboard_api_key(api_key)
    
    query = (
        select(
            Recurso.id,
            Recurso.titulo,
            TipoRecurso.nombre.label("tipo"),
            Curso.nombre.label("curso"),
            Recurso.visualizaciones,
            Recurso.descargas,
            Recurso.autores,
            Recurso.anio,
            Recurso.created_at,
            Recurso.subido_por
        )
        .join(TipoRecurso, Recurso.tipo_recurso_id == TipoRecurso.id)
        .outerjoin(Curso, Recurso.curso_id == Curso.id)
    )
    res = await db.execute(query)
    return [
        {
            "id": r.id,
            "titulo": r.titulo,
            "tipo": r.tipo,
            "curso": r.curso or "N/A",
            "visualizaciones": r.visualizaciones,
            "descargas": r.descargas,
            "autores": r.autores or "Anónimo",
            "anio": r.anio,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "subido_por_id": str(r.subido_por)
        }
        for r in res.all()
    ]


@router.get("/public/courses")
async def public_courses(
    api_key: str = Query(..., description="API Key for PowerBI access"),
    db: AsyncSession = Depends(get_db),
):
    _require_dashboard_api_key(api_key)
    
    res = await db.execute(select(Curso))
    courses = res.scalars().all()
    return [
        {
            "id": c.id,
            "nombre": c.nombre,
            "codigo": c.codigo,
            "ciclo": c.ciclo,
            "esta_activo": c.esta_activo
        }
        for c in courses
    ]


@router.get("/public/users")
async def public_users(
    api_key: str = Query(..., description="API Key for PowerBI access"),
    db: AsyncSession = Depends(get_db),
):
    _require_dashboard_api_key(api_key)
    
    res = await db.execute(select(User))
    users = res.scalars().all()
    return [
        {
            "id": str(u.id),
            "nombre": u.nombre,
            "email": u.email,
            "rol": u.rol,
            "is_active": u.is_active,
            "esta_activo": u.esta_activo
        }
        for u in users
    ]


@router.get("/public/activities")
async def public_activities(
    api_key: str = Query(..., description="API Key for PowerBI access"),
    db: AsyncSession = Depends(get_db),
):
    _require_dashboard_api_key(api_key)
    
    query = (
        select(
            RegistroActividad.id,
            RegistroActividad.fecha_hora,
            TipoActividad.nombre.label("tipo"),
            RegistroActividad.usuario_id,
            RegistroActividad.entidad_relacionada_id
        )
        .join(TipoActividad, RegistroActividad.tipo_actividad_id == TipoActividad.id)
        .order_by(RegistroActividad.fecha_hora.desc())
    )
    res = await db.execute(query)
    return [
        {
            "id": a.id,
            "fecha_hora": a.fecha_hora.isoformat() if a.fecha_hora else None,
            "tipo_actividad": a.tipo,
            "usuario_id": str(a.usuario_id),
            "entidad_relacionada_id": str(a.entidad_relacionada_id) if a.entidad_relacionada_id else None
        }
        for a in res.all()
    ]


@router.get("/public/document-metrics")
async def public_document_metrics(
    api_key: str = Query(..., description="API Key for PowerBI access"),
    limit: int = Query(25, ge=1, le=100),
):
    _require_dashboard_api_key(api_key)

    activity_collection = get_activity_events_collection()
    cache_collection = get_external_cache_collection()
    if activity_collection is None or cache_collection is None:
        return {
            "mongo_enabled": False,
            "activity_events": {
                "total": 0,
                "by_type": [],
                "by_date": [],
            },
            "external_catalog_cache": {
                "total": 0,
                "by_kind": [],
                "recent": [],
            },
        }

    try:
        activity_total = await activity_collection.count_documents({})
        by_type_cursor = activity_collection.aggregate(
            [
                {"$group": {"_id": "$tipo_actividad", "cantidad": {"$sum": 1}}},
                {"$sort": {"cantidad": -1}},
                {"$limit": limit},
            ]
        )
        by_date_cursor = activity_collection.aggregate(
            [
                {
                    "$group": {
                        "_id": {
                            "$dateToString": {
                                "format": "%Y-%m-%d",
                                "date": "$occurred_at",
                            }
                        },
                        "cantidad": {"$sum": 1},
                    }
                },
                {"$sort": {"_id": -1}},
                {"$limit": limit},
            ]
        )

        cache_total = await cache_collection.count_documents({})
        by_kind_cursor = cache_collection.aggregate(
            [
                {"$group": {"_id": "$kind", "cantidad": {"$sum": 1}}},
                {"$sort": {"cantidad": -1}},
            ]
        )
        recent_cursor = (
            cache_collection.find(
                {},
                {
                    "_id": 0,
                    "kind": 1,
                    "params": 1,
                    "created_at": 1,
                    "expires_at": 1,
                },
            )
            .sort("created_at", -1)
            .limit(limit)
        )

        by_type = await by_type_cursor.to_list(length=limit)
        by_date = await by_date_cursor.to_list(length=limit)
        by_kind = await by_kind_cursor.to_list(length=limit)
        recent_cache = await recent_cursor.to_list(length=limit)
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No se pudo consultar MongoDB para Power BI",
        ) from exc

    return {
        "mongo_enabled": True,
        "activity_events": {
            "total": activity_total,
            "by_type": [
                {
                    "tipo_actividad": item.get("_id") or "desconocido",
                    "cantidad": item["cantidad"],
                }
                for item in by_type
            ],
            "by_date": [
                {
                    "fecha": item["_id"],
                    "cantidad": item["cantidad"],
                }
                for item in by_date
            ],
        },
        "external_catalog_cache": {
            "total": cache_total,
            "by_kind": [
                {
                    "tipo_busqueda": item.get("_id") or "desconocido",
                    "cantidad": item["cantidad"],
                }
                for item in by_kind
            ],
            "recent": [
                {
                    "kind": item.get("kind"),
                    "params": item.get("params", {}),
                    "created_at": item["created_at"].isoformat() if item.get("created_at") else None,
                    "expires_at": item["expires_at"].isoformat() if item.get("expires_at") else None,
                }
                for item in recent_cache
            ],
        },
    }
