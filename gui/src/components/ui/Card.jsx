import { cn } from '../../utils/cn'

export function Card({ as: Component = 'div', className, ...props }) {
  return (
    <Component
      className={cn('rounded-lg border bg-card text-foreground shadow-sm', className)}
      {...props}
    />
  )
}