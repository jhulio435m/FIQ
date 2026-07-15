from typing import Optional

from sqlmodel import Field, SQLModel


class NivelDificultad(SQLModel, table=True):
    __tablename__ = "niveles_dificultad"

    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(unique=True, index=True, max_length=50)


class ModuloLaboratorio(SQLModel, table=True):
    __tablename__ = "modulos_laboratorio"

    id: Optional[int] = Field(default=None, primary_key=True)
    titulo: str = Field(max_length=200, index=True)
    descripcion: Optional[str] = Field(default=None, nullable=True)
    url_simulacion: str = Field(max_length=500)
    nivel_id: int = Field(foreign_key="niveles_dificultad.id")
    esta_activo: bool = Field(default=True)
