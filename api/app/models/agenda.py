from sqlalchemy import Boolean, Column, Date, Integer
from sqlalchemy.orm import relationship

from app.db.base import BaseModel


class AgendaModel(BaseModel):
    __tablename__ = "agendas"

    # Cada linha representa um dia de produção e o que a proprietária ajustou nele
    data = Column(Date, nullable=False, unique=True, index=True)
    # Nulo = segue a capacidade padrão de `configuracoes` (acompanha quando ela muda)
    capacidade_maxima = Column(Integer, nullable=True)
    pedidos_registrados = Column(Integer, default=0, nullable=False)
    # Folga/feriado. Nulo = segue os dias da semana fechados da configuração;
    # true = fechado neste dia; false = aberto como exceção a um dia da semana fechado
    bloqueada = Column(Boolean, nullable=True)

    pedidos = relationship("PedidoModel", back_populates="agenda")
