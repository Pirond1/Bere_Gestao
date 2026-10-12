from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.endereco import EnderecoModel
from app.schemas.endereco import EnderecoCreate, EnderecoUpdate
from app.services import cliente_service


def criar(db: Session, cliente_id: int, dados: EnderecoCreate) -> EnderecoModel:
    cliente_service.buscar_por_id(db, cliente_id)  # garante que o cliente existe
    endereco = EnderecoModel(**dados.model_dump(), cliente_id=cliente_id)
    db.add(endereco)
    db.commit()
    db.refresh(endereco)
    return endereco


def listar(db: Session, cliente_id: int) -> list[EnderecoModel]:
    cliente_service.buscar_por_id(db, cliente_id)
    return db.query(EnderecoModel).filter(EnderecoModel.cliente_id == cliente_id).all()


def buscar_por_id(db: Session, cliente_id: int, endereco_id: int) -> EnderecoModel:
    endereco = (
        db.query(EnderecoModel)
        .filter(EnderecoModel.id == endereco_id, EnderecoModel.cliente_id == cliente_id)
        .first()
    )
    if not endereco:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Endereço não encontrado",
        )
    return endereco


def atualizar(db: Session, cliente_id: int, endereco_id: int, dados: EnderecoUpdate) -> EnderecoModel:
    endereco = buscar_por_id(db, cliente_id, endereco_id)
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(endereco, campo, valor)
    db.commit()
    db.refresh(endereco)
    return endereco


def deletar(db: Session, cliente_id: int, endereco_id: int) -> None:
    endereco = buscar_por_id(db, cliente_id, endereco_id)
    db.delete(endereco)
    db.commit()