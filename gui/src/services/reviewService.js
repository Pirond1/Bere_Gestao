import api from './api'

/** dados: { nota: 0–10, comentario } — só aceito depois que o pedido foi retirado. */
export async function createReview(pedidoId, dados) {
  const { data } = await api.post(`/pedidos/${pedidoId}/avaliacao/`, dados)
  return data
}