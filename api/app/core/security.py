from datetime import datetime, timedelta, timezone

import bcrypt
from jose import jwt

from app.core.config import settings


def hash_senha(senha: str) -> str:
    return bcrypt.hashpw(senha.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verificar_senha(senha: str, senha_hash: str) -> bool:
    return bcrypt.checkpw(senha.encode("utf-8"), senha_hash.encode("utf-8"))


def validade_sessao(tipo: str | None) -> timedelta:
    if tipo == "admin":
        return timedelta(days=settings.SESSAO_ADMIN_DIAS)
    return timedelta(hours=settings.SESSAO_CLIENTE_HORAS)


def criar_token(dados: dict) -> str:
    """JWT com `sub` (id) e `tipo`. `iat` permite derrubar sessões antigas quando a senha muda."""
    agora = datetime.now(timezone.utc)
    payload = {**dados, "iat": int(agora.timestamp()), "exp": agora + validade_sessao(dados.get("tipo"))}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def token_do_usuario(usuario) -> str:
    return criar_token({"sub": str(usuario.id), "tipo": usuario.tipoUsuario.descricao})


def decodificar_token(token: str) -> dict:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
