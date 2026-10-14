import { onlyDigits } from './format'

// Mesmas regras de api/app/services/senha_service.py (NIST SP 800-63B).
// Aqui só antecipam o aviso enquanto a pessoa digita — quem decide é a API.
export const MIN_PASSWORD = 8
export const MAX_PASSWORD = 64

// Mesma lista do backend
const COMMON = new Set(
  `123456 1234567 12345678 123456789 1234567890 12345678910 123123 123321 111111 000000 112233
  121212 123654 147258 147258369 159753 654321 666666 696969 7777777 87654321 987654321 abc123
  abcd1234 a1b2c3d4 qwerty qwerty123 qwertyuiop asdfgh asdfghjkl zxcvbnm 1q2w3e4r 1q2w3e4r5t
  q1w2e3r4 qazwsx password passw0rd password1 senha senha1 senha12 senha123 senha1234 senhasenha
  minhasenha mudar mudar123 trocar admin admin123 administrador root teste teste123 test test123
  usuario user login acesso entrar welcome bemvindo iloveyou teamo amor amorzinho meuamor
  deus deusefiel jesus jesuscristo cristo fe esperanca familia felicidade saudade brasil
  flamengo corinthians palmeiras santos saopaulo gremio internacional cruzeiro vasco botafogo
  fluminense atletico bahia vitoria sport futebol neymar pele gabriel gabriela lucas mateus
  pedro maria ana julia beatriz felipe rafael guilherme daniel princesa principe estrela
  anjo anjinho bebe docinho chocolate morango brigadeiro doce doces bolo bolos confeitaria
  bere donabere donaberedoces dragon monkey master shadow sunshine football baseball
  superman batman letmein trustno1 whatever freedom secret segredo naosei qualquer nada`.split(/\s+/),
)

const normalize = (text) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

function personalParts({ nome, email, cpf } = {}) {
  const parts = []
  if (nome) parts.push(...normalize(nome).split(/\s+/).filter((p) => p.length >= 3))
  if (email) parts.push(...normalize(email.split('@')[0]).split(/[^a-z0-9]+/).filter((p) => p.length >= 3))
  const digits = cpf ? onlyDigits(cpf) : ''
  if (digits.length >= 6) parts.push(digits, digits.slice(0, 6))
  return parts
}

/** Por que a senha é fraca, ou null. `pessoa`: { nome, email, cpf } para barrar dados pessoais. */
export function passwordIssue(senha, pessoa) {
  if (senha.length < MIN_PASSWORD) return `Use pelo menos ${MIN_PASSWORD} caracteres`
  if (senha.length > MAX_PASSWORD) return `Use no máximo ${MAX_PASSWORD} caracteres`
  if (!/[a-zà-ÿ]/i.test(senha) || !/\d/.test(senha)) return 'Use letras e números'

  const normalized = normalize(senha)
  if (new Set(normalized).size < 4) return 'Evite repetir os mesmos caracteres'
  const letters = normalized.replace(/[^a-z]/g, '')
  const numbers = normalized.replace(/\D/g, '')
  if (
    COMMON.has(normalized) ||
    (letters.length >= 4 && COMMON.has(letters)) ||
    (numbers.length >= 6 && COMMON.has(numbers))
  ) {
    return 'Senha muito comum, fácil de adivinhar'
  }
  if (personalParts(pessoa).some((part) => normalized.includes(part))) return 'Não use seu nome, e-mail ou CPF'
  return null
}

/** 0 a 4 para o medidor: aceitável a partir de 2; tamanho pesa mais que variedade (NIST). */
export function passwordScore(senha, pessoa) {
  if (!senha) return 0
  if (passwordIssue(senha, pessoa)) return 1
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z\d]/].filter((r) => r.test(senha)).length
  if (senha.length >= 16 || (senha.length >= 12 && variety >= 3)) return 4
  if (senha.length >= 12 || variety >= 3) return 3
  return 2
}
