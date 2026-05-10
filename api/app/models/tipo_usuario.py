from sqlalchemy import Column, String
from sqlalchemy.orm import relationship

from app.db.base import BaseModel


class TipoUsuarioModel(BaseModel):
    __tablename__ = "tipos_usuario"

    descricao = Column(String(50), nullable=False, unique=True)

    usuarios = relationship("UsuarioModel", back_populates="tipoUsuario")