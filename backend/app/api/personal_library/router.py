from datetime import datetime, timezone
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import delete
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from pymongo.errors import PyMongoError

from app.api.personal_library.models import (
    BibliotecaUsuarioRecurso,
    ListaBiblioteca,
    ListaBibliotecaRecurso,
    MarcadorLectura,
)
from app.api.personal_library.schemas import (
    BookmarkCreate,
    BookmarkRead,
    BookmarkUpdate,
    LibraryListCreate,
    LibraryListRead,
    LibraryListSummary,
    LibraryListUpdate,
    PersonalHistoryEntry,
    PersonalResourceRead,
    PersonalResourceUpdate,
)
from app.api.resources.crud import _resource_payload, _state_id
from app.core.database import get_db
from app.core.mongo import get_activity_events_collection
from app.core.sharding import encode_resource_id, resource_id_candidates, resource_session, resource_sharding_enabled
from app.core.users import current_active_user, get_optional_user
from app.models.activity import RegistroActividad, TipoActividad
from app.models.resource import Recurso
from app.models.user import User


router = APIRouter()


async def _approved_resource_payload(db: AsyncSession, resource_id: int) -> dict:
    if resource_sharding_enabled():
        for shard_index, local_id in resource_id_candidates(resource_id):
            async with resource_session(shard_index, read=True) as shard_db:
                resource = await shard_db.get(Recurso, local_id)
                if resource:
                    approved_id = await _state_id(shard_db, "Aprobado")
                    if resource.estado_id != approved_id:
                        break
                    return await _resource_payload(
                        shard_db,
                        resource,
                        public_id=encode_resource_id(shard_index, resource.id),
                    )
        raise HTTPException(status_code=404, detail="Recurso no encontrado")

    resource = await db.get(Recurso, resource_id)
    approved_id = await _state_id(db, "Aprobado")
    if not resource or resource.estado_id != approved_id:
        raise HTTPException(status_code=404, detail="Recurso no encontrado")
    return await _resource_payload(db, resource)


async def _personal_payload(db: AsyncSession, entry: BibliotecaUsuarioRecurso) -> dict:
    return {
        "recurso": await _approved_resource_payload(db, entry.recurso_id),
        "favorito": entry.favorito,
        "estado_lectura": entry.estado_lectura,
        "progreso_pagina": entry.progreso_pagina,
        "ultima_lectura": entry.ultima_lectura,
        "updated_at": entry.updated_at,
    }


async def _owned_list(db: AsyncSession, list_id: uuid.UUID, user: User) -> ListaBiblioteca:
    library_list = await db.get(ListaBiblioteca, list_id)
    if not library_list or library_list.propietario_id != user.id:
        raise HTTPException(status_code=404, detail="Lista no encontrada")
    return library_list


async def _list_payload(db: AsyncSession, library_list: ListaBiblioteca) -> dict:
    result = await db.exec(
        select(ListaBibliotecaRecurso)
        .where(ListaBibliotecaRecurso.lista_id == library_list.id)
        .order_by(ListaBibliotecaRecurso.posicion, ListaBibliotecaRecurso.agregado_at)
    )
    resources = []
    for item in result.all():
        try:
            resources.append(await _approved_resource_payload(db, item.recurso_id))
        except HTTPException as exc:
            if exc.status_code != 404:
                raise
    return {**LibraryListSummary.model_validate(library_list).model_dump(), "recursos": resources}


