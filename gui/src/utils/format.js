const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

// A API serializa Decimal como string ("69.90")
export function formatCurrency(value) {
  return currency.format(Number(value))
}

export function onlyDigits(value) {
  return value.replace(/\D/g, '')
}

export function maskCpf(value) {
  return onlyDigits(value)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export function maskPhone(value) {
  const digits = onlyDigits(value).slice(0, 11)
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  }
  return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
}