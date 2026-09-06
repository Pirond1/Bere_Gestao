from sqlalchemy import Column, String
from sqlalchemy.orm import relationship

from app.db.base import BaseModel


class StatusPedidoModel(BaseModel):
    __tablename__ = "status_pedido"

    descricao = Column(String(50), nullable=False, unique=True)

    pedidos = relationship("PedidoModel", back_populates="status")