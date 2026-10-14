from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import AliasPath, BaseModel, Field, computed_field, field_validator

from app.schemas.avaliacao import AvaliacaoRead
from app.schemas.status_pedido import StatusPedidoRead
from app.services.status_pedido_service import EM_ANDAMENTO


class ItemPedidoCreate(BaseModel):
    produto_id: int
    quantidade: int = Field(gt=0)


class PedidoCreate(BaseModel):
    data_retirada: date
    itens: list[ItemPedidoCreate] = Field(min_length=1)
    observacoes: Optional[str] = None


class PedidoCancelar(BaseModel):
    # Opcional; só a loja informa — o cliente vê no detalhe do pedido
    motivo: Optional[str] = Field(default=None, max_length=255)

    @field_validator("motivo")
    @classmethod
    def limpar_motivo(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return v.strip() or None


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
    motivo_cancelamento: Optional[str]
    cliente_id: int
    status: StatusPedidoRead
    itens: list[ItemPedidoRead] = []
    # Preenchida depois que o cliente avalia o pedido entregue (NPS)
    avaliacao: Optional[AvaliacaoRead] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}


class ClienteResumoRead(BaseModel):
    """Contato do cliente para a loja — só o necessário para atender o pedido (LGPD)."""

    id: int
    nome: str
    telefone: Optional[str]
    email: str = Field(validation_alias=AliasPath("usuario", "email"))

    model_config = {"from_attributes": True, "populate_by_name": True}


class PagamentoResumoRead(BaseModel):
    id: int
    metodo: str = Field(validation_alias=AliasPath("metodo", "descricao"))
    status: str = Field(validation_alias=AliasPath("status", "descricao"))
    status_detalhe: Optional[str]
    valor: Decimal
    data_hora: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}


class PedidoPainelRead(PedidoRead):
    """Pedido como a loja vê no painel: com contato do cliente e tentativas de pagamento."""

    cliente: ClienteResumoRead
    pagamentos: list[PagamentoResumoRead] = []
    visualizado_em: Optional[datetime]
    avisado_em: Optional[datetime]

    @computed_field
    @property
    def novo(self) -> bool:
        """Pago, em andamento e ainda não aberto pela loja — ganha o selo "Novo" no painel."""
        return self.visualizado_em is None and self.status.descricao in EM_ANDAMENTO


class NovosPedidosRead(BaseModel):
    quantidade: int


class PedidoPainelPagina(BaseModel):
    itens: list[PedidoPainelRead]
    total: int
    pagina: int
    limite: int
    # Quantidade por status com os demais filtros aplicados — números das abas
    contagem_por_status: dict[str, int]
