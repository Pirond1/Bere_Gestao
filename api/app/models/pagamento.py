from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import BaseModel


class PagamentoModel(BaseModel):
    """Uma tentativa de pagamento do pedido no Mercado Pago.

    Um pedido pode ter várias tentativas (PIX expirado, cartão recusado),
    mas no máximo uma aprovada.
    """

    __tablename__ = "pagamentos"

    data_hora = Column(DateTime, server_default=func.now(), nullable=False)
    valor = Column(Numeric(10, 2), nullable=False)
    # ID da order no Mercado Pago — usado para consultar, cancelar e estornar
    codigo_transacao = Column(String(64), nullable=True, unique=True, index=True)
    # Garante que a mesma tentativa nunca gere duas cobranças no gateway
    chave_idempotencia = Column(String(36), nullable=False, unique=True)
    # Motivo devolvido pelo gateway (ex.: insufficient_amount) — explica recusas
    status_detalhe = Column(String(50), nullable=True)
    # Dados do PIX para o cliente reabrir o QR Code enquanto não expira
    expira_em = Column(DateTime, nullable=True)
    qr_code = Column(Text, nullable=True)
    qr_code_base64 = Column(Text(length=16777215), nullable=True)
    ticket_url = Column(Text, nullable=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id"), nullable=False)
    metodo_id = Column(Integer, ForeignKey("metodos_pagamento.id"), nullable=False)
    status_id = Column(Integer, ForeignKey("status_pagamento.id"), nullable=False)

    pedido = relationship("PedidoModel", back_populates="pagamentos")
    metodo = relationship("MetodoPagamentoModel", back_populates="pagamentos")
    status = relationship("StatusPagamentoModel", back_populates="pagamentos")