from sqlalchemy import Boolean, Column, Date, Integer
from sqlalchemy.orm import relationship

from app.db.base import BaseModel


class AgendaModel(BaseModel):
    __tablename__ = "agendas"

    # Cada linha representa um dia de produção e sua capacidade
    data = Column(Date, nullable=False, unique=True, index=True)
    capacidade_maxima = Column(Integer, nullable=False)
    pedidos_registrados = Column(Integer, default=0, nullable=False)
    # Permite a proprietária fechar um dia específico (folga, feriado)
    bloqueada = Column(Boolean, default=False, nullable=False)

    pedidos = relationship("PedidoModel", back_populates="agenda")