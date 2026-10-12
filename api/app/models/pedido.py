from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import BaseModel


class PedidoModel(BaseModel):
    __tablename__ = "pedidos"

    data_pedido = Column(DateTime, server_default=func.now(), nullable=False)
    valor_total = Column(Numeric(10, 2), nullable=False)
    observacoes = Column(Text, nullable=True)
    # Explicação mostrada ao cliente quando a loja (ou a expiração do PIX) cancela o pedido
    motivo_cancelamento = Column(String(255), nullable=True)
    # Quando a loja abriu (ou movimentou) o pedido no painel pela primeira vez — nulo = pedido novo
    visualizado_em = Column(DateTime, nullable=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    # A data de retirada vem da agenda, que controla a capacidade produtiva do dia
    agenda_id = Column(Integer, ForeignKey("agendas.id"), nullable=False)
    status_id = Column(Integer, ForeignKey("status_pedido.id"), nullable=False)

    cliente = relationship("ClienteModel", back_populates="pedidos")
    agenda = relationship("AgendaModel", back_populates="pedidos")
    status = relationship("StatusPedidoModel", back_populates="pedidos")
    itens = relationship("ItemPedidoModel", back_populates="pedido", cascade="all, delete-orphan")
    avaliacao = relationship("AvaliacaoModel", back_populates="pedido", uselist=False)
    pagamentos = relationship(
        "PagamentoModel", back_populates="pedido", order_by="PagamentoModel.id"
    )