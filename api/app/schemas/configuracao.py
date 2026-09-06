from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ConfiguracaoUpdate(BaseModel):
    capacidade_produtiva_padrao: Optional[int] = Field(default=None, ge=0)
    antecedencia_minima_dias: Optional[int] = Field(default=None, ge=0)


class ConfiguracaoRead(BaseModel):
    id: int
    capacidade_produtiva_padrao: int
    antecedencia_minima_dias: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}