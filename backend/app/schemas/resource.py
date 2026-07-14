from datetime import date, datetime
from typing import Optional
import uuid
from sqlmodel import SQLModel


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
    curso_id: Optional[int] = None
    visualizaciones: int
    descargas: int
    created_at: datetime
    tipo_recurso_nombre: Optional[str] = None
    curso_nombre: Optional[str] = None
    curso_id: Optional[int] = None
    autores: Optional[str] = None
    editorial: Optional[str] = None
    doi: Optional[str] = None
    anio: Optional[int] = None


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
    anio: Optional[int] = None


class ResourceUploadResponse(SQLModel):
    id: int
    titulo: str
    estado_id: int
    url_archivo: str


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
    anio: Optional[int] = None


class ExternalResourceImport(SQLModel):
    source: str
    external_id: str
    titulo: str
    tipo_recurso_id: int
    resumen: Optional[str] = None
    curso_id: Optional[int] = None
    autores: Optional[str] = None
    editorial: Optional[str] = None
    doi: Optional[str] = None
    anio: Optional[int] = None
    external_url: Optional[str] = None
    open_access_url: Optional[str] = None
    cover_url: Optional[str] = None
