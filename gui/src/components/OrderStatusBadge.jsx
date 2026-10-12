import { cn } from '../utils/cn'
import { STATUS_INFO } from '../utils/orderStatus'

export function OrderStatusBadge({ descricao, className }) {
  const info = STATUS_INFO[descricao] ?? { label: descricao, className: 'bg-muted text-foreground border-border' }
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium',
        info.className,
        className,
      )}
    >
      {info.label}
    </span>
  )
}