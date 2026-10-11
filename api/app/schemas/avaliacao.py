from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class AvaliacaoCreate(BaseModel):
    # Nota NPS: 0 a 10
    nota: int = Field(ge=0, le=10)
    comentario: Optional[str] = Field(default=None, max_length=1000)

    @field_validator("comentario")
    @classmethod
    def limpar_comentario(cls, v: Optional[str]) -> Optional[str]:
        # Comentário só com espaços vira "sem comentário"
        if v is None:
            return None
        return v.strip() or None


class AvaliacaoRead(BaseModel):
    id: int
    pedido_id: int
    nota: int
    comentario: Optional[str]
    data_avaliacao: datetime
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}