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
    if usuario is None or not usuario.ativo:
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
        if usuario is None or not usuario.ativo:
            return None
        return usuario
    except JWTError:
        return None


def get_admin_atual(usuario: UsuarioModel = Depends(get_usuario_atual)) -> UsuarioModel:
    if usuario.tipoUsuario.descricao != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a administrador",
        )
    return usuario


def verificar_acesso_cliente(usuario_atual: UsuarioModel, cliente: ClienteModel) -> None:
    admin = usuario_atual.tipoUsuario.descricao == "admin"
    dono = usuario_atual.id == cliente.usuario_id
    if not admin and not dono:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado",
        )