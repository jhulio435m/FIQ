from datetime import datetime
import uuid

from pydantic import BaseModel, ConfigDict


class BibliographicFileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    recurso_id: int
    formato: str
    mime_type: str
    tamano: int


class EditionRead(BaseModel):
    id: uuid.UUID
    titulo: str
    editorial: str | None
    anio: int | None
    idioma: str | None
    doi: str | None
    isbns: list[str]
    archivos: list[BibliographicFileRead]


class WorkRead(BaseModel):
    id: uuid.UUID
    titulo_canonico: str
    resumen: str | None
    autores: str | None
    temas: str | None
    idioma: str | None
    created_at: datetime
    updated_at: datetime
    ediciones: list[EditionRead]


class ResourceBibliographySummary(BaseModel):
    obra_id: uuid.UUID
    edicion_id: uuid.UUID
    ediciones_disponibles: int
    archivos_disponibles: int
    formatos_disponibles: list[str]


class MergeWorksResponse(BaseModel):
    obra: WorkRead
    ediciones_movidas: int
