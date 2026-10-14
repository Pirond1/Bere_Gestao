import axios from 'axios'

import { decodeToken, getStoredToken, replaceToken } from '../utils/token'

// URL da FastAPI definida em gui/.env (VITE_API_URL)
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Sessão renovada enquanto a pessoa usa o sistema (BG-17): passada a metade da validade,
// a próxima resposta bem-sucedida pede um token novo. Aba parada não renova — a sessão cai sozinha.
let renewing = null

function renewIfHalfway(config) {
  if (renewing || config.url === '/auth/renovar' || !config.headers?.Authorization) return
  const user = decodeToken(getStoredToken() ?? '')
  if (!user?.iat || !user.exp) return
  const halfway = (user.iat + (user.exp - user.iat) / 2) * 1000
  if (Date.now() < halfway) return
  renewing = api
    .post('/auth/renovar')
    .then(({ data }) => replaceToken(data.access_token))
    // Falhou (rede): tenta de novo na próxima resposta; 401 já é tratado abaixo
    .catch(() => {})
    .finally(() => {
      renewing = null
    })
}

api.interceptors.response.use(
  (response) => {
    renewIfHalfway(response.config)
    return response
  },
  (error) => {
    // Token expirado/inválido em uma requisição autenticada: avisa o AuthContext para deslogar
    const sentToken = Boolean(error.config?.headers?.Authorization)
    if (error.response?.status === 401 && sentToken) {
      window.dispatchEvent(new Event('auth:expired'))
    }
    return Promise.reject(error)
  },
)

export default api