from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.deps import get_usuario_atual, verificar_acesso_cliente
from app.db.session import get_db
from app.models.usuario import UsuarioModel
from app.schemas.avaliacao import AvaliacaoCreate, AvaliacaoRead
from app.services import avaliacao_service, pedido_service

router = APIRouter(prefix="/pedidos/{pedido_id}/avaliacao", tags=["Avaliações"])


@router.post("/", response_model=AvaliacaoRead, status_code=status.HTTP_201_CREATED)
def criar_avaliacao(
    pedido_id: int,
    dados: AvaliacaoCreate,
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(get_usuario_atual),
):
    pedido = pedido_service.buscar_por_id(db, pedido_id)
    verificar_acesso_cliente(usuario_atual, pedido.cliente)
    return avaliacao_service.criar(db, pedido_id, dados)


@router.get("/", response_model=AvaliacaoRead)
def buscar_avaliacao(
    pedido_id: int,
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(get_usuario_atual),
):
    pedido = pedido_service.buscar_por_id(db, pedido_id)
    verificar_acesso_cliente(usuario_atual, pedido.cliente)
    return avaliacao_service.buscar_por_pedido(db, pedido_id)