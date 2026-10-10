import { Navigate, Outlet, useLocation } from 'react-router'

import { useAuth } from '../hooks/useAuth'

/**
 * Exige login. Com `perfil`, exige também o tipo de usuário (ex.: "admin").
 * Quem não está logado vai para o login e volta para cá depois.
 */
export function ProtectedRoute({ perfil }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  if (perfil && user.tipo !== perfil) {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}

/** Login e cadastro só fazem sentido para quem ainda não entrou. */
export function GuestRoute() {
  const { user, isAdmin } = useAuth()
  if (user) {
    return <Navigate to={isAdmin ? '/admin' : '/vitrine'} replace />
  }
  return <Outlet />
}