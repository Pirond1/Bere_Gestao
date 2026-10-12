import { LoaderCircle } from 'lucide-react'

import { cn } from '../../utils/cn'

const variants = {
  primary: 'bg-chocolate text-vanilla hover:bg-chocolate-light',
  gold: 'bg-gold text-chocolate hover:brightness-95 shadow-md',
  outline: 'border-2 border-chocolate/20 bg-transparent hover:border-gold hover:bg-gold/10',
  ghost: 'bg-transparent hover:bg-chocolate/5',
}

const sizes = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5',
  lg: 'h-12 px-7 text-lg',
  icon: 'h-10 w-10',
}

/**
 * Botão da marca. Use `as={Link}` para renderizar como link de rota.
 */
export function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...props
}) {
  const isButton = Component === 'button'

  return (
    <Component
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
        'disabled:pointer-events-none disabled:opacity-60 cursor-pointer select-none',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={isButton ? disabled || loading : undefined}
      type={isButton ? (props.type ?? 'button') : undefined}
      {...props}
    >
      {loading && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </Component>
  )
}