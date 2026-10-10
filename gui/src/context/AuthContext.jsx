import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import * as authService from '../services/authService'
import { decodeToken, getStoredToken, storeToken } from '../utils/token'
import { AuthContext } from './auth-context'

function readInitialToken() {
  const token = getStoredToken()
  if (token && decodeToken(token)) return token
  storeToken(null)
  return null
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(readInitialToken)
  const user = useMemo(() => (token ? decodeToken(token) : null), [token])

  const saveToken = useCallback((newToken) => {
    storeToken(newToken)
    setToken(newToken)
  }, [])

  const login = useCallback(
    async (email, senha) => {
      const newToken = await authService.login(email, senha)
      saveToken(newToken)
      return decodeToken(newToken)
    },
    [saveToken],
  )

  const register = useCallback(
    async (dados) => {
      const newToken = await authService.register(dados)
      saveToken(newToken)
      return decodeToken(newToken)
    },
    [saveToken],
  )

  const logout = useCallback(() => saveToken(null), [saveToken])

  // Sessão expirada: pelo horário do token ou por um 401 vindo da API
  useEffect(() => {
    if (!user) return

    const expire = () => {
      saveToken(null)
      toast.info('Sua sessão expirou', { description: 'Entre novamente para continuar.' })
    }

    window.addEventListener('auth:expired', expire)
    // setTimeout estoura acima de ~24 dias; nesse caso o 401 da API cobre a expiração
    const delay = user.exp ? user.exp * 1000 - Date.now() : null
    const timer = delay && delay < 2 ** 31 - 1 ? setTimeout(expire, delay) : null

    return () => {
      window.removeEventListener('auth:expired', expire)
      clearTimeout(timer)
    }
  }, [user, saveToken])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAdmin: user?.tipo === 'admin',
      login,
      register,
      logout,
    }),
    [user, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}