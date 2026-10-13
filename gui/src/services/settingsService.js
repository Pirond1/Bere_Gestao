import api from './api'

/** Parâmetros da loja (linha única de `configuracoes`) — só admin. */
export async function getSettings() {
  const { data } = await api.get('/configuracoes/')
  return data
}

/** Campos ausentes não mudam; nos textos opcionais, nulo apaga. */
export async function updateSettings(dados) {
  const { data } = await api.put('/configuracoes/', dados)
  return data
}

// O valor muda raramente — uma consulta por visita basta para checkout e pagamento
let publicSettings = null

/** O que o cliente precisa saber da configuração (ex.: prazo para pagar). */
export function getPublicSettings() {
  publicSettings ??= api
    .get('/configuracoes/publica')
    .then(({ data }) => data)
    .catch((err) => {
      publicSettings = null
      throw err
    })
  return publicSettings
}