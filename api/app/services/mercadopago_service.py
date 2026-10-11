"""Cliente da Orders API do Mercado Pago (Checkout Transparente).

Só conversa com o gateway — as regras de negócio ficam em pagamento_service.
Referência: https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/overview
"""

import hashlib
import hmac
import logging
import uuid
from typing import Optional

import httpx
from fastapi import HTTPException, status

from app.core.config import settings

logger = logging.getLogger(__name__)

BASE_URL = "https://api.mercadopago.com"
TIMEOUT_SEGUNDOS = 15

# Status da order no Mercado Pago (campo "status")
ORDER_CRIADA = "created"
ORDER_PROCESSANDO = "processing"
ORDER_ACAO_NECESSARIA = "action_required"
ORDER_PROCESSADA = "processed"
ORDER_FALHOU = "failed"
ORDER_CANCELADA = "canceled"
ORDER_EXPIRADA = "expired"
ORDER_ESTORNADA = "refunded"
ORDER_CHARGEBACK = "charged_back"

# Mensagens para o cliente a partir do status_detail das transações recusadas
MOTIVOS_RECUSA = {
    "bad_filled_card_data": "Confira os dados do cartão (número, validade e código de segurança).",
    "invalid_card_token": "Não foi possível validar o cartão. Preencha os dados novamente.",
    "high_risk": "O pagamento foi recusado pela análise de segurança. Tente outro cartão ou o PIX.",
    "rejected_by_issuer": "O banco emissor recusou o pagamento. Tente outro cartão ou o PIX.",
    "required_call_for_authorize": "O banco emissor pede que você autorize o pagamento com ele.",
    "max_attempts_exceeded": "Você atingiu o limite de tentativas. Tente outro cartão ou o PIX.",
    "card_disabled": "Este cartão está bloqueado. Fale com seu banco ou use outro cartão.",
    "insufficient_amount": "O cartão não tem limite suficiente.",
    "card_insufficient_amount": "O cartão não tem limite suficiente.",
    "amount_limit_exceeded": "O valor ultrapassa o limite permitido para este cartão.",
    "invalid_installments": "O cartão não aceita esta forma de pagamento.",
    "processing_error": "Ocorreu um erro ao processar o pagamento. Tente novamente.",
}
MOTIVO_RECUSA_PADRAO = "O pagamento não foi aprovado. Tente outro cartão ou o PIX."


def motivo_recusa(status_detalhe: Optional[str]) -> str:
    return MOTIVOS_RECUSA.get(status_detalhe or "", MOTIVO_RECUSA_PADRAO)


def _headers(chave_idempotencia: Optional[str] = None) -> dict:
    token = settings.MERCADOPAGO_ACCESS_TOKEN
    if not token or not token.startswith(("APP_USR-", "TEST-")):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Pagamento online indisponível no momento",
        )
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    if chave_idempotencia:
        headers["X-Idempotency-Key"] = chave_idempotencia
    return headers


def _requisitar(metodo: str, caminho: str, chave_idempotencia: Optional[str] = None, json: Optional[dict] = None) -> dict:
    try:
        resposta = httpx.request(
            metodo,
            f"{BASE_URL}{caminho}",
            headers=_headers(chave_idempotencia),
            json=json,
            timeout=TIMEOUT_SEGUNDOS,
        )
    except httpx.HTTPError as erro:
        logger.error("Falha de comunicação com o Mercado Pago em %s %s: %s", metodo, caminho, erro)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Não foi possível se comunicar com o Mercado Pago. Tente novamente.",
        )

    if resposta.is_success:
        return resposta.json() if resposta.content else {}

    corpo = resposta.json() if "application/json" in resposta.headers.get("content-type", "") else {}
    # 402: a order foi criada, mas a transação falhou (ex.: cartão recusado).
    # O corpo traz a order em "data" — é recusa, não erro de comunicação.
    if resposta.status_code == 402 and isinstance(corpo.get("data"), dict) and corpo["data"].get("id"):
        return corpo["data"]

    logger.error(
        "Mercado Pago respondeu %s em %s %s (x-request-id=%s): %s",
        resposta.status_code, metodo, caminho, resposta.headers.get("x-request-id"), resposta.text,
    )
    if resposta.status_code >= 500:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="O Mercado Pago está instável no momento. Tente novamente em instantes.",
        )
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="O Mercado Pago não aceitou o pagamento. Confira os dados e tente novamente.",
    )


def criar_order(dados: dict, chave_idempotencia: str) -> dict:
    return _requisitar("POST", "/v1/orders", chave_idempotencia, dados)


def buscar_order(order_id: str) -> dict:
    return _requisitar("GET", f"/v1/orders/{order_id}")


def cancelar_order(order_id: str) -> dict:
    """Cancela uma order ainda não paga (status action_required)."""
    return _requisitar("POST", f"/v1/orders/{order_id}/cancel", str(uuid.uuid4()))


def estornar_order(order_id: str) -> dict:
    """Estorno total — corpo vazio devolve o valor inteiro ao comprador."""
    return _requisitar("POST", f"/v1/orders/{order_id}/refund", str(uuid.uuid4()))


def assinatura_valida(x_signature: Optional[str], x_request_id: Optional[str], data_id: Optional[str]) -> bool:
    """Valida o header x-signature do webhook (HMAC-SHA256 com o secret do painel).

    Manifest: id:[data.id];request-id:[x-request-id];ts:[ts];
    Partes ausentes são removidas do manifest, conforme a documentação.
    """
    secret = settings.MERCADOPAGO_WEBHOOK_SECRET
    if not secret or not x_signature:
        return False

    partes = dict(
        parte.strip().split("=", 1) for parte in x_signature.split(",") if "=" in parte
    )
    ts, v1 = partes.get("ts"), partes.get("v1")
    if not ts or not v1:
        return False

    manifest = ""
    if data_id:
        manifest += f"id:{data_id.lower()};"
    if x_request_id:
        manifest += f"request-id:{x_request_id};"
    manifest += f"ts:{ts};"

    esperado = hmac.new(secret.encode(), manifest.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(esperado, v1)