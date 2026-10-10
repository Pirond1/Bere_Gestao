/**
 * Datas "AAAA-MM-DD" da API são dias do calendário, sem fuso.
 * `new Date('2026-10-11')` seria meia-noite UTC — no Brasil, ainda dia 10.
 * Por isso montamos a data no horário local.
 */
export function parseDate(value) {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toDateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Datas-hora da API (data_pedido, created_at) vêm do MySQL em UTC, mas sem o "Z".
 * Sem ajuste o navegador as leria como horário de Brasília (3h de diferença).
 */
export function parseApiDateTime(value) {
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value)
  return new Date(hasZone ? value : `${value}Z`)
}

/** "10/10/2026 às 19:20" */
export function formatDateTime(value) {
  const d = parseApiDateTime(value)
  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

// Só a primeira letra — o `capitalize` do CSS viraria "Sábado, 11 De Outubro"
export const capitalizeFirst = (text) => text.charAt(0).toUpperCase() + text.slice(1)

/** "Sábado, 11 de outubro" */
export function formatDateLong(value) {
  return capitalizeFirst(
    parseDate(value).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }),
  )
}

/** "11/10/2026" */
export function formatDateShort(value) {
  return parseDate(value).toLocaleDateString('pt-BR')
}