from datetime import datetime
from typing import Literal
import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.resource import RecursoRead


ReadingStatus = Literal["quiero_leer", "leyendo", "leido"]


class PersonalResourceUpdate(BaseModel):
    favorito: bool = False
    estado_lectura: ReadingStatus | None = None
    progreso_pagina: int = Field(default=0, ge=0, le=100000)


class PersonalResourceRead(BaseModel):
    recurso: RecursoRead
    favorito: bool
    estado_lectura: ReadingStatus | None
    progreso_pagina: int
    ultima_lectura: datetime | None
    updated_at: datetime


class LibraryListCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    descripcion: str | None = Field(default=None, max_length=500)
    es_publica: bool = False


class LibraryListUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=100)
    descripcion: str | None = Field(default=None, max_length=500)
    es_publica: bool | None = None


class LibraryListSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nombre: str
    descripcion: str | None
    es_publica: bool
    created_at: datetime
    updated_at: datetime


class LibraryListRead(LibraryListSummary):
    recursos: list[RecursoRead]


class PersonalHistoryEntry(BaseModel):
    id: int
    accion: Literal["view", "download"]
    recurso_id: int | None
    titulo: str | None
    fecha_hora: datetime


class BookmarkCreate(BaseModel):
    pagina: int = Field(ge=1)
    titulo: str | None = Field(default=None, max_length=120)
    contenido: str | None = Field(default=None, max_length=2000)
    color: str = Field(default="brand", max_length=20)


class BookmarkUpdate(BaseModel):
    titulo: str | None = Field(default=None, max_length=120)
    contenido: str | None = Field(default=None, max_length=2000)
    color: str | None = Field(default=None, max_length=20)


class BookmarkRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    recurso_id: int
    pagina: int
    titulo: str | None
    contenido: str | None
    color: str
    created_at: datetime
    updated_at: datetime
