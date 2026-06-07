from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ActividadResponse(BaseModel):
    id: int
    usuario_id: int
    tipo_actividad: str
    fecha_hora: datetime
    ip_origen: Optional[str]
    detalle_accion: Optional[dict]

    model_config = {"from_attributes": True}
