import { onlyDigits } from './format'

// Mesmo mínimo de schemas/auth.py
export const MIN_PASSWORD = 8

// Mesma regra de schemas/cliente.py — validar aqui só antecipa o erro para o usuário
export function isValidCpf(value) {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false

  for (let i = 0; i < 2; i++) {
    let sum = 0
    for (let j = 0; j < 9 + i; j++) sum += Number(cpf[j]) * (10 + i - j)
    if (((sum * 10) % 11) % 10 !== Number(cpf[9 + i])) return false
  }
  return true
}

export function isValidPhone(value) {
  const digits = onlyDigits(value)
  if (digits.length === 10) return true
  return digits.length === 11 && digits[2] === '9'
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}