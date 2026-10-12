import { useId } from 'react'

import { cn } from '../../utils/cn'

/**
 * Campo de formulário com rótulo, dica e mensagem de erro.
 * Repassa as demais props para o <input>.
 */
export function Field({ label, hint, error, optional = false, className, children, ...inputProps }) {
  const id = useId()
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {optional && <span className="ml-1 font-normal text-muted-foreground">(opcional)</span>}
      </label>

      <div className="relative">
        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn(
            'h-11 w-full rounded-lg border-2 bg-white px-3 text-base transition-colors',
            'placeholder:text-muted-foreground/60 focus:border-gold focus:outline-none',
            error && 'border-destructive/60',
            children && 'pr-11',
          )}
          {...inputProps}
        />
        {children}
      </div>

      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </div>
  )
}