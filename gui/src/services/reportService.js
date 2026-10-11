import api from './api'

// Datas 'AAAA-MM-DD', inclusivas — a API considera o horário de Brasília

export async function getSalesReport(inicio, fim) {
  const { data } = await api.get('/relatorios/vendas', { params: { inicio, fim } })
  return data
}

export async function getNpsReport(inicio, fim) {
  const { data } = await api.get('/relatorios/nps', { params: { inicio, fim } })
  return data
}

/** Carga de produção dos próximos dias, a partir de hoje — não depende do período filtrado. */
export async function getUpcomingPickups(dias = 7) {
  const { data } = await api.get('/relatorios/proximas-retiradas', { params: { dias } })
  return data
}
