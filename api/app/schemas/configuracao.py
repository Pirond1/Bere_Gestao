from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class ConfiguracaoUpdate(BaseModel):
    capacidade_produtiva_padrao: Optional[int] = Field(default=None, ge=0)
    antecedencia_minima_dias: Optional[int] = Field(default=None, ge=0)
    endereco_retirada: Optional[str] = Field(default=None, max_length=255)
    horario_retirada: Optional[str] = Field(default=None, max_length=100)

    @field_validator("endereco_retirada", "horario_retirada")
    @classmethod
    def limpar_texto(cls, v: Optional[str]) -> Optional[str]:
        # Texto em branco = sem informação (fica fora do aviso de pedido pronto)
        if v is None:
            return None
        return v.strip() or None


class ConfiguracaoRead(BaseModel):
    id: int
    capacidade_produtiva_padrao: int
    antecedencia_minima_dias: int
    endereco_retirada: Optional[str]
    horario_retirada: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
