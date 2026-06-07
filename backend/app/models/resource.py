from datetime import date, datetime, timezone
from typing import Optional
import uuid
from sqlmodel import Field, SQLModel


class TipoRecurso(SQLModel, table=True):
    __tablename__ = "tipos_recurso"
    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(unique=True, index=True)


class EstadoRecurso(SQLModel, table=True):
    __tablename__ = "estados_recurso"
    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(unique=True, index=True)


class RecursoBase(SQLModel):
    titulo: str = Field(index=True, max_length=300)
    resumen: Optional[str] = Field(default=None, nullable=True)
    fecha_publicacion: Optional[date] = Field(default=None, nullable=True)
    url_archivo: str = Field(max_length=500)
    archivo_size: int = 0
    archivo_mime: str = Field(max_length=100)
    autores: Optional[str] = Field(default=None, nullable=True, max_length=300)
    editorial: Optional[str] = Field(default=None, nullable=True, max_length=200)
    doi: Optional[str] = Field(default=None, nullable=True, max_length=100)
    anio: Optional[int] = Field(default=None, nullable=True)



class Recurso(RecursoBase, table=True):
    __tablename__ = "recursos"
    id: Optional[int] = Field(default=None, primary_key=True)
    tipo_recurso_id: int = Field(foreign_key="tipos_recurso.id")
    subido_por: uuid.UUID = Field(foreign_key="user.id")
    estado_id: int = Field(foreign_key="estados_recurso.id")
    curso_id: Optional[int] = Field(default=None, foreign_key="cursos.id", nullable=True)
    
    visualizaciones: int = Field(default=0)
    descargas: int = Field(default=0)
    
    # Use naive datetimes for PostgreSQL timestamp without time zone compatibility
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))


class RecursoEstadoHistorial(SQLModel, table=True):
    __tablename__ = "recurso_estado_historial"

    id: Optional[int] = Field(default=None, primary_key=True)
    recurso_id: int = Field(foreign_key="recursos.id")
    estado_anterior_id: Optional[int] = Field(default=None, foreign_key="estados_recurso.id")
    estado_nuevo_id: int = Field(foreign_key="estados_recurso.id")
    comentario: Optional[str] = Field(default=None, nullable=True)
    cambiado_por: uuid.UUID = Field(foreign_key="user.id")
    fecha_hora: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))


class Curso(SQLModel, table=True):
    __tablename__ = "cursos"
    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(index=True)
    codigo: str = Field(unique=True, index=True)
    ciclo: Optional[int] = Field(default=None, nullable=True)
    esta_activo: bool = Field(default=True)
