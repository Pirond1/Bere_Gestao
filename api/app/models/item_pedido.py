from sqlalchemy import Column, ForeignKey, Integer, Numeric
from sqlalchemy.orm import relationship

from app.db.base import BaseModel


class ItemPedidoModel(BaseModel):
    __tablename__ = "itens_pedido"

    quantidade = Column(Integer, nullable=False)
    # Congela o preço do produto no momento do pedido — alterações futuras não afetam pedidos antigos
    preco_unitario = Column(Numeric(10, 2), nullable=False)
    subtotal = Column(Numeric(10, 2), nullable=False)
    pedido_id = Column(Integer, ForeignKey("pedidos.id"), nullable=False)
    produto_id = Column(Integer, ForeignKey("produtos.id"), nullable=False)

    pedido = relationship("PedidoModel", back_populates="itens")
    produto = relationship("ProdutoModel", back_populates="itens_pedido")