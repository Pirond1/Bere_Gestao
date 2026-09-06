from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class AvaliacaoCreate(BaseModel):
    # Nota NPS: 0 a 10
    nota: int = Field(ge=0, le=10)
    comentario: Optional[str] = None


class AvaliacaoRead(BaseModel):
    id: int
    pedido_id: int
    nota: int
    comentario: Optional[str]
    data_avaliacao: datetime
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}