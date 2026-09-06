from datetime import datetime, timezone
from typing import Optional
import uuid

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class ObraBibliografica(SQLModel, table=True):
    __tablename__ = "obras_bibliograficas"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    titulo_canonico: str = Field(max_length=300, index=True)
    resumen: Optional[str] = Field(default=None)
    autores: Optional[str] = Field(default=None, max_length=300)
    temas: Optional[str] = Field(default=None, max_length=1000)
    idioma: Optional[str] = Field(default=None, max_length=16)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class EdicionBibliografica(SQLModel, table=True):
    __tablename__ = "ediciones_bibliograficas"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    obra_id: uuid.UUID = Field(foreign_key="obras_bibliograficas.id", index=True)
    titulo: str = Field(max_length=300)
    editorial: Optional[str] = Field(default=None, max_length=200)
    anio: Optional[int] = Field(default=None)
    idioma: Optional[str] = Field(default=None, max_length=16)
    doi: Optional[str] = Field(default=None, max_length=100, unique=True, index=True)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class EdicionISBN(SQLModel, table=True):
    __tablename__ = "edicion_isbn"

    id: Optional[int] = Field(default=None, primary_key=True)
    edicion_id: uuid.UUID = Field(foreign_key="ediciones_bibliograficas.id", index=True)
    isbn: str = Field(max_length=32, unique=True, index=True)


class ArchivoBibliografico(SQLModel, table=True):
    __tablename__ = "archivos_bibliograficos"
    __table_args__ = (UniqueConstraint("edicion_id", "recurso_id"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    edicion_id: uuid.UUID = Field(foreign_key="ediciones_bibliograficas.id", index=True)
    recurso_id: int = Field(unique=True, index=True)
    formato: str = Field(max_length=20)
    mime_type: str = Field(max_length=100)
    tamano: int = Field(default=0)
    created_at: datetime = Field(default_factory=utc_now)
