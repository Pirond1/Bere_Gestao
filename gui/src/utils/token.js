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

/**
 * Lê o payload do JWT emitido pela API ({ sub, tipo, exp }).
 * Só decodifica — quem valida a assinatura é o backend.
 */
export function decodeToken(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64))
    if (payload.exp && payload.exp * 1000 <= Date.now()) return null
    return { id: Number(payload.sub), tipo: payload.tipo, exp: payload.exp }
  } catch {
    return null
  }
}