@router.get("/me/resources", response_model=list[PersonalResourceRead])
async def my_resources(
    favorito: bool | None = None,
    estado_lectura: str | None = Query(default=None, pattern="^(quiero_leer|leyendo|leido)$"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    query = select(BibliotecaUsuarioRecurso).where(BibliotecaUsuarioRecurso.usuario_id == user.id)
    if favorito is not None:
        query = query.where(BibliotecaUsuarioRecurso.favorito == favorito)
    if estado_lectura:
        query = query.where(BibliotecaUsuarioRecurso.estado_lectura == estado_lectura)
    result = await db.exec(query.order_by(BibliotecaUsuarioRecurso.updated_at.desc()))
    payload = []
    for entry in result.all():
        try:
            payload.append(await _personal_payload(db, entry))
        except HTTPException as exc:
            if exc.status_code != 404:
                raise
    return payload


@router.put("/me/resources/{resource_id}", response_model=PersonalResourceRead)
async def save_personal_resource(
    resource_id: int,
    payload: PersonalResourceUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    await _approved_resource_payload(db, resource_id)
    result = await db.exec(
        select(BibliotecaUsuarioRecurso).where(
            BibliotecaUsuarioRecurso.usuario_id == user.id,
            BibliotecaUsuarioRecurso.recurso_id == resource_id,
        )
    )
    entry = result.first()
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if entry is None:
        entry = BibliotecaUsuarioRecurso(usuario_id=user.id, recurso_id=resource_id)
        db.add(entry)
    entry.favorito = payload.favorito
    entry.estado_lectura = payload.estado_lectura
    entry.progreso_pagina = payload.progreso_pagina
    entry.updated_at = now
    if payload.progreso_pagina > 0 or payload.estado_lectura in {"leyendo", "leido"}:
        entry.ultima_lectura = now
    await db.commit()
    await db.refresh(entry)
    return await _personal_payload(db, entry)


@router.get("/me/resources/{resource_id}", response_model=PersonalResourceRead | None)
async def get_personal_resource(
    resource_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    result = await db.exec(select(BibliotecaUsuarioRecurso).where(
        BibliotecaUsuarioRecurso.usuario_id == user.id,
        BibliotecaUsuarioRecurso.recurso_id == resource_id,
    ))
    entry = result.first()
    return await _personal_payload(db, entry) if entry else None


@router.delete("/me/resources/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_personal_resource(
    resource_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    await db.exec(delete(BibliotecaUsuarioRecurso).where(
        BibliotecaUsuarioRecurso.usuario_id == user.id,
        BibliotecaUsuarioRecurso.recurso_id == resource_id,
    ))
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me/lists", response_model=list[LibraryListRead])
async def my_lists(db: AsyncSession = Depends(get_db), user: User = Depends(current_active_user)):
    result = await db.exec(
        select(ListaBiblioteca)
        .where(ListaBiblioteca.propietario_id == user.id)
        .order_by(ListaBiblioteca.updated_at.desc())
    )
    return [await _list_payload(db, library_list) for library_list in result.all()]


@router.post("/me/lists", response_model=LibraryListSummary, status_code=status.HTTP_201_CREATED)
async def create_list(
    payload: LibraryListCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    library_list = ListaBiblioteca(propietario_id=user.id, **payload.model_dump())
    db.add(library_list)
    await db.commit()
    await db.refresh(library_list)
    return library_list


@router.get("/me/lists/{list_id}", response_model=LibraryListRead)
async def get_my_list(list_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(current_active_user)):
    return await _list_payload(db, await _owned_list(db, list_id, user))


@router.patch("/me/lists/{list_id}", response_model=LibraryListSummary)
async def update_list(
    list_id: uuid.UUID,
    payload: LibraryListUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    library_list = await _owned_list(db, list_id, user)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(library_list, field, value)
    library_list.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.commit()
    await db.refresh(library_list)
    return library_list


@router.delete("/me/lists/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_list(list_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(current_active_user)):
    library_list = await _owned_list(db, list_id, user)
    await db.delete(library_list)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/me/lists/{list_id}/resources/{resource_id}", response_model=LibraryListRead)
async def add_to_list(
    list_id: uuid.UUID,
    resource_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    library_list = await _owned_list(db, list_id, user)
    await _approved_resource_payload(db, resource_id)
    existing = await db.exec(select(ListaBibliotecaRecurso).where(
        ListaBibliotecaRecurso.lista_id == list_id,
        ListaBibliotecaRecurso.recurso_id == resource_id,
    ))
    if existing.first() is None:
        db.add(ListaBibliotecaRecurso(lista_id=list_id, recurso_id=resource_id))
        library_list.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
        await db.commit()
    return await _list_payload(db, library_list)


@router.delete("/me/lists/{list_id}/resources/{resource_id}", response_model=LibraryListRead)
async def remove_from_list(
    list_id: uuid.UUID,
    resource_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    library_list = await _owned_list(db, list_id, user)
    await db.exec(delete(ListaBibliotecaRecurso).where(
        ListaBibliotecaRecurso.lista_id == list_id,
        ListaBibliotecaRecurso.recurso_id == resource_id,
    ))
    await db.commit()
    return await _list_payload(db, library_list)


@router.get("/lists/{list_id}", response_model=LibraryListRead)
async def get_shared_list(
    list_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    library_list = await db.get(ListaBiblioteca, list_id)
    if not library_list or (not library_list.es_publica and (not user or user.id != library_list.propietario_id)):
        raise HTTPException(status_code=404, detail="Lista no encontrada")
    return await _list_payload(db, library_list)


@router.get("/me/history", response_model=list[PersonalHistoryEntry])
async def my_history(
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    result = await db.exec(
        select(RegistroActividad, TipoActividad.nombre)
        .join(TipoActividad, TipoActividad.id == RegistroActividad.tipo_actividad_id)
        .where(RegistroActividad.usuario_id == user.id, TipoActividad.nombre.in_(["view", "download"]))
        .order_by(RegistroActividad.fecha_hora.desc())
        .limit(limit)
    )
    return [
        {
            "id": activity.id,
            "accion": action,
            "recurso_id": (activity.detalle_accion or {}).get("resource_id"),
            "titulo": (activity.detalle_accion or {}).get("titulo"),
            "fecha_hora": activity.fecha_hora,
        }
        for activity, action in result.all()
    ]


@router.delete("/me/history", status_code=status.HTTP_204_NO_CONTENT)
async def clear_my_history(db: AsyncSession = Depends(get_db), user: User = Depends(current_active_user)):
    collection = get_activity_events_collection()
    if collection is not None:
        try:
            await collection.delete_many({
                "usuario_id": str(user.id),
                "tipo_actividad": {"$in": ["view", "download"]},
            })
        except PyMongoError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="No se pudo eliminar completamente el historial",
            ) from exc
    type_ids = select(TipoActividad.id).where(TipoActividad.nombre.in_(["view", "download"]))
    await db.exec(delete(RegistroActividad).where(
        RegistroActividad.usuario_id == user.id,
        RegistroActividad.tipo_actividad_id.in_(type_ids),
    ))
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me/resources/{resource_id}/bookmarks", response_model=list[BookmarkRead])
async def get_my_bookmarks(
    resource_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    await _approved_resource_payload(db, resource_id)
    result = await db.exec(
        select(MarcadorLectura)
        .where(MarcadorLectura.usuario_id == user.id, MarcadorLectura.recurso_id == resource_id)
        .order_by(MarcadorLectura.pagina.asc(), MarcadorLectura.created_at.asc())
    )
    return result.all()


@router.post("/me/resources/{resource_id}/bookmarks", response_model=BookmarkRead, status_code=status.HTTP_201_CREATED)
async def create_bookmark(
    resource_id: int,
    payload: BookmarkCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    await _approved_resource_payload(db, resource_id)
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    bookmark = MarcadorLectura(
        usuario_id=user.id,
        recurso_id=resource_id,
        pagina=payload.pagina,
        titulo=payload.titulo,
        contenido=payload.contenido,
        color=payload.color,
        created_at=now,
        updated_at=now,
    )
    db.add(bookmark)
    await db.commit()
    await db.refresh(bookmark)
    return bookmark


@router.patch("/me/bookmarks/{bookmark_id}", response_model=BookmarkRead)
async def update_bookmark(
    bookmark_id: uuid.UUID,
    payload: BookmarkUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    bookmark = await db.get(MarcadorLectura, bookmark_id)
    if not bookmark or bookmark.usuario_id != user.id:
        raise HTTPException(status_code=404, detail="Marcador no encontrado")
    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(bookmark, field, value)
    bookmark.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.commit()
    await db.refresh(bookmark)
    return bookmark


@router.delete("/me/bookmarks/{bookmark_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bookmark(
    bookmark_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
):
    bookmark = await db.get(MarcadorLectura, bookmark_id)
    if not bookmark or bookmark.usuario_id != user.id:
        raise HTTPException(status_code=404, detail="Marcador no encontrado")
    await db.delete(bookmark)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
