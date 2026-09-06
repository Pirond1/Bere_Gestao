from sqlalchemy import Boolean, Column, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship

from app.db.base import BaseModel


class ProdutoModel(BaseModel):
    __tablename__ = "produtos"

    nome = Column(String(100), nullable=False)
    descricao = Column(Text, nullable=True)
    preco = Column(Numeric(10, 2), nullable=False)
    foto = Column(String(255), nullable=True)
    disponivel = Column(Boolean, default=True, nullable=False)
    categoria_id = Column(Integer, ForeignKey("categorias.id"), nullable=True)

    categoria = relationship("CategoriaModel", back_populates="produtos")
    itens_pedido = relationship("ItemPedidoModel", back_populates="produto")