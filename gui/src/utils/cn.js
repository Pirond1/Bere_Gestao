import { twMerge } from 'tailwind-merge'

/**
 * Junta classes condicionais: cn('a', cond && 'b').
 * Em conflito, a última vence: cn('bg-chocolate', 'bg-destructive') → 'bg-destructive'.
 * Sem o twMerge as duas ficariam no elemento e venceria a que vem depois no CSS do Tailwind.
 */
export function cn(...classes) {
  return twMerge(classes.filter(Boolean).join(' '))
}
