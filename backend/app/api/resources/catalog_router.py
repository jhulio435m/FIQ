from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, or_
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional
from app.core.database import get_read_db
from app.core.sharding import encode_resource_id, resource_session, resource_sharding_enabled, resource_shard_count, resource_shard_index
from app.models.resource import Curso, Recurso, TipoRecurso
from app.schemas.resource import ResourceCatalogPage, RecursoRead, TipoRecursoRead
from app.api.resources.crud import _state_id, _resource_payload, _resource_list_payload
from app.api.bibliography.models import ArchivoBibliografico, EdicionBibliografica
from app.api.resources.operations import (
    CatalogSort,
    _add_bibliography_summary,
    _catalog_conditions,
    _catalog_order,
    _group_catalog_rows,
    _sort_sharded_rows
)

router = APIRouter(redirect_slashes=False)

@router.get("/types", response_model=List[TipoRecursoRead])
async def list_types(db: AsyncSession = Depends(get_read_db)):
    result = await db.exec(select(TipoRecurso))
    return result.all()



@router.get("/courses")
async def list_courses(db: AsyncSession = Depends(get_read_db)):
    result = await db.exec(select(Curso).where(Curso.esta_activo.is_(True)).order_by(Curso.nombre))
    return result.all()



@router.get("/catalog", response_model=ResourceCatalogPage)
async def catalog_resources(
    search: Optional[str] = Query(default=None, max_length=200),
    tipo_recurso_id: Optional[int] = Query(default=None, gt=0),
    curso_id: Optional[int] = Query(default=None, gt=0),
    sort: CatalogSort = "recent",
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_read_db),
):
    if resource_sharding_enabled():
        shard_indexes = (
            [resource_shard_index(curso_id)]
            if curso_id
            else list(range(resource_shard_count()))
        )
        rows: list[tuple[int, Recurso]] = []
        for shard_index in shard_indexes:
            async with resource_session(shard_index, read=True) as shard_db:
                approved_id = await _state_id(shard_db, "Aprobado")
                conditions = _catalog_conditions(
                    approved_id,
                    search,
                    tipo_recurso_id,
                    curso_id,
                )
                result = await shard_db.exec(
                    select(Recurso)
                    .where(*conditions)
                    .order_by(*_catalog_order(sort))
                )
                rows.extend((shard_index, resource) for resource in result.all())

        _sort_sharded_rows(rows, sort)
        rows = await _group_catalog_rows(db, rows)
        total = len(rows)
        page = rows[skip : skip + limit]
        items: list[dict] = []
        for shard_index, resource in page:
            async with resource_session(shard_index, read=True) as shard_db:
                public_id = encode_resource_id(shard_index, resource.id)
                payload = await _resource_payload(
                    shard_db,
                    resource,
                    public_id=public_id,
                )
                items.append(await _add_bibliography_summary(db, payload, public_id))
        return {
            "items": items,
            "total": total,
            "skip": skip,
            "limit": limit,
            "has_more": skip + len(items) < total,
        }

    approved_id = await _state_id(db, "Aprobado")
    conditions = _catalog_conditions(
        approved_id,
        search,
        tipo_recurso_id,
        curso_id,
    )
    bibliography_links = (
        select(
            ArchivoBibliografico.recurso_id.label("resource_id"),
            EdicionBibliografica.obra_id.label("obra_id"),
        )
        .join(EdicionBibliografica, EdicionBibliografica.id == ArchivoBibliografico.edicion_id)
        .subquery()
    )
    unlinked_resource = case((bibliography_links.c.resource_id.is_(None), Recurso.id), else_=None)
    ranked = (
        select(
            Recurso.id.label("resource_id"),
            func.row_number()
            .over(
                partition_by=(bibliography_links.c.obra_id, unlinked_resource),
                order_by=_catalog_order(sort),
            ).label("group_rank"),
        )
        .outerjoin(bibliography_links, bibliography_links.c.resource_id == Recurso.id)
        .where(*conditions)
        .subquery()
    )
    representatives = select(ranked.c.resource_id).where(ranked.c.group_rank == 1).subquery()
    total = int(
        (await db.exec(select(func.count()).select_from(representatives))).one()
    )
    result = await db.exec(
        select(Recurso)
        .join(representatives, representatives.c.resource_id == Recurso.id)
        .order_by(*_catalog_order(sort))
        .offset(skip)
        .limit(limit)
    )
    resources = list(result.all())
    items = await _resource_list_payload(db, resources, search=search)
    for item in items:
        await _add_bibliography_summary(db, item, item["id"])
    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit,
        "has_more": skip + len(items) < total,
    }



