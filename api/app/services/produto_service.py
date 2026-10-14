from typing import Optional

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.models.produto import ProdutoModel
from app.schemas.produto import ProdutoCreate, ProdutoUpdate
from app.services import categoria_service, imagem_service

SEM_FOTO_NA_VITRINE = (
    "Envie uma foto antes de colocar o produto na vitrine — a foto é obrigatória (RF_B02)"
)


def _exigir_foto(produto: ProdutoModel) -> None:
    if not produto.foto:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=SEM_FOTO_NA_VITRINE)


def criar(db: Session, dados: ProdutoCreate) -> ProdutoModel:
    """Cria fora da vitrine: a foto vem em seguida (POST /produtos/{id}/foto) e só então ele aparece."""
    categoria_service.buscar_por_id(db, dados.categoria_id)
    produto = ProdutoModel(**{**dados.model_dump(), "disponivel": False})
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
    if campos.get("disponivel"):
        _exigir_foto(produto)
    for campo, valor in campos.items():
        # Nulo significa "não mudar" (descrição nula o schema já recusa)
        if valor is None:
            continue
        setattr(produto, campo, valor)
    db.commit()
    db.refresh(produto)
    return produto


def deletar(db: Session, produto_id: int) -> None:
    """Apaga de vez um produto cadastrado por engano. Já vendido, só pode ser desativado."""
    produto = buscar_por_id(db, produto_id)
    if produto.itens_pedido:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este produto já foi vendido e faz parte do histórico de pedidos — desative-o em vez de excluir",
        )
    foto = produto.foto
    db.delete(produto)
    db.commit()
    imagem_service.remover(foto)


def desativar(db: Session, produto_id: int) -> ProdutoModel:
    """Tira o produto da vitrine sem perder o histórico."""
    produto = buscar_por_id(db, produto_id)
    produto.disponivel = False
    db.commit()
    db.refresh(produto)
    return produto


def reativar(db: Session, produto_id: int) -> ProdutoModel:
    produto = buscar_por_id(db, produto_id)
    _exigir_foto(produto)
    produto.disponivel = True
    db.commit()
    db.refresh(produto)
    return produto

async def trocar_foto(db: Session, produto_id: int, arquivo: UploadFile) -> ProdutoModel:
    """Salva a nova foto e só então apaga a anterior — se o envio falhar, a antiga continua."""
    produto = buscar_por_id(db, produto_id)
    anterior = produto.foto
    produto.foto = await imagem_service.salvar_foto_produto(arquivo, produto.id)
    db.commit()
    db.refresh(produto)
    imagem_service.remover(anterior)
    return produto


def remover_foto(db: Session, produto_id: int) -> ProdutoModel:
    """Só para produto fora da vitrine — na vitrine a foto é obrigatória (dá para trocar, não remover)."""
    produto = buscar_por_id(db, produto_id)
    if produto.disponivel:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Produto na vitrine precisa de foto — troque a foto ou desative o produto antes",
        )
    anterior = produto.foto
    produto.foto = None
    db.commit()
    db.refresh(produto)
    imagem_service.remover(anterior)
    return produto
