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