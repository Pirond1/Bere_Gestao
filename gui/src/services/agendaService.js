import api from './api'

/** Dias do período (AAAA-MM-DD, inclusivo) com capacidade, pedidos e bloqueio já resolvidos. */
export async function getCalendar(inicio, fim) {
  const { data } = await api.get('/agenda/calendario', { params: { inicio, fim } })
  return data
}

/**
 * Ajusta um dia. Campo ausente não muda; `null` volta a seguir a configuração
 * (capacidade padrão / dias da semana fechados).
 */
export async function updateDay(data, dados) {
  const { data: dia } = await api.put(`/agenda/${data}`, dados)
  return dia
}