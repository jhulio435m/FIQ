import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel


class ValoracionRecurso(SQLModel, table=True):
    __tablename__ = "valoraciones_recurso"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    recurso_id: int = Field(foreign_key="recursos.id", index=True)
    usuario_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    puntuacion: int = Field(ge=1, le=5)
    comentario: Optional[str] = Field(default=None, max_length=1000, nullable=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))


class ReporteRecurso(SQLModel, table=True):
    __tablename__ = "reportes_recurso"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    recurso_id: int = Field(foreign_key="recursos.id", index=True)
    usuario_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    motivo: str = Field(max_length=50, index=True)
    descripcion: str = Field(max_length=1000)
    estado: str = Field(default="pendiente", max_length=20, index=True)
    resolucion: Optional[str] = Field(default=None, max_length=500, nullable=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
