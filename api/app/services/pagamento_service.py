import re
import uuid
from datetime import datetime, timedelta
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.pagamento import PagamentoModel
from app.models.pedido import PedidoModel
from app.schemas.pagamento import PagamentoCreate
from app.services import (
    mercadopago_service as mp,
    metodo_pagamento_service,
    status_pagamento_service,
    status_pedido_service,
)

# Com credenciais de teste o Mercado Pago só aceita os compradores de teste da documentação.
# No PIX, o nome "APRO" faz o pagamento de teste ser aprovado automaticamente.
EMAIL_TESTE_PIX = "test_user_br@testuser.com"
EMAIL_TESTE_CARTAO = "test@testuser.com"
NOME_TESTE_PIX_APROVADO = "APRO"

# Como cada status da order no Mercado Pago se reflete no nosso pagamento
STATUS_POR_ORDER = {
    mp.ORDER_PROCESSADA: status_pagamento_service.APROVADO,
    mp.ORDER_FALHOU: status_pagamento_service.RECUSADO,
    mp.ORDER_CANCELADA: status_pagamento_service.CANCELADO,
    mp.ORDER_EXPIRADA: status_pagamento_service.EXPIRADO,
    mp.ORDER_ESTORNADA: status_pagamento_service.ESTORNADO,
    mp.ORDER_CHARGEBACK: status_pagamento_service.ESTORNADO,
}


def buscar_por_id(db: Session, pagamento_id: int) -> PagamentoModel:
    pagamento = db.query(PagamentoModel).filter(PagamentoModel.id == pagamento_id).first()
    if not pagamento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pagamento não encontrado",
        )
    return pagamento


def _transacao(order: dict) -> dict:
    """Primeira (e única) transação de pagamento da order."""
    pagamentos = (order.get("transactions") or {}).get("payments") or []
    return pagamentos[0] if pagamentos else {}


def _definir_status(db: Session, pagamento: PagamentoModel, descricao: str) -> None:
    pagamento.status_id = status_pagamento_service.buscar_por_descricao(db, descricao).id
    db.flush()
    db.refresh(pagamento, ["status"])


def _estornar(db: Session, pagamento: PagamentoModel) -> None:
    """reverse() do diagrama de classes — estorno total no Mercado Pago."""
    order = mp.estornar_order(pagamento.codigo_transacao)
    pagamento.status_detalhe = order.get("status_detail") or "refunded"
    _definir_status(db, pagamento, status_pagamento_service.ESTORNADO)


def _aplicar_order(db: Session, pagamento: PagamentoModel, order: dict) -> None:
    """Atualiza o pagamento com a order do gateway e reflete no pedido. Não faz commit.

    A order é sempre a consultada no Mercado Pago — nunca o que o frontend envia.
    """
    if pagamento.status.descricao == status_pagamento_service.ESTORNADO:
        # Estado final — um webhook atrasado de "aprovado" não pode reabrir o pagamento
        return
    novo_status = STATUS_POR_ORDER.get(order.get("status"), status_pagamento_service.PENDENTE)
    # A transação traz o motivo mais específico (ex.: insufficient_amount)
    pagamento.status_detalhe = _transacao(order).get("status_detail") or order.get("status_detail")
    _definir_status(db, pagamento, novo_status)

    if novo_status != status_pagamento_service.APROVADO:
        return

    pedido = pagamento.pedido
    situacao = pedido.status.descricao
    outro_aprovado = any(
        p.id != pagamento.id and p.status.descricao == status_pagamento_service.APROVADO
        for p in pedido.pagamentos
    )
    if situacao == status_pedido_service.CANCELADO or outro_aprovado:
        # Pago depois de o pedido ser cancelado, ou cobrança em dobro — devolve o dinheiro
        _estornar(db, pagamento)
    elif situacao == status_pedido_service.AGUARDANDO_PAGAMENTO:
        # RF_F02: pagamento aprovado libera o pedido para produção
        confirmado = status_pedido_service.buscar_por_descricao(db, status_pedido_service.CONFIRMADO)
        pedido.status_id = confirmado.id
        db.flush()
        # Recarrega o relacionamento — quem chamou confere o status logo em seguida
        db.refresh(pedido, ["status"])


