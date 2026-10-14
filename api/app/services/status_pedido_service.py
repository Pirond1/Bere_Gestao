from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.status_pedido import StatusPedidoModel

# Descrições gravadas pela migration de seed — usadas nas regras de negócio
AGUARDANDO_PAGAMENTO = "aguardando_pagamento"
CONFIRMADO = "confirmado"
EM_PRODUCAO = "em_producao"
PRONTO = "pronto"
ENTREGUE = "entregue"
CANCELADO = "cancelado"

# Status em que o cliente ainda pode cancelar o próprio pedido
CANCELAVEIS_PELO_CLIENTE = (AGUARDANDO_PAGAMENTO, CONFIRMADO)

# Etapas que a loja percorre depois do pagamento, uma de cada vez.
# "Confirmado" só é alcançado pelo pagamento aprovado — nunca manualmente.
FLUXO_PRODUCAO = (CONFIRMADO, EM_PRODUCAO, PRONTO, ENTREGUE)

# Pagos e ainda em andamento: se a loja nunca abriu, contam como "pedido novo" no painel
EM_ANDAMENTO = (CONFIRMADO, EM_PRODUCAO, PRONTO)


def listar(db: Session) -> list[StatusPedidoModel]:
    return db.query(StatusPedidoModel).order_by(StatusPedidoModel.id).all()


def buscar_por_id(db: Session, status_id: int) -> StatusPedidoModel:
    status_pedido = db.query(StatusPedidoModel).filter(StatusPedidoModel.id == status_id).first()
    if not status_pedido:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Status de pedido não encontrado",
        )
    return status_pedido


def buscar_por_descricao(db: Session, descricao: str) -> StatusPedidoModel:
    status_pedido = (
        db.query(StatusPedidoModel).filter(StatusPedidoModel.descricao == descricao).first()
    )
    if not status_pedido:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Status '{descricao}' não encontrado — verifique as migrations",
        )
    return status_pedido