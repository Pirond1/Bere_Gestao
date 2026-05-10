from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship

from app.db.base import BaseModel


class EnderecoModel(BaseModel):
    __tablename__ = "enderecos"

    rua = Column(String(150), nullable=False)
    numero = Column(String(10), nullable=False)
    complemento = Column(String(100), nullable=True)
    bairro = Column(String(100), nullable=False)
    cep = Column(String(9), nullable=False)
    cidade = Column(String(100), nullable=False)
    uf = Column(String(2), nullable=False)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)

    cliente = relationship("ClienteModel", back_populates="enderecos")