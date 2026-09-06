from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from fastapi import HTTPException

from app.models.resource import Curso, Recurso, TipoRecurso, EstadoRecurso
from app.models.activity import TipoActividad

from app.core.cache import get_activity_type_id

async def _activity_type(db: AsyncSession, name: str):
    class MockActivityType:
        def __init__(self, id_val):
            self.id = id_val
            
    id_val = await get_activity_type_id(db, name)
    if id_val is not None:
        return MockActivityType(id_val)
    return None

async def _state_id(db: AsyncSession, name: str) -> int:
    result = await db.exec(select(EstadoRecurso).where(EstadoRecurso.nombre == name))
    state = result.first()
    if not state or state.id is None:
        raise HTTPException(status_code=500, detail=f"Estado de recurso no configurado: {name}")
    return state.id

from app.core.text_extraction import extract_search_snippet

async def _resource_payload(db: AsyncSession, recurso: Recurso, public_id: int | None = None, search: str | None = None) -> dict:
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
    if public_id is not None:
        data["id"] = public_id
    data["tipo_recurso_nombre"] = tipo_nombre
    data["curso_nombre"] = curso_nombre
    if search and search.strip():
        data["snippet"] = extract_search_snippet(recurso.contenido_texto, search) or extract_search_snippet(recurso.resumen, search)
    return data

async def _resource_list_payload(
    db: AsyncSession,
    recursos: list[Recurso],
    *,
    public_ids: dict[int, int] | None = None,
    search: str | None = None,
) -> list[dict]:
    if not recursos:
        return []
        
    tipo_ids = list({r.tipo_recurso_id for r in recursos if r.tipo_recurso_id})
    curso_ids = list({r.curso_id for r in recursos if r.curso_id})
    
    tipos = {}
    if tipo_ids:
        res = await db.exec(select(TipoRecurso).where(TipoRecurso.id.in_(tipo_ids)))
        tipos = {t.id: t.nombre for t in res.all()}
        
    cursos = {}
    if curso_ids:
        res = await db.exec(select(Curso).where(Curso.id.in_(curso_ids)))
        cursos = {c.id: c.nombre for c in res.all()}
        
    data_list = []
    for r in recursos:
        d = r.model_dump()
        if public_ids and r.id in public_ids:
            d["id"] = public_ids[r.id]
        d["tipo_recurso_nombre"] = tipos.get(r.tipo_recurso_id)
        d["curso_nombre"] = cursos.get(r.curso_id) if r.curso_id else None
        if search and search.strip():
            d["snippet"] = extract_search_snippet(r.contenido_texto, search) or extract_search_snippet(r.resumen, search)
        data_list.append(d)
        
    return data_list
