from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ActivityEventResponse(BaseModel):
    id: str
    sql_activity_id: int | None = None
    usuario_id: str | None = None
    tipo_actividad_id: int
    tipo_actividad: str | None = None
    entidad_relacionada_id: str | None = None
    occurred_at: datetime
    ip_origen: str | None = None
    user_agent: str | None = None
    detalle_accion: dict[str, object] | None = None
