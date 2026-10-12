import api from './api'

/**
 * Pedidos do painel da loja.
 * filtros: { status: string[], data_inicio, data_fim, busca, mais_recentes_primeiro, pagina, limite }
 */
export async function listPanelOrders(filtros) {
  const { data } = await api.get('/pedidos/painel', {
    params: filtros,
    // A FastAPI lê listas como ?status=a&status=b (sem os colchetes padrão do axios)
    paramsSerializer: { indexes: null },
  })
  return data
}

export async function getPanelOrder(id) {
  const { data } = await api.get(`/pedidos/painel/${id}`)
  return data
}

/** Próxima etapa: confirmado → em produção → pronto → retirado. */
export async function advanceOrder(id) {
  const { data } = await api.patch(`/pedidos/${id}/avancar`)
  return data
}

/** Desfaz a última etapa. */
export async function revertOrder(id) {
  const { data } = await api.patch(`/pedidos/${id}/voltar`)
  return data
}

/** Cancela com estorno automático se pago; o motivo aparece para o cliente. */
export async function cancelPanelOrder(id, motivo) {
  const { data } = await api.patch(`/pedidos/${id}/cancelar`, { motivo: motivo || null })
  return data
}
/** Pedidos pagos que a loja ainda não abriu — número do indicador do menu. */
export async function getNewOrdersCount() {
  const { data } = await api.get('/pedidos/painel/novos')
  return data.quantidade
}

/** A loja abriu o detalhe: o pedido deixa de ser novo. */
export async function markOrderSeen(id) {
  const { data } = await api.patch(`/pedidos/${id}/visualizado`)
  return data
}

export async function markAllOrdersSeen() {
  const { data } = await api.post('/pedidos/painel/marcar-vistos')
  return data.quantidade
}

// Avisa o indicador do menu para recontar depois de qualquer ação que muda os pedidos novos
const ORDERS_CHANGED_EVENT = 'admin:pedidos-alterados'

export function notifyOrdersChanged() {
  window.dispatchEvent(new Event(ORDERS_CHANGED_EVENT))
}

export function onOrdersChanged(callback) {
  window.addEventListener(ORDERS_CHANGED_EVENT, callback)
  return () => window.removeEventListener(ORDERS_CHANGED_EVENT, callback)
}
