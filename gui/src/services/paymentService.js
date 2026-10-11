import api from './api'

/**
 * Abre uma tentativa de pagamento do pedido.
 * dados: { metodo: 'pix' } ou { metodo: 'cartao_credito', token, bandeira }
 * O valor cobrado vem sempre do pedido salvo na API, nunca do navegador.
 */
export async function createPayment(pedidoId, dados) {
  const { data } = await api.post(`/pedidos/${pedidoId}/pagamentos`, dados)
  return data
}

export async function listPayments(pedidoId) {
  const { data } = await api.get(`/pedidos/${pedidoId}/pagamentos`)
  return data
}

/** Consulta o pagamento — a API confere o status no Mercado Pago enquanto estiver pendente. */
export async function getPayment(id) {
  const { data } = await api.get(`/pagamentos/${id}`)
  return data
}

/** Nome e e-mail da conta logada (o token só traz id e perfil). */
export async function getMe() {
  const { data } = await api.get('/auth/me')
  return data
}
