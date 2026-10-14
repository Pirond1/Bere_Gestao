const TOKEN_KEY = 'bere-token'

export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function storeToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Navegação privada pode bloquear o storage — a sessão vale só enquanto a aba estiver aberta
  }
}

// Avisa o AuthContext quando o token muda por fora dele (renovação, troca de senha)
export const TOKEN_RENEWED_EVENT = 'auth:token-renewed'

export function replaceToken(token) {
  storeToken(token)
  window.dispatchEvent(new CustomEvent(TOKEN_RENEWED_EVENT, { detail: token }))
}

/**
 * Lê o payload do JWT emitido pela API ({ sub, tipo, iat, exp }).
 * Só decodifica — quem valida a assinatura é o backend.
 */
export function decodeToken(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64))
    if (payload.exp && payload.exp * 1000 <= Date.now()) return null
    return { id: Number(payload.sub), tipo: payload.tipo, iat: payload.iat, exp: payload.exp }
  } catch {
    return null
  }
}