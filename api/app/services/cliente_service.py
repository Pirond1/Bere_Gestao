from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.cliente import ClienteModel
from app.schemas.cliente import ClienteCreate, ClienteUpdate


def criar(db: Session, dados: ClienteCreate) -> ClienteModel:
    if db.query(ClienteModel).filter(ClienteModel.cpf == dados.cpf).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="CPF já cadastrado",
        )
    if db.query(ClienteModel).filter(ClienteModel.usuario_id == dados.usuario_id).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Usuário já possui um perfil de cliente",
        )
    cliente = ClienteModel(
        **dados.model_dump(),
        data_assinatura=date.today(),
    )
    db.add(cliente)
    db.commit()
    db.refresh(cliente)
    return cliente


def listar(db: Session, pagina: int = 1, limite: int = 20) -> list[ClienteModel]:
    offset = (pagina - 1) * limite
    return db.query(ClienteModel).offset(offset).limit(limite).all()


def buscar_por_id(db: Session, cliente_id: int) -> ClienteModel:
    cliente = db.query(ClienteModel).filter(ClienteModel.id == cliente_id).first()
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado",
        )
    return cliente


def atualizar(db: Session, cliente_id: int, dados: ClienteUpdate) -> ClienteModel:
    cliente = buscar_por_id(db, cliente_id)
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(cliente, campo, valor)
    db.commit()
    db.refresh(cliente)
    return cliente


def deletar(db: Session, cliente_id: int) -> None:
    cliente = buscar_por_id(db, cliente_id)

    # anonimiza dados pessoais conforme LGPD — libera email e CPF para re-cadastro
    cliente.usuario.email = f"deletado_{cliente.usuario.id}@removido.com"
    cliente.usuario.ativo = False
    cliente.nome = "Conta removida"
    cliente.cpf = f"DEL_{cliente.id}"
    cliente.telefone = None
    cliente.data_nascimento = None

    db.commit()