def sincronizar(db: Session, pagamento: PagamentoModel) -> PagamentoModel:
    """Consulta o status no Mercado Pago enquanto o pagamento está pendente.

    Funciona como alternativa ao webhook, que não alcança a API rodando em localhost.
    """
    if pagamento.status.descricao == status_pagamento_service.PENDENTE and pagamento.codigo_transacao:
        _aplicar_order(db, pagamento, mp.buscar_order(pagamento.codigo_transacao))
        db.commit()
        db.refresh(pagamento)
    return pagamento


def processar_notificacao(db: Session, order_id: str) -> None:
    """Webhook: busca a order no gateway e atualiza o pagamento correspondente."""
    pagamento = (
        db.query(PagamentoModel).filter(PagamentoModel.codigo_transacao == order_id).first()
    )
    if not pagamento:
        # Order de outra integração ou simulação do painel — nada a fazer
        return
    _aplicar_order(db, pagamento, mp.buscar_order(order_id))
    db.commit()


def _somente_digitos(valor: str) -> str:
    return re.sub(r"\D", "", valor or "")


def _montar_order(pedido: PedidoModel, dados: PagamentoCreate) -> dict:
    cliente = pedido.cliente
    nomes = cliente.nome.split()
    pagador = {
        "email": cliente.usuario.email,
        "first_name": nomes[0],
        "identification": {"type": "CPF", "number": _somente_digitos(cliente.cpf)},
    }
    if len(nomes) > 1:
        pagador["last_name"] = " ".join(nomes[1:])

    valor = f"{pedido.valor_total:.2f}"
    if dados.metodo == metodo_pagamento_service.PIX:
        forma = {"id": "pix", "type": "bank_transfer"}
        transacao = {
            "amount": valor,
            "payment_method": forma,
            "expiration_time": f"PT{settings.PRAZO_PAGAMENTO_MINUTOS}M",
        }
        if settings.MERCADOPAGO_SANDBOX:
            pagador["email"] = EMAIL_TESTE_PIX
            pagador["first_name"] = NOME_TESTE_PIX_APROVADO
    else:
        transacao = {
            "amount": valor,
            "payment_method": {
                "id": dados.bandeira,
                "type": "credit_card",
                "token": dados.token,
                # Decisão do projeto: crédito somente à vista
                "installments": 1,
            },
        }
        if settings.MERCADOPAGO_SANDBOX:
            pagador["email"] = EMAIL_TESTE_CARTAO

    return {
        "type": "online",
        "processing_mode": "automatic",
        "total_amount": valor,
        "external_reference": f"pedido-{pedido.id}",
        "transactions": {"payments": [transacao]},
        "payer": pagador,
    }


def _pendentes(pedido: PedidoModel) -> list[PagamentoModel]:
    return [
        p for p in pedido.pagamentos if p.status.descricao == status_pagamento_service.PENDENTE
    ]


