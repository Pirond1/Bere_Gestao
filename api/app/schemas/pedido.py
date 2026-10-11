from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import AliasPath, BaseModel, Field

from app.schemas.avaliacao import AvaliacaoRead
from app.schemas.status_pedido import StatusPedidoRead


class ItemPedidoCreate(BaseModel):
    produto_id: int
    quantidade: int = Field(gt=0)


class PedidoCreate(BaseModel):
    data_retirada: date
    itens: list[ItemPedidoCreate] = Field(min_length=1)
    observacoes: Optional[str] = None


class PedidoStatusUpdate(BaseModel):
    status_id: int


class ItemPedidoRead(BaseModel):
    id: int
    produto_id: int
    quantidade: int
    preco_unitario: Decimal
    subtotal: Decimal
    produto_nome: str = Field(validation_alias=AliasPath("produto", "nome"))
    produto_foto: Optional[str] = Field(default=None, validation_alias=AliasPath("produto", "foto"))

    model_config = {"from_attributes": True, "populate_by_name": True}


class PedidoRead(BaseModel):
    id: int
    data_pedido: datetime
    data_retirada: date = Field(validation_alias=AliasPath("agenda", "data"))
    valor_total: Decimal
    observacoes: Optional[str]
    cliente_id: int
    status: StatusPedidoRead
    itens: list[ItemPedidoRead] = []
    # Preenchida depois que o cliente avalia o pedido entregue (NPS)
    avaliacao: Optional[AvaliacaoRead] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}