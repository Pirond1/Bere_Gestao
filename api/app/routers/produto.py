from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
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


def _e_admin(usuario: Optional[UsuarioModel]) -> bool:
    return usuario is not None and usuario.tipoUsuario.descricao == "admin"


@router.get("/", response_model=list[ProdutoRead])
def listar_produtos(
    pagina: int = Query(default=1, ge=1),
    limite: int = Query(default=20, ge=1, le=100),
    apenas_disponiveis: bool = True,
    categoria_id: Optional[int] = None,
    db: Session = Depends(get_db),
    usuario_atual: Optional[UsuarioModel] = Depends(get_usuario_opcional),
):
    """Vitrine pública: visitantes e clientes só enxergam produtos disponíveis."""
    if not _e_admin(usuario_atual):
        apenas_disponiveis = True
    return produto_service.listar(db, pagina, limite, apenas_disponiveis, categoria_id)


@router.get("/{produto_id}", response_model=ProdutoRead)
def buscar_produto(
    produto_id: int,
    db: Session = Depends(get_db),
    usuario_atual: Optional[UsuarioModel] = Depends(get_usuario_opcional),
):
    produto = produto_service.buscar_por_id(db, produto_id)
    # Produto desativado some da vitrine também pelo link direto — só o admin ainda o vê
    if not produto.disponivel and not _e_admin(usuario_atual):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produto não encontrado",
        )
    return produto


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