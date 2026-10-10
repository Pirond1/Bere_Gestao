import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'

import { cn } from '../utils/cn'
import { capitalizeFirst, parseDate, toDateKey } from '../utils/date'

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const WEEKDAY_NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
// A partir de quantas vagas restantes o dia aparece como "últimas vagas"
const FEW_SLOTS = 2

// "Outubro de 2026"
const monthLabel = (year, month) =>
  capitalizeFirst(new Date(year, month, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }))

/**
 * Calendário de retirada. `days` vem de GET /agenda/disponibilidade:
 * [{ data, vagas_disponiveis, disponivel }]. Datas fora da lista ficam desativadas.
 */
export function PickupCalendar({ days, selected, onSelect }) {
  const byKey = useMemo(() => Object.fromEntries(days.map((d) => [d.data, d])), [days])

  const months = useMemo(() => {
    if (days.length === 0) return []
    const first = parseDate(days[0].data)
    const last = parseDate(days[days.length - 1].data)
    const list = []
    for (let y = first.getFullYear(), m = first.getMonth(); y < last.getFullYear() || (y === last.getFullYear() && m <= last.getMonth()); ) {
      list.push({ year: y, month: m })
      m += 1
      if (m > 11) {
        m = 0
        y += 1
      }
    }
    return list
  }, [days])

  const [monthIndex, setMonthIndex] = useState(0)
  const current = months[monthIndex]
  if (!current) return null

  const firstWeekday = new Date(current.year, current.month, 1).getDay()
  const daysInMonth = new Date(current.year, current.month + 1, 0).getDate()
  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(current.year, current.month, i + 1)),
  ]

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonthIndex((i) => i - 1)}
          disabled={monthIndex === 0}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg hover:bg-chocolate/5 disabled:cursor-default disabled:opacity-30"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="font-serif text-lg" aria-live="polite">
          {monthLabel(current.year, current.month)}
        </span>
        <button
          type="button"
          onClick={() => setMonthIndex((i) => i + 1)}
          disabled={monthIndex === months.length - 1}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg hover:bg-chocolate/5 disabled:cursor-default disabled:opacity-30"
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w, i) => (
          <abbr key={i} title={WEEKDAY_NAMES[i]} className="pb-2 text-xs font-medium text-muted-foreground no-underline">
            {w}
          </abbr>
        ))}

        {cells.map((date, i) => {
          if (!date) return <span key={`blank-${i}`} />
          const key = toDateKey(date)
          const info = byKey[key]
          const available = Boolean(info?.disponivel)
          const few = available && info.vagas_disponiveis <= FEW_SLOTS
          const isSelected = key === selected
          const soldOut = info && !info.disponivel

          return (
            <button
              key={key}
              type="button"
              disabled={!available}
              onClick={() => onSelect(key)}
              aria-pressed={isSelected}
              aria-label={`${date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}${
                soldOut ? ', indisponível' : few ? ', últimas vagas' : available ? ', disponível' : ''
              }`}
              className={cn(
                'relative flex aspect-square items-center justify-center rounded-lg text-sm tabular-nums transition-colors',
                !info && 'cursor-default text-muted-foreground/40',
                soldOut && 'cursor-not-allowed text-muted-foreground/60 line-through',
                available && !isSelected && 'cursor-pointer border-2 border-gold/40 bg-white hover:border-gold hover:bg-gold/10',
                isSelected && 'cursor-pointer border-2 border-chocolate bg-chocolate font-semibold text-vanilla',
              )}
            >
              {date.getDate()}
              {few && (
                <span
                  className={cn(
                    'absolute bottom-1 h-1.5 w-1.5 rounded-full',
                    isSelected ? 'bg-gold' : 'bg-terracotta',
                  )}
                  aria-hidden="true"
                />
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="h-4 w-4 rounded border-2 border-gold/40 bg-white" aria-hidden="true" />
          Disponível
        </span>
        <span className="flex items-center gap-2">
          <span className="relative h-4 w-4 rounded border-2 border-gold/40 bg-white" aria-hidden="true">
            <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-terracotta" />
          </span>
          Últimas vagas
        </span>
        <span className="flex items-center gap-2">
          <span className="h-4 w-4 rounded bg-muted text-[10px] leading-4 line-through" aria-hidden="true" />
          Indisponível
        </span>
      </div>
    </div>
  )
}