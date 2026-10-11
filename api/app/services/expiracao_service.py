"""Rotina periódica que libera as vagas de pedidos não pagos.

Regra do projeto (BG-5): o pedido reserva a vaga ao ser criado; se não for pago
dentro do prazo, o PIX expira, o pedido é cancelado e a vaga volta para a agenda.
"""

import logging
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.metodo_pagamento import MetodoPagamentoModel
from app.models.pagamento import PagamentoModel
from app.models.pedido import PedidoModel
from app.models.status_pagamento import StatusPagamentoModel
from app.models.status_pedido import StatusPedidoModel
from app.services import (
    metodo_pagamento_service,
    pagamento_service,
    pedido_service,
    status_pagamento_service,
    status_pedido_service,
)

logger = logging.getLogger(__name__)

INTERVALO_SEGUNDOS = 60


def _expirar_pix_vencidos(db: Session) -> None:
    vencidos = (
        db.query(PagamentoModel)
        .join(StatusPagamentoModel)
        .join(MetodoPagamentoModel)
        .filter(
            StatusPagamentoModel.descricao == status_pagamento_service.PENDENTE,
            MetodoPagamentoModel.descricao == metodo_pagamento_service.PIX,
            PagamentoModel.expira_em < datetime.now(),
        )
        .all()
    )
    for pagamento in vencidos:
        try:
            pagamento_service.expirar(db, pagamento)
            db.commit()
        except Exception:
            db.rollback()
            logger.exception("Falha ao expirar o pagamento %s", pagamento.id)


def _cancelar_pedidos_sem_pagamento(db: Session) -> None:
    limite = datetime.now() - timedelta(minutes=settings.PRAZO_PAGAMENTO_MINUTOS)
    aguardando = (
        db.query(PedidoModel)
        .join(StatusPedidoModel)
        .filter(StatusPedidoModel.descricao == status_pedido_service.AGUARDANDO_PAGAMENTO)
        .all()
    )
    for pedido in aguardando:
        # Pagamento em andamento (PIX válido ou cartão em análise) segura o pedido
        if pagamento_service.tem_pendente(pedido):
            continue
        if pagamento_service.ultima_atividade(pedido) >= limite:
            continue
        try:
            pedido_service.cancelar(db, pedido.id, e_admin=True)
            logger.info("Pedido %s cancelado por falta de pagamento", pedido.id)
        except Exception:
            db.rollback()
            logger.exception("Falha ao cancelar o pedido %s sem pagamento", pedido.id)


def executar() -> None:
    db = SessionLocal()
    try:
        _expirar_pix_vencidos(db)
        _cancelar_pedidos_sem_pagamento(db)
    finally:
        db.close()