from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.deps import get_admin_atual
from app.db.session import get_db
from app.schemas.usuario import UsuarioCreate, UsuarioRead, UsuarioUpdate
from app.services import usuario_service

router = APIRouter(prefix="/usuarios", tags=["Usuários"])


@router.post("/", response_model=UsuarioRead, status_code=status.HTTP_201_CREATED)
def criar_usuario(dados: UsuarioCreate, db: Session = Depends(get_db), _=Depends(get_admin_atual)):
    return usuario_service.criar(db, dados)


@router.get("/", response_model=list[UsuarioRead])
def listar_usuarios(
    pagina: int = 1,
    limite: int = 20,
    db: Session = Depends(get_db),
    _=Depends(get_admin_atual),
):
    return usuario_service.listar(db, pagina, limite)


@router.get("/{usuario_id}", response_model=UsuarioRead)
def buscar_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_admin_atual),
):
    return usuario_service.buscar_por_id(db, usuario_id)


@router.put("/{usuario_id}", response_model=UsuarioRead)
def atualizar_usuario(
    usuario_id: int,
    dados: UsuarioUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_admin_atual),
):
    return usuario_service.atualizar(db, usuario_id, dados)


@router.delete("/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_admin_atual),
):
    usuario_service.deletar(db, usuario_id)