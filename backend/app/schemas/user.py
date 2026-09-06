import uuid
from typing import Optional
from fastapi_users import schemas
from pydantic import ConfigDict


class UserRead(schemas.BaseUser[uuid.UUID]):
    nombre: str
    rol_id: int
    esta_activo: bool
    rol: str


class UserCreate(schemas.BaseUserCreate):
    model_config = ConfigDict(extra="forbid")
    nombre: str


class UserUpdate(schemas.BaseUserUpdate):
    model_config = ConfigDict(extra="forbid")
    nombre: Optional[str] = None
