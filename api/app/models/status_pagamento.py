from sqlalchemy import Column, String
from sqlalchemy.orm import relationship

from app.db.base import BaseModel


class StatusPagamentoModel(BaseModel):
    __tablename__ = "status_pagamento"

    descricao = Column(String(50), nullable=False, unique=True)

    pagamentos = relationship("PagamentoModel", back_populates="status")