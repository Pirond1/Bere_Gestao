import api from './api'

/** Situação do último backup do banco e das fotos (BG-23) — só leitura, o backup roda sozinho. */
export async function getBackupStatus() {
  const { data } = await api.get('/backup')
  return data
}
