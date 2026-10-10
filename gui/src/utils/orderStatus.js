// Descrições do seed de status_pedido (api/app/services/status_pedido_service.py)
export const STATUS = {
  AGUARDANDO_PAGAMENTO: 'aguardando_pagamento',
  CONFIRMADO: 'confirmado',
  EM_PRODUCAO: 'em_producao',
  PRONTO: 'pronto',
  ENTREGUE: 'entregue',
  CANCELADO: 'cancelado',
}

export const STATUS_INFO = {
  [STATUS.AGUARDANDO_PAGAMENTO]: { label: 'Aguardando pagamento', className: 'bg-amber-100 text-amber-800 border-amber-300' },
  [STATUS.CONFIRMADO]: { label: 'Confirmado', className: 'bg-sky-100 text-sky-800 border-sky-300' },
  [STATUS.EM_PRODUCAO]: { label: 'Em produção', className: 'bg-orange-100 text-orange-800 border-orange-300' },
  [STATUS.PRONTO]: { label: 'Pronto para retirada', className: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  // Só existe retirada, então para a cliente "entregue" significa que ela já buscou
  [STATUS.ENTREGUE]: { label: 'Retirado', className: 'bg-stone-200 text-stone-700 border-stone-300' },
  [STATUS.CANCELADO]: { label: 'Cancelado', className: 'bg-red-100 text-red-800 border-red-300' },
}

/** Etapas mostradas na linha do tempo do pedido, na ordem. */
export const STATUS_FLOW = [
  STATUS.AGUARDANDO_PAGAMENTO,
  STATUS.CONFIRMADO,
  STATUS.EM_PRODUCAO,
  STATUS.PRONTO,
  STATUS.ENTREGUE,
]

// Mesma regra do backend (CANCELAVEIS_PELO_CLIENTE)
export function canClientCancel(descricao) {
  return descricao === STATUS.AGUARDANDO_PAGAMENTO || descricao === STATUS.CONFIRMADO
}