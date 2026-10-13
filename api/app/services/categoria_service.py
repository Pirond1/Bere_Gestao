from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.categoria import CategoriaModel
from app.schemas.categoria import CategoriaCreate, CategoriaUpdate


def criar(db: Session, dados: CategoriaCreate) -> CategoriaModel:
    if db.query(CategoriaModel).filter(CategoriaModel.nome == dados.nome).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Categoria já cadastrada",
        )
    categoria = CategoriaModel(**dados.model_dump())
    db.add(categoria)
    db.commit()
    db.refresh(categoria)
    return categoria


def listar(db: Session) -> list[CategoriaModel]:
    return db.query(CategoriaModel).order_by(CategoriaModel.nome).all()


def buscar_por_id(db: Session, categoria_id: int) -> CategoriaModel:
    categoria = db.query(CategoriaModel).filter(CategoriaModel.id == categoria_id).first()
    if not categoria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoria não encontrada",
        )
    return categoria


def atualizar(db: Session, categoria_id: int, dados: CategoriaUpdate) -> CategoriaModel:
    categoria = buscar_por_id(db, categoria_id)
    campos = dados.model_dump(exclude_unset=True)
    if campos.get("nome"):
        conflito = db.query(CategoriaModel).filter(
            CategoriaModel.nome == campos["nome"],
            CategoriaModel.id != categoria_id,
        ).first()
        if conflito:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Já existe uma categoria com esse nome",
            )
    for campo, valor in campos.items():
        # Nulo apaga a descrição; no nome significa "não mudar"
        if valor is None and campo != "descricao":
            continue
        setattr(categoria, campo, valor)
    db.commit()
    db.refresh(categoria)
    return categoria


def deletar(db: Session, categoria_id: int) -> None:
    categoria = buscar_por_id(db, categoria_id)
    if categoria.produtos:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Não é possível excluir uma categoria que possui produtos vinculados",
        )
    db.delete(categoria)
    db.commit()