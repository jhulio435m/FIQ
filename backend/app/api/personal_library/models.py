from datetime import datetime, timezone
from typing import Optional
import uuid

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class BibliotecaUsuarioRecurso(SQLModel, table=True):
    __tablename__ = "biblioteca_usuario_recurso"
    __table_args__ = (UniqueConstraint("usuario_id", "recurso_id"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    usuario_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    recurso_id: int = Field(index=True)
    favorito: bool = Field(default=False)
    estado_lectura: Optional[str] = Field(default=None, max_length=20)
    progreso_pagina: int = Field(default=0)
    ultima_lectura: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class ListaBiblioteca(SQLModel, table=True):
    __tablename__ = "listas_biblioteca"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    propietario_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    nombre: str = Field(max_length=100)
    descripcion: Optional[str] = Field(default=None, max_length=500)
    es_publica: bool = Field(default=False, index=True)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class ListaBibliotecaRecurso(SQLModel, table=True):
    __tablename__ = "lista_biblioteca_recursos"
    __table_args__ = (UniqueConstraint("lista_id", "recurso_id"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    lista_id: uuid.UUID = Field(foreign_key="listas_biblioteca.id", index=True)
    recurso_id: int = Field(index=True)
    posicion: int = Field(default=0)
    agregado_at: datetime = Field(default_factory=utc_now)


class MarcadorLectura(SQLModel, table=True):
    __tablename__ = "marcador_lectura"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    usuario_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    recurso_id: int = Field(foreign_key="recursos.id", index=True)
    pagina: int = Field(default=1, ge=1)
    titulo: Optional[str] = Field(default=None, max_length=120)
    contenido: Optional[str] = Field(default=None)
    color: str = Field(default="brand", max_length=20)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
