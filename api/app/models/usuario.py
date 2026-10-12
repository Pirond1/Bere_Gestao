from sqlalchemy import Column, String, Boolean, Integer, ForeignKey
from sqlalchemy.orm import relationship

from app.db.base import BaseModel


class UsuarioModel(BaseModel):
    __tablename__ = "usuarios"

    email = Column(String(150), unique=True, nullable=False, index=True)
    senha_hash = Column(String(255), nullable=False)
    ativo = Column(Boolean, default=True, nullable=False)
    tipo_id = Column(Integer, ForeignKey("tipos_usuario.id"), nullable=False)

    tipoUsuario = relationship("TipoUsuarioModel", back_populates="usuarios")
    cliente = relationship("ClienteModel", back_populates="usuario", uselist=False)