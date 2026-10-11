from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import AliasPath, BaseModel, Field, computed_field, model_validator

from app.services.mercadopago_service import motivo_recusa as mensagem_recusa
from app.services.metodo_pagamento_service import CARTAO_CREDITO, PIX
from app.services.status_pagamento_service import RECUSADO


class PagamentoCreate(BaseModel):
    metodo: Literal[PIX, CARTAO_CREDITO]
    # Cartão: token gerado pelo Card Payment Brick — os dados do cartão nunca passam pela API
    token: Optional[str] = None
    # Cartão: payment_method_id devolvido pelo Brick (ex.: "visa", "master")
    bandeira: Optional[str] = Field(default=None, max_length=30)

    @model_validator(mode="after")
    def validar_cartao(self) -> "PagamentoCreate":
        if self.metodo == CARTAO_CREDITO and not (self.token and self.bandeira):
            raise ValueError("Para pagar com cartão, informe os dados do cartão")
        return self


class PagamentoRead(BaseModel):
    id: int
    pedido_id: int
    metodo: str = Field(validation_alias=AliasPath("metodo", "descricao"))
    status: str = Field(validation_alias=AliasPath("status", "descricao"))
    status_detalhe: Optional[str]
    valor: Decimal
    data_hora: datetime
    expira_em: Optional[datetime]
    qr_code: Optional[str]
    qr_code_base64: Optional[str]
    ticket_url: Optional[str]

    model_config = {"from_attributes": True, "populate_by_name": True}

    @computed_field
    @property
    def motivo_recusa(self) -> Optional[str]:
        """Explicação em PT-BR para o cliente quando o cartão é recusado."""
        if self.status != RECUSADO:
            return None
        return mensagem_recusa(self.status_detalhe)