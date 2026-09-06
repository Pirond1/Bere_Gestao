from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.deps import (
    get_admin_atual,
    get_cliente_atual,
    get_usuario_atual,
    verificar_acesso_cliente,
)
from app.db.session import get_db
from app.models.cliente import ClienteModel
from app.models.usuario import UsuarioModel
from app.schemas.pedido import PedidoCreate, PedidoRead, PedidoStatusUpdate
from app.services import pedido_service

router = APIRouter(prefix="/pedidos", tags=["Pedidos"])


@router.post("/", response_model=PedidoRead, status_code=status.HTTP_201_CREATED)
def criar_pedido(
    dados: PedidoCreate,
    db: Session = Depends(get_db),
    cliente_atual: ClienteModel = Depends(get_cliente_atual),
):
    return pedido_service.criar(db, cliente_atual.id, dados)


@router.get("/", response_model=list[PedidoRead])
def listar_pedidos(
    status_id: Optional[int] = None,
    data_retirada: Optional[date] = None,
    cliente_id: Optional[int] = None,
    pagina: int = 1,
    limite: int = 20,
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(get_usuario_atual),
):
    """Admin enxerga todos os pedidos; cliente enxerga somente os próprios."""
    e_admin = usuario_atual.tipoUsuario.descricao == "admin"
    if not e_admin:
        cliente_id = get_cliente_atual(usuario_atual).id
    return pedido_service.listar(db, cliente_id, status_id, data_retirada, pagina, limite)


@router.get("/{pedido_id}", response_model=PedidoRead)
def buscar_pedido(
    pedido_id: int,
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(get_usuario_atual),
):
    pedido = pedido_service.buscar_por_id(db, pedido_id)
    verificar_acesso_cliente(usuario_atual, pedido.cliente)
    return pedido


@router.patch("/{pedido_id}/status", response_model=PedidoRead)
def atualizar_status_pedido(
    pedido_id: int,
    dados: PedidoStatusUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_admin_atual),
):
    return pedido_service.atualizar_status(db, pedido_id, dados.status_id)


@router.patch("/{pedido_id}/cancelar", response_model=PedidoRead)
def cancelar_pedido(
    pedido_id: int,
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(get_usuario_atual),
):
    pedido = pedido_service.buscar_por_id(db, pedido_id)
    verificar_acesso_cliente(usuario_atual, pedido.cliente)
    e_admin = usuario_atual.tipoUsuario.descricao == "admin"
    return pedido_service.cancelar(db, pedido_id, e_admin)