from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import func, or_, update
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import Literal
from urllib.parse import quote, urlparse
from app.core.sharding import encode_resource_id, resource_id_candidates, resource_session, resource_sharding_enabled
from app.core.s3 import s3_service
from app.models.resource import Curso, Recurso, TipoRecurso
from app.api.resources.crud import _state_id
from app.api.bibliography.service import bibliography_summary, resource_group_keys

CatalogSort = Literal["recent", "title", "views", "downloads"]



ALLOWED_EXTERNAL_SOURCES = {
    "open_library",
    "internet_archive",
    "crossref",
    "openalex",
    "unpaywall",
}



def _normalize_doi(value: str | None) -> str | None:
    if not value or not value.strip():
        return None
    normalized = value.strip().lower()
    for prefix in ("https://doi.org/", "http://doi.org/", "doi:"):
        if normalized.startswith(prefix):
            normalized = normalized.removeprefix(prefix).strip()
    return normalized[:100] or None



def _normalize_isbn(value: str | None) -> str | None:
    if not value:
        return None
    normalized = "".join(character for character in value.upper() if character.isdigit() or character == "X")
    return normalized[:32] or None



def _safe_external_url(value: str | None) -> str | None:
    if not value:
        return None
    candidate = value.strip()[:500]
    parsed = urlparse(candidate)
    if parsed.scheme != "https" or not parsed.hostname:
        return None
    return candidate



def _external_duplicate_filter(
    doi: str | None,
    isbn: str | None,
    source: str,
    external_id: str,
):
    candidates = [
        (Recurso.fuente_externa == source) & (Recurso.external_id == external_id),
    ]
    if doi:
        candidates.append(func.lower(Recurso.doi) == doi)
    if isbn:
        candidates.append(Recurso.isbn == isbn)
    return or_(*candidates)



def _catalog_conditions(
    approved_id: int,
    search: str | None,
    tipo_recurso_id: int | None,
    curso_id: int | None,
):
    conditions = [Recurso.estado_id == approved_id]
    if search and search.strip():
        pattern = f"%{search.strip()}%"
        conditions.append(or_(
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
        conditions.append(Recurso.tipo_recurso_id == tipo_recurso_id)
    if curso_id:
        conditions.append(Recurso.curso_id == curso_id)
    return conditions



def _catalog_order(sort: CatalogSort):
    if sort == "title":
        return (func.lower(Recurso.titulo).asc(), Recurso.created_at.desc())
    if sort == "views":
        return (Recurso.visualizaciones.desc(), Recurso.created_at.desc())
    if sort == "downloads":
        return (Recurso.descargas.desc(), Recurso.created_at.desc())
    return (Recurso.created_at.desc(),)



def _sort_sharded_rows(rows: list[tuple[int, Recurso]], sort: CatalogSort) -> None:
    rows.sort(key=lambda item: item[1].created_at, reverse=True)
    if sort == "title":
        rows.sort(key=lambda item: item[1].titulo.casefold())
    elif sort == "views":
        rows.sort(key=lambda item: item[1].visualizaciones, reverse=True)
    elif sort == "downloads":
        rows.sort(key=lambda item: item[1].descargas, reverse=True)



async def _group_catalog_rows(
    db: AsyncSession,
    rows: list[tuple[int, Recurso]],
) -> list[tuple[int, Recurso]]:
    public_ids = [
        encode_resource_id(shard_index, resource.id) if resource_sharding_enabled() else resource.id
        for shard_index, resource in rows
    ]
    group_keys = await resource_group_keys(db, [item for item in public_ids if item is not None])
    seen: set[object] = set()
    grouped: list[tuple[int, Recurso]] = []
    for row, public_id in zip(rows, public_ids, strict=True):
        key: object = group_keys.get(public_id, ("resource", public_id))
        if key in seen:
            continue
        seen.add(key)
        grouped.append(row)
    return grouped



async def _add_bibliography_summary(db: AsyncSession, payload: dict, resource_id: int) -> dict:
    summary = await bibliography_summary(db, resource_id, only_approved=True)
    if summary:
        payload.update(summary)
    elif not payload.get("formatos_disponibles"):
        mime_type = str(payload.get("archivo_mime") or "")
        payload["formatos_disponibles"] = ["ENLACE" if mime_type == "text/html" else "PDF"]
    return payload



async def _require_approved_resource(db: AsyncSession, resource: Recurso) -> None:
    approved_id = await _state_id(db, "Aprobado")
    if resource.estado_id != approved_id:
        raise HTTPException(status_code=404, detail="Recurso no encontrado")



async def _increment_resource_counter(
    db: AsyncSession,
    resource: Recurso,
    field: Literal["visualizaciones", "descargas"],
) -> None:
    column = getattr(Recurso, field)
    await db.exec(
        update(Recurso)
        .where(Recurso.id == resource.id)
        .values({field: column + 1})
    )
    await db.commit()
    await db.refresh(resource)



async def _resource_stream_response(resource: Recurso) -> StreamingResponse:
    client_context = s3_service.session.client(**s3_service.config)
    s3 = await client_context.__aenter__()
    try:
        obj = await s3.get_object(Bucket=s3_service.bucket_name, Key=resource.url_archivo)
    except Exception as exc:
        await client_context.__aexit__(type(exc), exc, exc.__traceback__)
        raise HTTPException(status_code=404, detail="Archivo no encontrado") from exc

    body = obj["Body"]

    async def chunks():
        try:
            while chunk := await body.read(64 * 1024):
                yield chunk
        finally:
            body.close()
            await client_context.__aexit__(None, None, None)

    filename = quote(resource.url_archivo.rsplit("/", 1)[-1])
    headers = {
        "Content-Disposition": f'inline; filename="{filename}"',
        "Cache-Control": "private, max-age=300",
    }
    content_length = obj.get("ContentLength")
    if content_length is not None:
        headers["Content-Length"] = str(content_length)
    return StreamingResponse(
        chunks(),
        media_type=resource.archivo_mime or "application/pdf",
        headers=headers,
    )



async def _with_resource_from_shards(resource_id: int, handler, *, read: bool = False):
    for shard_index, local_id in resource_id_candidates(resource_id):
        async with resource_session(shard_index, read=read) as shard_db:
            recurso = await shard_db.get(Recurso, local_id)
            if recurso:
                return await handler(shard_index, local_id, recurso, shard_db)
    raise HTTPException(status_code=404, detail="Recurso no encontrado")
