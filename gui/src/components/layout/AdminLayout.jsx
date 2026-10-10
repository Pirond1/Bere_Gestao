import { Home, LayoutDashboard, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'

import { useAuth } from '../../hooks/useAuth'
import { cn } from '../../utils/cn'
import { BrandIcon } from '../ui/Logo'

// Novos módulos do painel (Pedidos, Agenda, Produtos, Clientes, NPS) entram aqui nas próximas tarefas
const adminNav = [{ to: '/admin', label: 'Visão geral', icon: LayoutDashboard, end: true }]

function SidebarNav({ onLogout }) {
  return (
    <nav className="flex h-full flex-col gap-1 p-4" aria-label="Painel administrativo">
      {adminNav.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-4 py-3 transition-colors',
              isActive ? 'bg-gold text-chocolate' : 'hover:bg-vanilla/10',
            )
          }
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
          {label}
        </NavLink>
      ))}

      <div className="mt-auto space-y-1 border-t border-gold/20 pt-4">
        <Link to="/" className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-vanilla/10">
          <Home className="h-5 w-5" aria-hidden="true" />
          Ver loja
        </Link>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-vanilla/10"
        >
          <LogOut className="h-5 w-5" aria-hidden="true" />
          Sair
        </button>
      </div>
    </nav>
  )
}

export function AdminLayout() {
  const { logout } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [lastPath, setLastPath] = useState(location.pathname)

  if (lastPath !== location.pathname) {
    setLastPath(location.pathname)
    setMenuOpen(false)
  }

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-40 border-b border-gold/20 bg-chocolate text-vanilla">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <BrandIcon onDark className="h-10" />
            <div className="leading-tight">
              <span className="block font-serif text-lg">Painel Administrativo</span>
              <span className="block text-xs text-vanilla/70">Dona Berê Doces</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center lg:hidden"
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Desktop: barra lateral fixa · Mobile: gaveta sobre o conteúdo */}
        <aside
          className={cn(
            'fixed bottom-0 left-0 top-16 z-30 w-64 bg-chocolate text-vanilla transition-transform lg:sticky lg:h-[calc(100svh-4rem)] lg:translate-x-0',
            menuOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <SidebarNav onLogout={logout} />
        </aside>
        {menuOpen && (
          <div
            className="fixed inset-0 top-16 z-20 bg-chocolate/40 lg:hidden"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        <main className="min-w-0 flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}