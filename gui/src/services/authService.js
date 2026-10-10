import api from './api'

export async function login(email, senha) {
  const { data } = await api.post('/auth/login', { email, senha })
  return data.access_token
}

export async function register(dados) {
  const { data } = await api.post('/auth/registrar', dados)
  return data.access_token
}