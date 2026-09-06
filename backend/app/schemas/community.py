import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.resource import RecursoRead


class ReviewCreate(BaseModel):
    puntuacion: int = Field(ge=1, le=5, description="Puntuación de 1 a 5 estrellas")
    comentario: Optional[str] = Field(default=None, max_length=1000, description="Comentario u opinión opcional")


class ReviewRead(BaseModel):
    id: uuid.UUID
    recurso_id: int
    usuario_id: uuid.UUID
    usuario_nombre: str
    puntuacion: int
    comentario: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ReviewsSummary(BaseModel):
    promedio: float
    total: int
    reviews: list[ReviewRead]


class ReportCreate(BaseModel):
    motivo: str = Field(pattern=r"^(archivo_corrupto|duplicado|metadatos_incorrectos|otro)$")
    descripcion: str = Field(min_length=5, max_length=1000)


class ReportUpdate(BaseModel):
    estado: str = Field(pattern=r"^(pendiente|resuelto|descartado)$")
    resolucion: Optional[str] = Field(default=None, max_length=500)


class ReportRead(BaseModel):
    id: uuid.UUID
    recurso_id: int
    recurso_titulo: Optional[str] = None
    usuario_id: uuid.UUID
    usuario_email: Optional[str] = None
    motivo: str
    descripcion: str
    estado: str
    resolucion: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class FeaturedResourcesResponse(BaseModel):
    recientes: list[RecursoRead]
    mas_vistos: list[RecursoRead]
    mas_descargados: list[RecursoRead]
