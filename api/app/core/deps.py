from datetime import timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.security import decodificar_token
from app.db.session import get_db
from app.models.cliente import ClienteModel
from app.models.usuario import UsuarioModel

http_bearer = HTTPBearer()
http_bearer_opcional = HTTPBearer(auto_error=False)


def _sessao_valida(usuario: Optional[UsuarioModel], payload: dict) -> bool:
    """Conta ativa e token emitido depois da última troca de senha (derruba as outras sessões)."""
    if usuario is None or not usuario.ativo:
        return False
    if usuario.senha_alterada_em is not None:
        emitido_em = payload.get("iat")
        trocada_em = int(usuario.senha_alterada_em.replace(tzinfo=timezone.utc).timestamp())
        if emitido_em is None or emitido_em < trocada_em:
            return False
    return True


def get_usuario_atual(
    credentials: HTTPAuthorizationCredentials = Depends(http_bearer),
    db: Session = Depends(get_db),
) -> UsuarioModel:
    token = credentials.credentials
    erro_credencial = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido ou expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decodificar_token(token)
        usuario_id = payload.get("sub")
        if usuario_id is None:
            raise erro_credencial
    except JWTError:
        raise erro_credencial

    usuario = db.query(UsuarioModel).filter(UsuarioModel.id == int(usuario_id)).first()
    if not _sessao_valida(usuario, payload):
        raise erro_credencial
    return usuario


def get_usuario_opcional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer_opcional),
    db: Session = Depends(get_db),
) -> Optional[UsuarioModel]:
    if credentials is None:
        return None
    try:
        payload = decodificar_token(credentials.credentials)
        usuario_id = payload.get("sub")
        if usuario_id is None:
            return None
        usuario = db.query(UsuarioModel).filter(UsuarioModel.id == int(usuario_id)).first()
        return usuario if _sessao_valida(usuario, payload) else None
    except JWTError:
        return None


def get_admin_atual(usuario: UsuarioModel = Depends(get_usuario_atual)) -> UsuarioModel:
    if usuario.tipoUsuario.descricao != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a administrador",
        )
    return usuario


def get_cliente_atual(usuario: UsuarioModel = Depends(get_usuario_atual)) -> ClienteModel:
    """Retorna o cliente vinculado ao usuário logado — usado nas ações do perfil cliente."""
    if usuario.cliente is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ação disponível apenas para clientes",
        )
    return usuario.cliente


def verificar_acesso_cliente(usuario_atual: UsuarioModel, cliente: ClienteModel) -> None:
    admin = usuario_atual.tipoUsuario.descricao == "admin"
    dono = usuario_atual.id == cliente.usuario_id
    if not admin and not dono:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado",
        )