from typing import Any
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession
from pymongo.errors import PyMongoError
from fastapi import HTTPException, status

from app.core.mongo import get_activity_events_collection, get_external_cache_collection
from app.models.resource import Recurso, TipoRecurso, Curso
from app.models.user import User
from app.models.activity import RegistroActividad, TipoActividad

_MISSING = object()

def _date_yyyymmdd(value: Any) -> str | None:
    if value is None:
        return None
    return value.strftime("%Y%m%d")

async def _summary_rows(db: AsyncSession) -> list[dict[str, int | str]]:
    total_resources_res = await db.execute(select(func.count(Recurso.id)))
    total_courses_res = await db.execute(select(func.count(Curso.id)))
    total_users_res = await db.execute(select(func.count(User.id)))
    total_views_res = await db.execute(select(func.sum(Recurso.visualizaciones)))
    total_downloads_res = await db.execute(select(func.sum(Recurso.descargas)))

    return [
        {"metric": "total_resources", "value": total_resources_res.scalar_one()},
        {"metric": "total_courses", "value": total_courses_res.scalar_one()},
        {"metric": "total_users", "value": total_users_res.scalar_one()},
        {"metric": "total_views", "value": total_views_res.scalar_one() or 0},
        {"metric": "total_downloads", "value": total_downloads_res.scalar_one() or 0},
    ]


async def _resource_rows(db: AsyncSession) -> list[dict[str, Any]]:
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
            Recurso.subido_por,
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
            "created_date": _date_yyyymmdd(r.created_at) if r.created_at else None,
            "subido_por_id": str(r.subido_por),
        }
        for r in res.all()
    ]


async def _course_rows(db: AsyncSession) -> list[dict[str, Any]]:
    res = await db.execute(select(Curso))
    courses = res.scalars().all()
    return [
        {
            "id": c.id,
            "nombre": c.nombre,
            "codigo": c.codigo,
            "ciclo": c.ciclo,
            "esta_activo": c.esta_activo,
        }
        for c in courses
    ]


async def _user_rows(db: AsyncSession) -> list[dict[str, Any]]:
    res = await db.execute(select(User))
    users = res.scalars().all()
    return [
        {
            "id": str(u.id),
            "nombre": u.nombre,
            "rol": u.rol,
            "is_active": u.is_active,
            "esta_activo": u.esta_activo,
        }
        for u in users
    ]


async def _activity_rows(db: AsyncSession) -> list[dict[str, Any]]:
    query = (
        select(
            RegistroActividad.id,
            RegistroActividad.fecha_hora,
            TipoActividad.nombre.label("tipo"),
            RegistroActividad.usuario_id,
            RegistroActividad.entidad_relacionada_id,
        )
        .join(TipoActividad, RegistroActividad.tipo_actividad_id == TipoActividad.id)
        .order_by(RegistroActividad.fecha_hora.desc())
    )
    res = await db.execute(query)
    return [
        {
            "id": a.id,
            "fecha": _date_yyyymmdd(a.fecha_hora) if a.fecha_hora else None,
            "fecha_hora": a.fecha_hora.isoformat() if a.fecha_hora else None,
            "tipo_actividad": a.tipo,
            "usuario_id": str(a.usuario_id),
            "entidad_relacionada_id": str(a.entidad_relacionada_id) if a.entidad_relacionada_id else None,
            "cantidad": 1,
        }
        for a in res.all()
    ]


async def _document_metrics_payload(
    limit: int,
    activity_collection: Any = _MISSING,
    cache_collection: Any = _MISSING,
) -> dict[str, Any]:
    if activity_collection is _MISSING:
        activity_collection = get_activity_events_collection()
    if cache_collection is _MISSING:
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
            detail="No se pudo consultar MongoDB para dashboards externos",
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
                    "created_date": _date_yyyymmdd(item.get("created_at")),
                    "expires_at": item["expires_at"].isoformat() if item.get("expires_at") else None,
                }
                for item in recent_cache
            ],
        },
    }
