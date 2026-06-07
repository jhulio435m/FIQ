from pydantic import BaseModel
from typing import Optional


class ModuloLaboratorioResponse(BaseModel):
    id: int
    titulo: str
    descripcion: Optional[str]
    url_simulacion: str
    nivel_id: int
    esta_activo: bool

    model_config = {"from_attributes": True}
