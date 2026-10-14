from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_admin_atual, get_usuario_atual, verificar_acesso_cliente
from app.db.session import get_db
from app.models.usuario import UsuarioModel
from app.schemas.cliente import (
    ClienteCreate,
    ClienteDetalheRead,
    ClientePainelPagina,
    ClienteRead,
    ClienteUpdate,
)
from app.schemas.endereco import EnderecoCreate, EnderecoRead
from app.services import cliente_service, endereco_service

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


# Rotas do painel antes de "/{cliente_id}" para "painel" não ser lido como id
@router.get("/painel", response_model=ClientePainelPagina)
def listar_clientes_painel(
    busca: Optional[str] = Query(default=None, max_length=100),
    pagina: int = Query(default=1, ge=1),
    limite: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _=Depends(get_admin_atual),
):
    """Clientes com resumo de compras. `busca` procura no nome, e-mail, CPF ou telefone."""
    return cliente_service.listar_painel(db, busca, pagina, limite)


@router.get("/{cliente_id}/painel", response_model=ClienteDetalheRead)
def buscar_cliente_painel(cliente_id: int, db: Session = Depends(get_db), _=Depends(get_admin_atual)):
    return cliente_service.detalhe_painel(db, cliente_id)


@router.put("/{cliente_id}/endereco", response_model=EnderecoRead)
def salvar_endereco_cliente(
    cliente_id: int,
    dados: EnderecoCreate,
    db: Session = Depends(get_db),
    _=Depends(get_admin_atual),
):
    """A loja cadastra ou corrige o endereço do cliente (um por cliente), conferido com o CEP."""
    return endereco_service.salvar_do_cliente(db, cliente_service.buscar_por_id(db, cliente_id), dados)


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