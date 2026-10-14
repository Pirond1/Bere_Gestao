from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.db.base import BaseModel


class UsuarioModel(BaseModel):
    __tablename__ = "usuarios"

    email = Column(String(150), unique=True, nullable=False, index=True)
    senha_hash = Column(String(255), nullable=False)
    ativo = Column(Boolean, default=True, nullable=False)
    tipo_id = Column(Integer, ForeignKey("tipos_usuario.id"), nullable=False)
    # Última troca de senha (UTC). Tokens emitidos antes disso deixam de valer — derruba as outras sessões
    senha_alterada_em = Column(DateTime, nullable=True)

    tipoUsuario = relationship("TipoUsuarioModel", back_populates="usuarios")
    cliente = relationship("ClienteModel", back_populates="usuario", uselist=False)