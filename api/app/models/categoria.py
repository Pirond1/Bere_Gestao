from sqlalchemy import Column, String
from sqlalchemy.orm import relationship

from app.db.base import BaseModel


class CategoriaModel(BaseModel):
    __tablename__ = "categorias"

    nome = Column(String(100), nullable=False, unique=True)
    descricao = Column(String(255), nullable=True)

    produtos = relationship("ProdutoModel", back_populates="categoria")