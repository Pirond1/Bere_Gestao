import { cn } from '../../utils/cn'
import { Card } from '../ui/Card'

/** Indicador do painel: rótulo, valor em destaque e uma linha de apoio. */
export function StatCard({ label, value, icon: Icon, footer, highlight = false, className }) {
  return (
    <Card className={cn('p-5', highlight && 'border-2 border-gold/40 bg-gold/5', className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        {Icon && <Icon className="h-5 w-5 shrink-0 text-gold-dark" aria-hidden="true" />}
      </div>
      <p className="mb-1 font-serif text-2xl lining-nums md:text-3xl">{value}</p>
      {footer && <div className="text-xs text-muted-foreground">{footer}</div>}
    </Card>
  )
}