from sqlalchemy import Column, String
from sqlalchemy.orm import relationship

from app.db.base import BaseModel


class MetodoPagamentoModel(BaseModel):
    __tablename__ = "metodos_pagamento"

    descricao = Column(String(50), nullable=False, unique=True)

    pagamentos = relationship("PagamentoModel", back_populates="metodo")