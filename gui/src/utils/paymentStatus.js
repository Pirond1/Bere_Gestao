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
export const PAYMENT_STATUS_LABEL = {
  [PAYMENT_STATUS.PENDENTE]: 'Pendente',
  [PAYMENT_STATUS.APROVADO]: 'Aprovado',
  [PAYMENT_STATUS.RECUSADO]: 'Recusado',
  [PAYMENT_STATUS.CANCELADO]: 'Cancelado',
  [PAYMENT_STATUS.EXPIRADO]: 'Expirado',
  [PAYMENT_STATUS.ESTORNADO]: 'Estornado',
}
