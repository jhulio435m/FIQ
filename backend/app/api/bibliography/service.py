from datetime import datetime, timezone
import re
import uuid

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.bibliography.models import (
    ArchivoBibliografico,
    EdicionBibliografica,
    EdicionISBN,
    ObraBibliografica,
)
from app.api.resources.crud import _state_id
from app.core.sharding import resource_id_candidates, resource_session, resource_sharding_enabled
from app.models.resource import Recurso


def _format_from_mime(mime_type: str) -> str:
    normalized = mime_type.lower()
    if normalized == "application/pdf":
        return "PDF"
    if normalized in {"application/epub+zip", "application/epub"}:
        return "EPUB"
    if normalized == "text/html":
        return "ENLACE"
    suffix = normalized.rsplit("/", 1)[-1].upper()
    return re.sub(r"[^A-Z0-9+.-]", "", suffix)[:20] or "ARCHIVO"


async def is_approved_resource(db: AsyncSession, resource_id: int) -> bool:
    if resource_sharding_enabled():
        for shard_index, local_id in resource_id_candidates(resource_id):
            async with resource_session(shard_index, read=True) as shard_db:
                resource = await shard_db.get(Recurso, local_id)
                if resource:
                    return resource.estado_id == await _state_id(shard_db, "Aprobado")
        return False
    resource = await db.get(Recurso, resource_id)
    return bool(resource and resource.estado_id == await _state_id(db, "Aprobado"))


async def ensure_resource_bibliography(
    db: AsyncSession,
    resource_id: int,
    resource: Recurso,
) -> ArchivoBibliografico:
    existing = await db.exec(
        select(ArchivoBibliografico).where(ArchivoBibliografico.recurso_id == resource_id)
    )
    linked_file = existing.first()
    if linked_file:
        return linked_file

    edition: EdicionBibliografica | None = None
    if resource.doi:
        doi_result = await db.exec(
            select(EdicionBibliografica).where(EdicionBibliografica.doi == resource.doi.lower())
        )
        edition = doi_result.first()
    if edition is None and resource.isbn:
        isbn_result = await db.exec(
            select(EdicionBibliografica)
            .join(EdicionISBN, EdicionISBN.edicion_id == EdicionBibliografica.id)
            .where(EdicionISBN.isbn == resource.isbn)
        )
        edition = isbn_result.first()

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if edition is None:
        work = ObraBibliografica(
            titulo_canonico=resource.titulo,
            resumen=resource.resumen,
            autores=resource.autores,
            temas=resource.temas,
            idioma=resource.idioma,
            created_at=now,
            updated_at=now,
        )
        db.add(work)
        await db.flush()
        edition = EdicionBibliografica(
            obra_id=work.id,
            titulo=resource.titulo,
            editorial=resource.editorial,
            anio=resource.anio,
            idioma=resource.idioma,
            doi=resource.doi.lower() if resource.doi else None,
            created_at=now,
            updated_at=now,
        )
        db.add(edition)
        await db.flush()

    if resource.isbn:
        isbn_result = await db.exec(select(EdicionISBN).where(EdicionISBN.isbn == resource.isbn))
        if isbn_result.first() is None:
            db.add(EdicionISBN(edicion_id=edition.id, isbn=resource.isbn))

    linked_file = ArchivoBibliografico(
        edicion_id=edition.id,
        recurso_id=resource_id,
        formato=_format_from_mime(resource.archivo_mime),
        mime_type=resource.archivo_mime,
        tamano=resource.archivo_size,
        created_at=now,
    )
    db.add(linked_file)
    await db.commit()
    await db.refresh(linked_file)
    return linked_file


async def resource_group_keys(
    db: AsyncSession,
    resource_ids: list[int],
) -> dict[int, uuid.UUID]:
    if not resource_ids:
        return {}
    result = await db.exec(
        select(ArchivoBibliografico.recurso_id, EdicionBibliografica.obra_id)
        .join(EdicionBibliografica, EdicionBibliografica.id == ArchivoBibliografico.edicion_id)
        .where(ArchivoBibliografico.recurso_id.in_(resource_ids))
    )
    return {resource_id: work_id for resource_id, work_id in result.all()}


async def bibliography_summary(
    db: AsyncSession,
    resource_id: int,
    *,
    only_approved: bool = False,
) -> dict | None:
    result = await db.exec(
        select(ArchivoBibliografico, EdicionBibliografica)
        .join(EdicionBibliografica, EdicionBibliografica.id == ArchivoBibliografico.edicion_id)
        .where(ArchivoBibliografico.recurso_id == resource_id)
    )
    row = result.first()
    if not row:
        return None
    linked_file, edition = row
    editions_result = await db.exec(
        select(EdicionBibliografica).where(EdicionBibliografica.obra_id == edition.obra_id)
    )
    editions = list(editions_result.all())
    edition_ids = [item.id for item in editions]
    files_result = await db.exec(
        select(ArchivoBibliografico).where(ArchivoBibliografico.edicion_id.in_(edition_ids))
    )
    files = list(files_result.all())
    if only_approved:
        files = [item for item in files if await is_approved_resource(db, item.recurso_id)]
        visible_edition_ids = {item.edicion_id for item in files}
        editions = [item for item in editions if item.id in visible_edition_ids]
    return {
        "obra_id": edition.obra_id,
        "edicion_id": edition.id,
        "ediciones_disponibles": len(editions),
        "archivos_disponibles": len(files),
        "formatos_disponibles": sorted({item.formato for item in files}),
    }
