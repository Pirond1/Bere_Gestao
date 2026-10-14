import api from './api'

/** Clientes com resumo de compras. busca: nome, e-mail, CPF ou telefone. */
export async function listPanelClients({ busca, pagina = 1, limite = 20 } = {}) {
  const { data } = await api.get('/clientes/painel', { params: { busca: busca || undefined, pagina, limite } })
  return data
}

/** Ficha: cadastro, e-mail, endereço, resumo e histórico de pedidos. */
export async function getPanelClient(id) {
  const { data } = await api.get(`/clientes/${id}/painel`)
  return data
}

/** dados: { nome, cpf, telefone, data_nascimento } — e-mail e senha só o próprio cliente muda. */
export async function updateClient(id, dados) {
  const { data } = await api.put(`/clientes/${id}`, dados)
  return data
}

export async function saveClientAddress(id, dados) {
  const { data } = await api.put(`/clientes/${id}/endereco`, dados)
  return data
}

/** Anonimiza a conta (LGPD). A API recusa (409) se houver pedido em andamento. */
export async function deleteClient(id) {
  await api.delete(`/clientes/${id}`)
}
