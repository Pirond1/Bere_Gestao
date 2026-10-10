import { Minus, Plus } from 'lucide-react'

import { MAX_QUANTITY } from '../context/carrinho-context'
import { cn } from '../utils/cn'

/** Seletor de quantidade (−  n  +). `min` 0 permite zerar para remover. */
export function QuantityStepper({ value, onChange, min = 1, size = 'md', label = 'Quantidade' }) {
  const button = cn(
    'flex cursor-pointer items-center justify-center rounded-lg border-2 border-chocolate/20 transition-colors',
    'hover:border-gold hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-40',
    size === 'sm' ? 'h-8 w-8' : 'h-11 w-11',
  )

  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      <button
        type="button"
        className={button}
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label="Diminuir quantidade"
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <span className={cn('text-center tabular-nums', size === 'sm' ? 'w-8' : 'w-12 text-xl')} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={button}
        onClick={() => onChange(value + 1)}
        disabled={value >= MAX_QUANTITY}
        aria-label="Aumentar quantidade"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}