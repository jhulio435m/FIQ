import uuid
from typing import Optional

from fastapi_users_db_sqlmodel import SQLModelBaseUserDB
from sqlmodel import Field, SQLModel


class RolBase(SQLModel):
    nombre: str = Field(unique=True, index=True, max_length=50)
    descripcion: str = Field(default=None, nullable=True)


class Rol(RolBase, table=True):
    __tablename__ = "roles"

    id: int = Field(default=None, primary_key=True)


class User(SQLModelBaseUserDB, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    nombre: str = Field(max_length=255, index=True)
    rol_id: int = Field(default=3, foreign_key="roles.id")
    esta_activo: bool = Field(default=True)

    @property
    def rol(self) -> str:
        roles = {1: "Admin", 2: "Docente", 3: "Estudiante"}
        return roles.get(self.rol_id, "Estudiante")

    @property
    def is_effectively_active(self) -> bool:
        return self.is_active and self.esta_activo
