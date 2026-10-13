import api from './api'

/** Parâmetros da loja (linha única de `configuracoes`) — só admin. */
export async function getSettings() {
  const { data } = await api.get('/configuracoes/')
  return data
}
