import { toDateKey } from './date'

const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)

/** Atalhos de período dos relatórios — cada um devolve [início, fim] como 'AAAA-MM-DD'. */
export const PERIOD_PRESETS = [
  { id: '7d', label: 'Últimos 7 dias', range: (today) => [addDays(today, -6), today] },
  { id: '30d', label: 'Últimos 30 dias', range: (today) => [addDays(today, -29), today] },
  {
    id: 'month',
    label: 'Este mês',
    range: (today) => [new Date(today.getFullYear(), today.getMonth(), 1), today],
  },
  {
    id: 'last-month',
    label: 'Mês passado',
    range: (today) => [
      new Date(today.getFullYear(), today.getMonth() - 1, 1),
      new Date(today.getFullYear(), today.getMonth(), 0),
    ],
  },
  { id: '90d', label: 'Últimos 90 dias', range: (today) => [addDays(today, -89), today] },
  { id: 'year', label: 'Este ano', range: (today) => [new Date(today.getFullYear(), 0, 1), today] },
]

export const CUSTOM_PERIOD = 'custom'

export function periodFromPreset(id) {
  const preset = PERIOD_PRESETS.find((p) => p.id === id)
  const [inicio, fim] = preset.range(new Date())
  return { preset: id, inicio: toDateKey(inicio), fim: toDateKey(fim) }
}
