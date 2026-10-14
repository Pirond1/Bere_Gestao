import { useEffect, useState } from 'react'

import { cn } from '../utils/cn'

/**
 * Campo do código de 6 dígitos enviado por e-mail.
 * `one-time-code` deixa o celular sugerir o código direto do e-mail/SMS.
 */
export function CodeInput({ value, onChange, error, autoFocus = true, id = 'codigo' }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        Código de 6 dígitos
      </label>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        maxLength={6}
        value={value}
        // Colar "123 456" ou "123-456" também funciona
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        aria-invalid={Boolean(error)}
        placeholder="000000"
        className={cn(
          'h-14 w-full rounded-lg border-2 bg-white text-center font-mono text-2xl tracking-[0.5em] tabular-nums',
          'placeholder:text-muted-foreground/30 focus:border-gold focus:outline-none',
          error && 'border-destructive/60',
        )}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

/** "Reenviar código" com contagem regressiva — a API só aceita um novo código a cada 60 s. */
export function ResendCode({ seconds, onResend }) {
  const [left, setLeft] = useState(seconds)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (left <= 0) return
    const timer = setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [left])

  const handleClick = async () => {
    setSending(true)
    try {
      const next = await onResend()
      // A API devolve o novo intervalo; se falhar, deixa tentar de novo
      if (next) setLeft(next)
    } finally {
      setSending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={left > 0 || sending}
      className="cursor-pointer text-sm font-medium text-chocolate underline-offset-4 hover:underline disabled:cursor-default disabled:text-muted-foreground disabled:no-underline"
    >
      {sending ? 'Enviando…' : left > 0 ? `Reenviar código em ${left} s` : 'Reenviar código'}
    </button>
  )
}
