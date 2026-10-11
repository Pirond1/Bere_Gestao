// Descrições do seed de pagamentos (api/app/services/status_pagamento_service.py e metodo_pagamento_service.py)
export const PAYMENT_STATUS = {
  PENDENTE: 'pendente',
  APROVADO: 'aprovado',
  RECUSADO: 'recusado',
  CANCELADO: 'cancelado',
  EXPIRADO: 'expirado',
  ESTORNADO: 'estornado',
}

export const PAYMENT_METHOD = {
  PIX: 'pix',
  CARTAO_CREDITO: 'cartao_credito',
}

// Mesmo valor de PRAZO_PAGAMENTO_MINUTOS na API — depois disso o pedido não pago é cancelado
export const PAYMENT_DEADLINE_MINUTES = 30

export const PAYMENT_METHOD_LABEL = {
  [PAYMENT_METHOD.PIX]: 'PIX',
  [PAYMENT_METHOD.CARTAO_CREDITO]: 'cartão de crédito',
}

/** PIX ainda pagável: pendente e dentro do prazo. */
export function isPixOpen(pagamento) {
  return (
    pagamento?.metodo === PAYMENT_METHOD.PIX &&
    pagamento.status === PAYMENT_STATUS.PENDENTE &&
    Boolean(pagamento.expira_em)
  )
}