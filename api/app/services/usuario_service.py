from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_senha, verificar_senha
from app.models.usuario import UsuarioModel
from app.schemas.usuario import UsuarioCreate, UsuarioUpdate


def criar(db: Session, dados: UsuarioCreate) -> UsuarioModel:
    if db.query(UsuarioModel).filter(UsuarioModel.email == dados.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="E-mail já cadastrado",
        )
    usuario = UsuarioModel(
        email=dados.email,
        senha_hash=hash_senha(dados.senha),
        tipo_id=dados.tipo_id,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


def listar(db: Session, pagina: int = 1, limite: int = 20) -> list[UsuarioModel]:
    offset = (pagina - 1) * limite
    return db.query(UsuarioModel).offset(offset).limit(limite).all()


def buscar_por_id(db: Session, usuario_id: int) -> UsuarioModel:
    usuario = db.query(UsuarioModel).filter(UsuarioModel.id == usuario_id).first()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado",
        )
    return usuario


def atualizar(db: Session, usuario_id: int, dados: UsuarioUpdate) -> UsuarioModel:
    usuario = buscar_por_id(db, usuario_id)
    campos = dados.model_dump(exclude_unset=True)
    if "senha" in campos:
        campos["senha_hash"] = hash_senha(campos.pop("senha"))
    for campo, valor in campos.items():
        setattr(usuario, campo, valor)
    db.commit()
    db.refresh(usuario)
    return usuario


def deletar(db: Session, usuario_id: int) -> None:
    usuario = buscar_por_id(db, usuario_id)
    usuario.ativo = False
    db.commit()


def autenticar(db: Session, email: str, senha: str) -> UsuarioModel:
    usuario = db.query(UsuarioModel).filter(UsuarioModel.email == email).first()
    if not usuario or not verificar_senha(senha, usuario.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha inválidos",
        )
    if not usuario.ativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário inativo",
        )
    return usuario
