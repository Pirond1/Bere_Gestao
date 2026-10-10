// Junta classes condicionais: cn('a', cond && 'b')
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}