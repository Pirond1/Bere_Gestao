from sqlalchemy import Column, String, Date, Integer, ForeignKey
from sqlalchemy.orm import relationship

from app.db.base import BaseModel


class ClienteModel(BaseModel):
    __tablename__ = "clientes"

    nome = Column(String(100), nullable=False)
    cpf = Column(String(14), unique=True, nullable=False, index=True)
    telefone = Column(String(20), nullable=True)
    data_nascimento = Column(Date, nullable=True)
    data_assinatura = Column(Date, nullable=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), unique=True, nullable=False)

    usuario = relationship("UsuarioModel", back_populates="cliente")
    enderecos = relationship("EnderecoModel", back_populates="cliente")
    pedidos = relationship("PedidoModel", back_populates="cliente")