@router.get("", response_model=List[RecursoRead])
@router.get("/", response_model=List[RecursoRead])
async def search_resources(
    search: Optional[str] = None,
    tipo_recurso_id: Optional[int] = None,
    curso_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_read_db),
):
    if resource_sharding_enabled():
        shard_indexes = (
            [resource_shard_index(curso_id)]
            if curso_id
            else list(range(resource_shard_count()))
        )
        rows: list[tuple[int, Recurso]] = []
        for shard_index in shard_indexes:
            async with resource_session(shard_index, read=True) as shard_db:
                approved_id = await _state_id(shard_db, "Aprobado")
                query = select(Recurso).where(Recurso.estado_id == approved_id)
                if search:
                    pattern = f"%{search.strip()}%"
                    query = query.where(or_(
                        Recurso.titulo.ilike(pattern),
                        Recurso.resumen.ilike(pattern),
                        Recurso.autores.ilike(pattern),
                        Recurso.editorial.ilike(pattern),
                        Recurso.doi.ilike(pattern),
                        Recurso.isbn.ilike(pattern),
                        Recurso.temas.ilike(pattern),
                        Recurso.contenido_texto.ilike(pattern),
                        Recurso.curso_id.in_(select(Curso.id).where(Curso.nombre.ilike(pattern))),
                        Recurso.tipo_recurso_id.in_(select(TipoRecurso.id).where(TipoRecurso.nombre.ilike(pattern))),
                    ))
                if tipo_recurso_id:
                    query = query.where(Recurso.tipo_recurso_id == tipo_recurso_id)
                if curso_id:
                    query = query.where(Recurso.curso_id == curso_id)
                result = await shard_db.exec(
                    query.order_by(Recurso.created_at.desc()).limit(skip + limit)
                )
                rows.extend((shard_index, recurso) for recurso in result.all())

        rows.sort(key=lambda item: item[1].created_at, reverse=True)
        page = rows[skip : skip + limit]
        payload: list[dict] = []
        for shard_index, recurso in page:
            async with resource_session(shard_index, read=True) as shard_db:
                payload.append(
                    await _resource_payload(
                        shard_db,
                        recurso,
                        public_id=encode_resource_id(shard_index, recurso.id),
                        search=search,
                    )
                )
        return payload

    approved_id = await _state_id(db, "Aprobado")
    query = select(Recurso).where(Recurso.estado_id == approved_id)
    if search:
        pattern = f"%{search.strip()}%"
        query = query.where(or_(
            Recurso.titulo.ilike(pattern),
            Recurso.resumen.ilike(pattern),
            Recurso.autores.ilike(pattern),
            Recurso.editorial.ilike(pattern),
            Recurso.doi.ilike(pattern),
            Recurso.isbn.ilike(pattern),
            Recurso.temas.ilike(pattern),
            Recurso.contenido_texto.ilike(pattern),
            Recurso.curso_id.in_(select(Curso.id).where(Curso.nombre.ilike(pattern))),
            Recurso.tipo_recurso_id.in_(select(TipoRecurso.id).where(TipoRecurso.nombre.ilike(pattern))),
        ))
    if tipo_recurso_id:
        query = query.where(Recurso.tipo_recurso_id == tipo_recurso_id)
    if curso_id:
        query = query.where(Recurso.curso_id == curso_id)
    
    result = await db.exec(query.order_by(Recurso.created_at.desc()).offset(skip).limit(limit))
    return await _resource_list_payload(db, list(result.all()), search=search)
