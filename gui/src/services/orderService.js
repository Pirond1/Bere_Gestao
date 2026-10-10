import api from './api'

/** Datas de retirada a partir da antecedência mínima, com as vagas de cada dia. */
export async function getAvailability(dias = 60) {
  const { data } = await api.get('/agenda/disponibilidade', { params: { dias } })
  return data
}

/** dados: { data_retirada: 'AAAA-MM-DD', itens: [{ produto_id, quantidade }], observacoes } */
export async function createOrder(dados) {
  const { data } = await api.post('/pedidos/', dados)
  return data
}

// Para o cliente, a API já devolve somente os pedidos dele
export async function listMyOrders() {
  const { data } = await api.get('/pedidos/', { params: { limite: 50 } })
  return data
}

export async function getOrder(id) {
  const { data } = await api.get(`/pedidos/${id}`)
  return data
}

export async function cancelOrder(id) {
  const { data } = await api.patch(`/pedidos/${id}/cancelar`)
  return data
}