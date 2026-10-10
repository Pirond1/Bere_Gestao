import { LayoutDashboard, LogIn, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'

import { useAuth } from '../../hooks/useAuth'
import { cn } from '../../utils/cn'
import { Button } from '../ui/Button'
import { LogoHorizontal } from '../ui/Logo'

const navItems = [
  { to: '/', label: 'Início', end: true },
  { to: '/vitrine', label: 'Cardápio' },
]

function navClass({ isActive }) {
  return cn('transition-colors hover:text-gold', isActive && 'text-gold')
}

export function ClientLayout() {
  const { isAuthenticated, isAdmin, logout } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [lastPath, setLastPath] = useState(location.pathname)

  // Fecha o menu mobile ao trocar de página
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname)
    setMenuOpen(false)
  }

  const accountActions = isAuthenticated ? (
    <>
      {isAdmin && (
        <Link to="/admin" className="flex items-center gap-2 transition-colors hover:text-gold">
          <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
          Painel
        </Link>
      )}
      <button
        type="button"
        onClick={logout}
        className="flex cursor-pointer items-center gap-2 transition-colors hover:text-gold"
      >
        <LogOut className="h-5 w-5" aria-hidden="true" />
        Sair
      </button>
    </>
  ) : (
    <Button as={Link} to="/login" state={{ from: location }} variant="gold" size="sm">
      <LogIn className="h-4 w-4" aria-hidden="true" />
      Entrar
    </Button>
  )

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 bg-chocolate text-vanilla shadow-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:h-20">
          <Link to="/" className="-ml-2 flex items-center" aria-label="Dona Berê Doces — início">
            <LogoHorizontal onDark className="h-12 md:h-14" />
          </Link>

          <nav className="hidden items-center gap-8 md:flex" aria-label="Principal">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
                {item.label}
              </NavLink>
            ))}
            <div className="flex items-center gap-6 border-l border-vanilla/20 pl-8">{accountActions}</div>
          </nav>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center md:hidden"
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {menuOpen && (
          <nav className="border-t border-vanilla/20 md:hidden" aria-label="Principal">
            <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className={(s) => cn(navClass(s), 'py-2.5')}>
                  {item.label}
                </NavLink>
              ))}
              <div className="mt-2 flex flex-col items-start gap-4 border-t border-vanilla/20 pt-4">
                {accountActions}
              </div>
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-16 bg-chocolate py-8 text-vanilla">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <p className="text-sm text-vanilla/80">© {new Date().getFullYear()} Dona Berê Doces — Confeitaria Artesanal</p>
          <p className="mt-1 text-xs text-vanilla/60">Feito à mão, com carinho, para você</p>
        </div>
      </footer>
    </div>
  )
}