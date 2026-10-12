import { CalendarDays } from 'lucide-react'

import { cn } from '../../utils/cn'
import { Card } from '../ui/Card'

// Mesma ordem da API: 0 = segunda … 6 = domingo
const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

/** Em quais dias da semana as retiradas se concentram — ajuda a planejar capacidade e folgas. */
export function WeekdaySales({ dias }) {
  const max = Math.max(...dias.map((d) => d.pedidos), 1)
  const busiest = dias.reduce((a, b) => (b.pedidos > a.pedidos ? b : a))

  return (
    <Card className="p-5">
      <div className="mb-1 flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-gold-dark" aria-hidden="true" />
        <h2 className="text-lg">Retiradas por dia da semana</h2>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        {busiest.pedidos > 0 ? `Dia mais movimentado: ${WEEKDAYS[busiest.dia_semana]}` : 'Pedidos pagos do período'}
      </p>

      <div className="flex h-36 items-end gap-2">
        {dias.map((d) => (
          <div
            key={d.dia_semana}
            className="flex h-full flex-1 flex-col items-center justify-end gap-1"
            title={`${WEEKDAYS[d.dia_semana]}: ${d.pedidos} ${d.pedidos === 1 ? 'pedido' : 'pedidos'}`}
          >
            <span className="text-xs text-muted-foreground tabular-nums">{d.pedidos || ''}</span>
            <div
              className={cn(
                'w-full rounded-t',
                d === busiest && d.pedidos > 0 ? 'bg-gold' : 'bg-gold/40',
                d.pedidos === 0 && 'bg-muted',
              )}
              style={{ height: d.pedidos ? `${(d.pedidos / max) * 100}%` : '2px' }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2 border-t pt-2">
        {dias.map((d) => (
          <span key={d.dia_semana} className="flex-1 text-center text-xs">
            {WEEKDAYS[d.dia_semana]}
          </span>
        ))}
      </div>
    </Card>
  )
}