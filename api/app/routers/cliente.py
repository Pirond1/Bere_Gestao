from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.deps import get_admin_atual, get_usuario_atual, verificar_acesso_cliente
from app.db.session import get_db
from app.models.usuario import UsuarioModel
from app.schemas.cliente import ClienteCreate, ClienteRead, ClienteUpdate
from app.services import cliente_service

router = APIRouter(prefix="/clientes", tags=["Clientes"])


@router.post("/", response_model=ClienteRead, status_code=status.HTTP_201_CREATED)
def criar_cliente(dados: ClienteCreate, db: Session = Depends(get_db), _=Depends(get_admin_atual)):
    return cliente_service.criar(db, dados)


@router.get("/", response_model=list[ClienteRead])
def listar_clientes(
    pagina: int = 1,
    limite: int = 20,
    db: Session = Depends(get_db),
    _=Depends(get_admin_atual),
):
    return cliente_service.listar(db, pagina, limite)


@router.get("/{cliente_id}", response_model=ClienteRead)
def buscar_cliente(
    cliente_id: int,
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(get_usuario_atual),
):
    cliente = cliente_service.buscar_por_id(db, cliente_id)
    verificar_acesso_cliente(usuario_atual, cliente)
    return cliente


@router.put("/{cliente_id}", response_model=ClienteRead)
def atualizar_cliente(
    cliente_id: int,
    dados: ClienteUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_admin_atual),
):
    return cliente_service.atualizar(db, cliente_id, dados)


@router.delete("/{cliente_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_cliente(
    cliente_id: int,
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(get_usuario_atual),
):
    cliente = cliente_service.buscar_por_id(db, cliente_id)
    verificar_acesso_cliente(usuario_atual, cliente)
    cliente_service.deletar(db, cliente_id)