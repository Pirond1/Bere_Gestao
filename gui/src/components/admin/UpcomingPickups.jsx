import { CalendarClock, RotateCw } from 'lucide-react'

import { useAsync } from '../../hooks/useAsync'
import { getUpcomingPickups } from '../../services/reportService'
import { cn } from '../../utils/cn'
import { capitalizeFirst, parseDate } from '../../utils/date'
import { Card } from '../ui/Card'

function dayLabel(value, index) {
  if (index === 0) return 'Hoje'
  if (index === 1) return 'Amanhã'
  const date = parseDate(value)
  return capitalizeFirst(
    date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', ''),
  )
}

/** O que precisa sair da cozinha nos próximos dias. */
export function UpcomingPickups() {
  const { data: dias, loading, error, reload } = useAsync(getUpcomingPickups)

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <CalendarClock className="h-5 w-5 text-gold-dark" aria-hidden="true" />
        <h2 className="text-lg">Próximas retiradas</h2>
      </div>

      {loading ? (
        <div className="h-56 animate-pulse rounded-lg bg-muted" aria-label="Carregando" />
      ) : error ? (
        <button
          type="button"
          onClick={reload}
          className="flex w-full cursor-pointer items-center justify-center gap-2 py-8 text-sm text-muted-foreground"
        >
          <RotateCw className="h-4 w-4" aria-hidden="true" />
          Tentar novamente
        </button>
      ) : (
        <ul className="space-y-3 text-sm">
          {dias.map((dia, index) => {
            const ocupacao = dia.capacidade_maxima ? dia.vagas_ocupadas / dia.capacidade_maxima : 0
            return (
              <li key={dia.data} className="flex items-center gap-3">
                <span className={cn('w-20 shrink-0', index === 0 && 'font-medium')}>{dayLabel(dia.data, index)}</span>
                {dia.bloqueada ? (
                  <span className="text-muted-foreground italic">Fechado</span>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {dia.pedidos_pagos === 0
                        ? '—'
                        : `${dia.pedidos_pagos} ${dia.pedidos_pagos === 1 ? 'pedido' : 'pedidos'} · ${dia.itens} un.`}
                    </span>
                    {/* Vagas ocupadas incluem quem ainda está pagando */}
                    <span
                      className="flex w-16 shrink-0 items-center gap-1.5"
                      title={`${dia.vagas_ocupadas} de ${dia.capacidade_maxima} vagas ocupadas`}
                    >
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <span
                          className={cn('block h-full rounded-full', ocupacao >= 1 ? 'bg-terracotta' : 'bg-gold')}
                          style={{ width: `${Math.min(ocupacao, 1) * 100}%` }}
                        />
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {dia.vagas_ocupadas}/{dia.capacidade_maxima}
                      </span>
                    </span>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}