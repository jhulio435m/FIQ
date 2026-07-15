from datetime import datetime, timezone
from typing import Optional
import uuid
from sqlmodel import Field, SQLModel, JSON, Column


class TipoActividad(SQLModel, table=True):
    __tablename__ = "tipos_actividad"
    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(unique=True, index=True)


class RegistroActividad(SQLModel, table=True):
    __tablename__ = "registro_actividades"
    id: Optional[int] = Field(default=None, primary_key=True)
    usuario_id: uuid.UUID = Field(foreign_key="user.id")
    tipo_actividad_id: int = Field(foreign_key="tipos_actividad.id")
    entidad_relacionada_id: Optional[uuid.UUID] = None
    fecha_hora: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    ip_origen: Optional[str] = None
    user_agent: Optional[str] = None
    detalle_accion: Optional[dict] = Field(default=None, sa_column=Column(JSON))
