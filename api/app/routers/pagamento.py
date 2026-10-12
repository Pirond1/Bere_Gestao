from typing import Optional

from fastapi import APIRouter, Body, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.deps import get_cliente_atual, get_usuario_atual, verificar_acesso_cliente
from app.db.session import get_db
from app.models.cliente import ClienteModel
from app.models.usuario import UsuarioModel
from app.schemas.pagamento import PagamentoCreate, PagamentoRead
from app.services import mercadopago_service, pagamento_service, pedido_service

router = APIRouter(tags=["Pagamentos"])


@router.post(
    "/pedidos/{pedido_id}/pagamentos",
    response_model=PagamentoRead,
    status_code=status.HTTP_201_CREATED,
)
def criar_pagamento(
    pedido_id: int,
    dados: PagamentoCreate,
    db: Session = Depends(get_db),
    cliente_atual: ClienteModel = Depends(get_cliente_atual),
):
    """Gera o PIX ou cobra o cartão. O valor vem sempre do pedido salvo no banco."""
    pedido = pedido_service.buscar_por_id(db, pedido_id)
    if pedido.cliente_id != cliente_atual.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")
    return pagamento_service.criar(db, pedido_id, dados)


@router.get("/pedidos/{pedido_id}/pagamentos", response_model=list[PagamentoRead])
def listar_pagamentos(
    pedido_id: int,
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(get_usuario_atual),
):
    pedido = pedido_service.buscar_por_id(db, pedido_id)
    verificar_acesso_cliente(usuario_atual, pedido.cliente)
    return pedido.pagamentos


@router.get("/pagamentos/{pagamento_id}", response_model=PagamentoRead)
def buscar_pagamento(
    pagamento_id: int,
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(get_usuario_atual),
):
    """Consultado pela tela do PIX até o pagamento sair de "pendente"."""
    pagamento = pagamento_service.buscar_por_id(db, pagamento_id)
    verificar_acesso_cliente(usuario_atual, pagamento.pedido.cliente)
    return pagamento_service.sincronizar(db, pagamento)


@router.post("/pagamentos/webhook", status_code=status.HTTP_200_OK, include_in_schema=False)
def webhook_mercadopago(
    request: Request,
    corpo: dict = Body(default_factory=dict),
    db: Session = Depends(get_db),
    x_signature: Optional[str] = Header(default=None),
    x_request_id: Optional[str] = Header(default=None),
):
    """Notificações do tópico "Order" configuradas no painel do Mercado Pago."""
    data_id = request.query_params.get("data.id")
    if not mercadopago_service.assinatura_valida(x_signature, x_request_id, data_id):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Assinatura inválida")

    order_id = (corpo.get("data") or {}).get("id") or data_id
    if corpo.get("type") == "order" and order_id:
        # Erro aqui devolve 5xx e o Mercado Pago reenvia a notificação mais tarde
        pagamento_service.processar_notificacao(db, order_id)
    return {"recebido": True}