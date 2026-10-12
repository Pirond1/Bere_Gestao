from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.produto import ProdutoModel
from app.schemas.produto import ProdutoCreate, ProdutoUpdate
from app.services import categoria_service


def criar(db: Session, dados: ProdutoCreate) -> ProdutoModel:
    categoria_service.buscar_por_id(db, dados.categoria_id)
    produto = ProdutoModel(**dados.model_dump())
    db.add(produto)
    db.commit()
    db.refresh(produto)
    return produto


def listar(
    db: Session,
    pagina: int = 1,
    limite: int = 20,
    apenas_disponiveis: bool = True,
    categoria_id: Optional[int] = None,
) -> list[ProdutoModel]:
    offset = (pagina - 1) * limite
    query = db.query(ProdutoModel)
    if apenas_disponiveis:
        query = query.filter(ProdutoModel.disponivel == True)
    if categoria_id:
        query = query.filter(ProdutoModel.categoria_id == categoria_id)
    # Ordenação fixa: sem ela a paginação por offset pode repetir ou pular produtos
    return query.order_by(ProdutoModel.nome, ProdutoModel.id).offset(offset).limit(limite).all()


def buscar_por_id(db: Session, produto_id: int) -> ProdutoModel:
    produto = db.query(ProdutoModel).filter(ProdutoModel.id == produto_id).first()
    if not produto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produto não encontrado",
        )
    return produto


def atualizar(db: Session, produto_id: int, dados: ProdutoUpdate) -> ProdutoModel:
    produto = buscar_por_id(db, produto_id)
    campos = dados.model_dump(exclude_unset=True)
    if "categoria_id" in campos and campos["categoria_id"]:
        categoria_service.buscar_por_id(db, campos["categoria_id"])
    for campo, valor in campos.items():
        setattr(produto, campo, valor)
    db.commit()
    db.refresh(produto)
    return produto


def deletar(db: Session, produto_id: int) -> None:
    produto = buscar_por_id(db, produto_id)
    produto.disponivel = False
    db.commit()


def reativar(db: Session, produto_id: int) -> ProdutoModel:
    produto = buscar_por_id(db, produto_id)
    produto.disponivel = True
    db.commit()
    db.refresh(produto)
    return produto