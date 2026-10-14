import api from './api'

export async function login(email, senha) {
  const { data } = await api.post('/auth/login', { email, senha })
  return data.access_token
}

/** 1ª etapa do cadastro: envia o código. Devolve { email, expira_em, reenvio_em_segundos }. */
export async function register(dados) {
  const { data } = await api.post('/auth/registrar', dados)
  return data
}

export async function resendRegistrationCode(email) {
  const { data } = await api.post('/auth/registrar/reenviar', { email })
  return data
}

/** 2ª etapa: com o código certo a conta é criada e já vem o token. */
export async function confirmRegistration(email, codigo) {
  const { data } = await api.post('/auth/registrar/confirmar', { email, codigo })
  return data.access_token
}

/** Sempre responde a mesma mensagem — não revela se o e-mail tem conta. */
export async function forgotPassword(email) {
  const { data } = await api.post('/auth/senha/esqueci', { email })
  return data.mensagem
}

export async function resetPassword(email, codigo, novaSenha) {
  const { data } = await api.post('/auth/senha/redefinir', { email, codigo, nova_senha: novaSenha })
  return data.mensagem
}
