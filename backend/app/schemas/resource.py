from datetime import date, datetime
from typing import Optional
import uuid
from sqlmodel import Field, SQLModel


class RecursoRead(SQLModel):
    id: int
    titulo: str
    resumen: Optional[str] = None
    fecha_publicacion: Optional[date] = None
    url_archivo: str
    archivo_size: int
    archivo_mime: str
    tipo_recurso_id: int
    subido_por: uuid.UUID
    estado_id: int
    visualizaciones: int
    descargas: int
    created_at: datetime
    tipo_recurso_nombre: Optional[str] = None
    curso_nombre: Optional[str] = None
    curso_id: Optional[int] = None
    autores: Optional[str] = None
    editorial: Optional[str] = None
    doi: Optional[str] = None
    isbn: Optional[str] = None
    anio: Optional[int] = None
    idioma: Optional[str] = None
    cover_url: Optional[str] = None
    licencia: Optional[str] = None
    temas: Optional[str] = None
    fuente_externa: Optional[str] = None
    external_id: Optional[str] = None
    scan_status: str = "clean"
    obra_id: Optional[uuid.UUID] = None
    edicion_id: Optional[uuid.UUID] = None
    ediciones_disponibles: int = 1
    archivos_disponibles: int = 1
    formatos_disponibles: list[str] = Field(default_factory=list)
    snippet: Optional[str] = None


class RecursoCreate(SQLModel):
    titulo: str
    resumen: Optional[str] = None
    tipo_recurso_id: int
    curso_id: Optional[int] = None
    file_name: str
    file_size: int
    file_mime: str
    autores: Optional[str] = None
    editorial: Optional[str] = None
    doi: Optional[str] = None
    isbn: Optional[str] = None
    anio: Optional[int] = None
    idioma: Optional[str] = None
    licencia: Optional[str] = None
    temas: Optional[str] = None





class ResourceModeration(SQLModel):
    comentario: Optional[str] = None


class TipoRecursoRead(SQLModel):
    id: int
    nombre: str


class PresignedPost(SQLModel):
    url: str
    fields: dict
    key: str
    resource_id: int


class RecursoUpdate(SQLModel):
    titulo: Optional[str] = None
    resumen: Optional[str] = None
    tipo_recurso_id: Optional[int] = None
    curso_id: Optional[int] = None
    autores: Optional[str] = None
    editorial: Optional[str] = None
    doi: Optional[str] = None
    isbn: Optional[str] = None
    anio: Optional[int] = None
    idioma: Optional[str] = None
    cover_url: Optional[str] = None
    licencia: Optional[str] = None
    temas: Optional[str] = None


class ExternalResourceImport(SQLModel):
    source: str = Field(min_length=2, max_length=50)
    external_id: str = Field(min_length=1, max_length=200)
    titulo: str = Field(min_length=1, max_length=300)
    tipo_recurso_id: int
    resumen: Optional[str] = Field(default=None, max_length=5000)
    curso_id: Optional[int] = None
    autores: Optional[str] = Field(default=None, max_length=300)
    editorial: Optional[str] = Field(default=None, max_length=200)
    doi: Optional[str] = Field(default=None, max_length=200)
    isbn: Optional[str] = Field(default=None, max_length=64)
    anio: Optional[int] = None
    external_url: Optional[str] = Field(default=None, max_length=500)
    open_access_url: Optional[str] = Field(default=None, max_length=500)
    cover_url: Optional[str] = Field(default=None, max_length=500)
    idioma: Optional[str] = Field(default=None, max_length=16)
    licencia: Optional[str] = Field(default=None, max_length=300)
    temas: list[str] = Field(default_factory=list, max_length=32)


class ResourceCatalogPage(SQLModel):
    items: list[RecursoRead]
    total: int
    skip: int
    limit: int
    has_more: bool
