const AUTH_PAGES = ['/login', '/cadastro']

/**
 * Para onde mandar o usuário depois de entrar ou se cadastrar.
 * Admin vai para o painel; cliente volta para a página de onde veio.
 */
export function redirectAfterAuth(user, from) {
  if (user?.tipo === 'admin') return '/admin'
  const path = from?.pathname
  if (path && !path.startsWith('/admin') && !AUTH_PAGES.includes(path)) {
    return path + (from.search ?? '')
  }
  return '/vitrine'
}