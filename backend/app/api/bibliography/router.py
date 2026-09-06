import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.bibliography.models import (
    ArchivoBibliografico,
    EdicionBibliografica,
    EdicionISBN,
    ObraBibliografica,
)
from app.api.bibliography.schemas import MergeWorksResponse, ResourceBibliographySummary, WorkRead
from app.api.bibliography.service import (
    bibliography_summary,
    ensure_resource_bibliography,
    is_approved_resource,
)
from app.core.database import get_db, get_read_db
from app.core.dependencies import require_role
from app.core.sharding import resource_id_candidates, resource_session, resource_sharding_enabled
from app.models.resource import Recurso
from app.models.user import User


router = APIRouter()


async def _work_payload(db: AsyncSession, work: ObraBibliografica) -> dict:
    editions_result = await db.exec(
        select(EdicionBibliografica)
        .where(EdicionBibliografica.obra_id == work.id)
        .order_by(EdicionBibliografica.anio.desc(), EdicionBibliografica.created_at)
    )
    editions_payload = []
    for edition in editions_result.all():
        isbn_result = await db.exec(
            select(EdicionISBN.isbn).where(EdicionISBN.edicion_id == edition.id).order_by(EdicionISBN.isbn)
        )
        files_result = await db.exec(
            select(ArchivoBibliografico)
            .where(ArchivoBibliografico.edicion_id == edition.id)
            .order_by(ArchivoBibliografico.formato, ArchivoBibliografico.created_at)
        )
        public_files = [
            item for item in files_result.all()
            if await is_approved_resource(db, item.recurso_id)
        ]
        if public_files:
            editions_payload.append({
                "id": edition.id,
                "titulo": edition.titulo,
                "editorial": edition.editorial,
                "anio": edition.anio,
                "idioma": edition.idioma,
                "doi": edition.doi,
                "isbns": list(isbn_result.all()),
                "archivos": public_files,
            })
    return {
        "id": work.id,
        "titulo_canonico": work.titulo_canonico,
        "resumen": work.resumen,
        "autores": work.autores,
        "temas": work.temas,
        "idioma": work.idioma,
        "created_at": work.created_at,
        "updated_at": work.updated_at,
        "ediciones": editions_payload,
    }


@router.get("/by-resource/{resource_id}", response_model=WorkRead)
async def get_work_by_resource(resource_id: int, db: AsyncSession = Depends(get_read_db)):
    if not await is_approved_resource(db, resource_id):
        raise HTTPException(status_code=404, detail="Obra no encontrada")
    result = await db.exec(
        select(ObraBibliografica)
        .join(EdicionBibliografica, EdicionBibliografica.obra_id == ObraBibliografica.id)
        .join(ArchivoBibliografico, ArchivoBibliografico.edicion_id == EdicionBibliografica.id)
        .where(ArchivoBibliografico.recurso_id == resource_id)
    )
    work = result.first()
    if not work:
        raise HTTPException(status_code=404, detail="Obra no encontrada")
    return await _work_payload(db, work)


@router.get("/{work_id}", response_model=WorkRead)
async def get_work(work_id: uuid.UUID, db: AsyncSession = Depends(get_read_db)):
    work = await db.get(ObraBibliografica, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Obra no encontrada")
    payload = await _work_payload(db, work)
    if not payload["ediciones"]:
        raise HTTPException(status_code=404, detail="Obra no encontrada")
    return payload


@router.post("/resources/{resource_id}/sync", response_model=ResourceBibliographySummary)
async def sync_resource(
    resource_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("Admin")),
):
    resource = None
    if resource_sharding_enabled():
        for shard_index, local_id in resource_id_candidates(resource_id):
            async with resource_session(shard_index, read=True) as shard_db:
                resource = await shard_db.get(Recurso, local_id)
                if resource:
                    break
    else:
        resource = await db.get(Recurso, resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Recurso no encontrado")
    await ensure_resource_bibliography(db, resource_id, resource)
    summary = await bibliography_summary(db, resource_id)
    if not summary:
        raise HTTPException(status_code=500, detail="No se pudo vincular el recurso")
    return summary


@router.post("/{target_work_id}/merge/{source_work_id}", response_model=MergeWorksResponse)
async def merge_works(
    target_work_id: uuid.UUID,
    source_work_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("Admin")),
):
    if target_work_id == source_work_id:
        raise HTTPException(status_code=422, detail="Las obras deben ser diferentes")
    target = await db.get(ObraBibliografica, target_work_id)
    source = await db.get(ObraBibliografica, source_work_id)
    if not target or not source:
        raise HTTPException(status_code=404, detail="Obra no encontrada")
    editions_result = await db.exec(
        select(EdicionBibliografica).where(EdicionBibliografica.obra_id == source.id)
    )
    editions = list(editions_result.all())
    for edition in editions:
        edition.obra_id = target.id
    await db.delete(source)
    await db.commit()
    return {"obra": await _work_payload(db, target), "ediciones_movidas": len(editions)}
