import uuid
from typing import Optional
from fastapi_users import schemas


class UserRead(schemas.BaseUser[uuid.UUID]):
    nombre: str
    rol_id: int
    esta_activo: bool
    rol: str


class UserCreate(schemas.BaseUserCreate):
    nombre: str
    rol_id: Optional[int] = 3


class UserUpdate(schemas.BaseUserUpdate):
    nombre: Optional[str] = None
    rol_id: Optional[int] = None
    esta_activo: Optional[bool] = None
