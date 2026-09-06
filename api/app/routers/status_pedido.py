from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_usuario_atual
from app.db.session import get_db
from app.schemas.status_pedido import StatusPedidoRead
from app.services import status_pedido_service

router = APIRouter(prefix="/status-pedido", tags=["Status de Pedido"])


@router.get("/", response_model=list[StatusPedidoRead])
def listar_status(db: Session = Depends(get_db), _=Depends(get_usuario_atual)):
    return status_pedido_service.listar(db)