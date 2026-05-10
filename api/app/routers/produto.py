from typing import Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.deps import get_admin_atual, get_usuario_opcional
from app.db.session import get_db
from app.models.usuario import UsuarioModel
from app.schemas.produto import ProdutoCreate, ProdutoRead, ProdutoUpdate
from app.services import produto_service

router = APIRouter(prefix="/produtos", tags=["Produtos"])


@router.post("/", response_model=ProdutoRead, status_code=status.HTTP_201_CREATED)
def criar_produto(dados: ProdutoCreate, db: Session = Depends(get_db), _=Depends(get_admin_atual)):
    return produto_service.criar(db, dados)


@router.get("/", response_model=list[ProdutoRead])
def listar_produtos(
    pagina: int = 1,
    limite: int = 20,
    apenas_disponiveis: bool = True,
    db: Session = Depends(get_db),
    usuario_atual: Optional[UsuarioModel] = Depends(get_usuario_opcional),
):
    e_admin = (usuario_atual is not None
        and usuario_atual.tipoUsuario.descricao == "admin"
    )
    if not e_admin:
        apenas_disponiveis = True
    return produto_service.listar(db, pagina, limite, apenas_disponiveis)


@router.get("/{produto_id}", response_model=ProdutoRead)
def buscar_produto(produto_id: int, db: Session = Depends(get_db)):
    return produto_service.buscar_por_id(db, produto_id)


@router.put("/{produto_id}", response_model=ProdutoRead)
def atualizar_produto(
    produto_id: int,
    dados: ProdutoUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_admin_atual),
):
    return produto_service.atualizar(db, produto_id, dados)


@router.patch("/{produto_id}/reativar", response_model=ProdutoRead)
def reativar_produto(
    produto_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_admin_atual),
):
    return produto_service.reativar(db, produto_id)


@router.delete("/{produto_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_produto(
    produto_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_admin_atual),
):
    produto_service.deletar(db, produto_id)