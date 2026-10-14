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

/** Confere a senha atual e envia um código para o novo e-mail. A troca só acontece ao confirmar. */
export async function requestEmailChange(novoEmail, senhaAtual) {
  const { data } = await api.post('/auth/email/solicitar', { novo_email: novoEmail, senha_atual: senhaAtual })
  return data
}

export async function confirmEmailChange(codigo) {
  const { data } = await api.post('/auth/email/confirmar', { codigo })
  return data
}

/** { email, nome, termos_pendentes } — a janela de aceite da política usa o termos_pendentes. */
export async function getAccountStatus() {
  const { data } = await api.get('/auth/me')
  return data
}

export async function acceptTerms() {
  await api.post('/auth/termos/aceitar')
}

/** LGPD (art. 18, II e V): baixa um arquivo .json com tudo o que a loja guarda sobre o cliente. */
export async function downloadMyData() {
  const { data } = await api.get('/auth/meus-dados')
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `meus-dados-dona-bere-${data.gerado_em}.json`
  link.click()
  URL.revokeObjectURL(url)
}

/** LGPD (art. 18, VI): exclui (anonimiza) a própria conta. Pede a senha atual. */
export async function deleteMyAccount(senhaAtual) {
  await api.post('/auth/conta/excluir', { senha_atual: senhaAtual })
}
