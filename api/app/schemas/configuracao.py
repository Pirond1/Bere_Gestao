from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class ConfiguracaoUpdate(BaseModel):
    capacidade_produtiva_padrao: Optional[int] = Field(default=None, ge=0, le=500)
    antecedencia_minima_dias: Optional[int] = Field(default=None, ge=0, le=60)
    # Mínimo de 30 min (o valor usado e testado com o Mercado Pago até a BG-12); acima de 1 dia a vaga fica presa demais
    prazo_pagamento_minutos: Optional[int] = Field(default=None, ge=30, le=1440)
    dias_fechados: Optional[list[int]] = None
    endereco_retirada: Optional[str] = Field(default=None, max_length=255)
    horario_retirada: Optional[str] = Field(default=None, max_length=100)

    @field_validator("dias_fechados")
    @classmethod
    def validar_dias_fechados(cls, v: Optional[list[int]]) -> Optional[list[int]]:
        if v is None:
            return None
        if any(dia < 0 or dia > 6 for dia in v):
            raise ValueError("Dia da semana inválido — use 0 (segunda) a 6 (domingo)")
        dias = sorted(set(v))
        if len(dias) == 7:
            raise ValueError("A loja precisa atender em pelo menos um dia da semana")
        return dias

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
    prazo_pagamento_minutos: int
    dias_fechados: list[int]
    endereco_retirada: Optional[str]
    horario_retirada: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConfiguracaoPublicaRead(BaseModel):
    """O que o cliente precisa saber da configuração — nada além disso fica público."""

    prazo_pagamento_minutos: int

    model_config = {"from_attributes": True}