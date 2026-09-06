from sqlalchemy import Column, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import BaseModel


class AvaliacaoModel(BaseModel):
    __tablename__ = "avaliacoes"

    # Nota NPS de 0 a 10, coletada após a entrega do pedido
    nota = Column(Integer, nullable=False)
    comentario = Column(Text, nullable=True)
    data_avaliacao = Column(DateTime, server_default=func.now(), nullable=False)
    pedido_id = Column(Integer, ForeignKey("pedidos.id"), unique=True, nullable=False)

    pedido = relationship("PedidoModel", back_populates="avaliacao")