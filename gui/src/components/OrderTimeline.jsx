import { Check } from 'lucide-react'

import { cn } from '../utils/cn'
import { STATUS_FLOW, STATUS_INFO } from '../utils/orderStatus'

/** Linha do tempo do pedido: vertical no celular, horizontal no desktop. */
export function OrderTimeline({ descricao }) {
  const currentIndex = STATUS_FLOW.indexOf(descricao)

  return (
    <ol className="flex flex-col gap-4 md:flex-row md:gap-0">
      {STATUS_FLOW.map((step, index) => {
        const done = index < currentIndex
        const current = index === currentIndex
        return (
          <li key={step} className="relative flex items-center gap-3 md:flex-1 md:flex-col md:text-center">
            {/* Conector entre etapas (desktop) */}
            {index > 0 && (
              <span
                className={cn(
                  'absolute top-4 right-1/2 hidden h-0.5 w-full md:block',
                  index <= currentIndex ? 'bg-gold' : 'bg-border',
                )}
                aria-hidden="true"
              />
            )}
            <span
              className={cn(
                'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm',
                done && 'border-gold bg-gold text-chocolate',
                current && 'border-chocolate bg-chocolate text-gold',
                !done && !current && 'border-border bg-white text-muted-foreground',
              )}
              aria-hidden="true"
            >
              {done ? <Check className="h-4 w-4" /> : index + 1}
            </span>
            <span
              className={cn(
                'text-sm md:mt-2 md:px-1',
                current ? 'font-semibold' : done ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {STATUS_INFO[step].label}
              {current && <span className="sr-only"> (etapa atual)</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}