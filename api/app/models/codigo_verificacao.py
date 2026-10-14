from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.db.base import BaseModel


class CodigoVerificacaoModel(BaseModel):
    """Código de 6 dígitos enviado por e-mail (cadastro, recuperação de senha, troca de e-mail)."""

    __tablename__ = "codigos_verificacao"

    # Para que serve — constantes em services/codigo_service.py
    finalidade = Column(String(30), nullable=False)
    # Endereço que recebeu o código (no cadastro e na troca, o e-mail ainda não está na conta)
    email = Column(String(150), nullable=False, index=True)
    # HMAC do código com a SECRET_KEY — o número em si nunca é gravado
    codigo_hash = Column(String(64), nullable=False)
    tentativas = Column(Integer, nullable=False, default=0)
    # Datas em UTC, como o restante do banco
    expira_em = Column(DateTime, nullable=False)
    usado_em = Column(DateTime, nullable=True)
    # Conta envolvida (recuperação e troca); nulo no cadastro, que ainda não tem conta
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    # Cadastro pendente: dados do formulário com a senha já em hash, até o código ser confirmado
    dados = Column(JSON, nullable=True)

    usuario = relationship("UsuarioModel")