def criar(db: Session, pedido_id: int, dados: PagamentoCreate) -> PagamentoModel:
    """Abre uma nova tentativa de pagamento do pedido no Mercado Pago."""
    # Trava o pedido para dois cliques seguidos não gerarem duas cobranças
    pedido = (
        db.query(PedidoModel).filter(PedidoModel.id == pedido_id).with_for_update().first()
    )
    if not pedido:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido não encontrado")

    # Resolve as tentativas em aberto antes de abrir outra
    for anterior in _pendentes(pedido):
        order = mp.buscar_order(anterior.codigo_transacao)
        _aplicar_order(db, anterior, order)
        if anterior.status.descricao != status_pagamento_service.PENDENTE:
            continue
        mesmo_pix = (
            dados.metodo == metodo_pagamento_service.PIX
            and anterior.metodo.descricao == metodo_pagamento_service.PIX
            and anterior.expira_em
            and anterior.expira_em > datetime.now()
        )
        if mesmo_pix:
            # O QR Code ainda vale — devolve o mesmo em vez de gerar outro
            db.commit()
            return anterior
        if order.get("status") not in (mp.ORDER_CRIADA, mp.ORDER_ACAO_NECESSARIA):
            # Cartão em análise antifraude não pode ser cancelado — só aguardar
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Já existe um pagamento em análise para este pedido. Aguarde a confirmação.",
            )
        # Trocou de método: o PIX antigo não pode mais ser pago
        _aplicar_order(db, anterior, mp.cancelar_order(anterior.codigo_transacao))

    situacao = pedido.status.descricao
    if situacao != status_pedido_service.AGUARDANDO_PAGAMENTO:
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Este pedido já foi pago"
                if situacao != status_pedido_service.CANCELADO
                else "Este pedido foi cancelado"
            ),
        )

    chave = str(uuid.uuid4())
    order = mp.criar_order(_montar_order(pedido, dados), chave)
    meio = _transacao(order).get("payment_method") or {}

    pagamento = PagamentoModel(
        pedido_id=pedido.id,
        valor=Decimal(pedido.valor_total),
        codigo_transacao=order["id"],
        chave_idempotencia=chave,
        metodo_id=metodo_pagamento_service.buscar_por_descricao(db, dados.metodo).id,
        status_id=status_pagamento_service.buscar_por_descricao(
            db, status_pagamento_service.PENDENTE
        ).id,
        qr_code=meio.get("qr_code"),
        qr_code_base64=meio.get("qr_code_base64"),
        ticket_url=meio.get("ticket_url"),
    )
    if dados.metodo == metodo_pagamento_service.PIX:
        pagamento.expira_em = datetime.now() + timedelta(minutes=settings.PRAZO_PAGAMENTO_MINUTOS)
    db.add(pagamento)
    db.flush()
    db.refresh(pagamento, ["pedido", "status"])

    _aplicar_order(db, pagamento, order)
    db.commit()
    db.refresh(pagamento)
    return pagamento


def encerrar(db: Session, pedido: PedidoModel) -> None:
    """Chamado ao cancelar o pedido: cancela o PIX em aberto e estorna o que já foi pago.

    Não faz commit — se o gateway falhar, o cancelamento do pedido é desfeito junto.
    """
    for pagamento in pedido.pagamentos:
        situacao = pagamento.status.descricao
        if situacao == status_pagamento_service.PENDENTE and pagamento.codigo_transacao:
            order = mp.buscar_order(pagamento.codigo_transacao)
            if order.get("status") in (mp.ORDER_CRIADA, mp.ORDER_ACAO_NECESSARIA):
                order = mp.cancelar_order(pagamento.codigo_transacao)
            # Se foi pago nesse meio-tempo, cai no estorno logo abaixo
            situacao = STATUS_POR_ORDER.get(order.get("status"), status_pagamento_service.PENDENTE)
            pagamento.status_detalhe = order.get("status_detail")
            _definir_status(db, pagamento, situacao)

        if situacao == status_pagamento_service.APROVADO:
            _estornar(db, pagamento)


def expirar(db: Session, pagamento: PagamentoModel) -> None:
    """PIX que passou do prazo: confirma no gateway e, se não foi pago, encerra. Não faz commit."""
    order = mp.buscar_order(pagamento.codigo_transacao)
    if order.get("status") in (mp.ORDER_CRIADA, mp.ORDER_ACAO_NECESSARIA):
        mp.cancelar_order(pagamento.codigo_transacao)
        pagamento.status_detalhe = "expired"
        _definir_status(db, pagamento, status_pagamento_service.EXPIRADO)
    else:
        _aplicar_order(db, pagamento, order)


def ultima_atividade(pedido: PedidoModel) -> datetime:
    """Momento da última ação de pagamento — o prazo para pagar conta a partir dele."""
    datas = [pedido.data_pedido] + [p.data_hora for p in pedido.pagamentos]
    return max(datas)


def tem_pendente(pedido: PedidoModel) -> bool:
    return bool(_pendentes(pedido))