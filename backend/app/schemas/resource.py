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


class FacetCount(SQLModel):
    id: int
    nombre: str
    count: int


class YearFacet(SQLModel):
    anio: int
    count: int


class CatalogFacets(SQLModel):
    total: int
    tipos: list[FacetCount]
    cursos: list[FacetCount]
    anios: list[YearFacet]


# --- Moderación y "Mis recursos" ---

class ModerationComment(SQLModel):
    comentario: str = Field(min_length=10, max_length=1000)


class BulkApproveRequest(SQLModel):
    ids: list[int] = Field(min_length=1, max_length=50)
    comentario: Optional[str] = Field(default=None, max_length=1000)


class BulkModerationResult(SQLModel):
    procesados: list[int]
    omitidos: list[int]


class ResubmitRequest(SQLModel):
    nota: Optional[str] = Field(default=None, max_length=1000)


class HistoryEntry(SQLModel):
    id: int
    estado_anterior: Optional[str] = None
    estado_nuevo: str
    comentario: Optional[str] = None
    cambiado_por_nombre: Optional[str] = None
    fecha_hora: datetime


class ModerationItem(RecursoRead):
    estado_nombre: str
    subido_por_nombre: Optional[str] = None
    subido_por_email: Optional[str] = None
    ultimo_comentario: Optional[str] = None
    ultimo_cambio: Optional[datetime] = None
    reenvios: int = 0


class MyResourcesResponse(SQLModel):
    items: list[ModerationItem]
    conteos: dict[str, int]
