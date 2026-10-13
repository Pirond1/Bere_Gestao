import api from './api'

/** E-mail, dados do cadastro e endereço do cliente logado. */
export async function getProfile() {
  const { data } = await api.get('/auth/perfil')
  return data
}

/**
 * Altera a conta. Campo ausente não muda; `telefone: null` apaga.
 * Trocar `email` ou `senha` exige `senha_atual`.
 */
export async function updateAccount(dados) {
  const { data } = await api.put('/auth/alterar', dados)
  return data
}

/** Cadastra ou atualiza o endereço (um por cliente). A API confere cidade e UF com o CEP. */
export async function saveAddress(dados) {
  const { data } = await api.put('/auth/perfil/endereco', dados)
  return data
}

/** { cep, rua, bairro, cidade, uf } pelo ViaCEP — rua e bairro podem vir nulos (CEP geral da cidade). */
export async function lookupCep(cep) {
  const { data } = await api.get(`/enderecos/cep/${cep}`)
  return data
}
