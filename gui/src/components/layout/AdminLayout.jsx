import { CakeSlice, CalendarDays, ClipboardList, Home, LayoutDashboard, LogOut, Menu, Settings, Star, Users, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'

import { useAuth } from '../../hooks/useAuth'
import { useNewOrdersCount } from '../../hooks/useNewOrdersCount'
import { cn } from '../../utils/cn'
import { ScrollToTop } from '../ScrollToTop'
import { PwaPrompts } from '../PwaPrompts'
import { BrandIcon } from '../ui/Logo'

const adminNav = [
  { to: '/admin', label: 'Visão geral', icon: LayoutDashboard, end: true },
  // badge: o indicador de pedidos novos aparece neste item
  { to: '/admin/pedidos', label: 'Pedidos', icon: ClipboardList, badge: true },
  { to: '/admin/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/admin/produtos', label: 'Produtos', icon: CakeSlice },
  { to: '/admin/clientes', label: 'Clientes', icon: Users },
  { to: '/admin/nps', label: 'Avaliações (NPS)', icon: Star },
  { to: '/admin/configuracoes', label: 'Configurações', icon: Settings },
]

function SidebarNav({ onLogout, newOrders }) {
  return (
    <nav className="flex h-full flex-col gap-1 p-4" aria-label="Painel administrativo">
      {adminNav.map(({ to, label, icon: Icon, end, badge }) => (
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
          {({ isActive }) => (
            <>
              <Icon className="h-5 w-5" aria-hidden="true" />
              {label}
              {badge && newOrders > 0 && (
                <span
                  className={cn(
                    'ml-auto min-w-6 rounded-full px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums',
                    isActive ? 'bg-chocolate text-vanilla' : 'bg-terracotta text-white',
                  )}
                  aria-label={`${newOrders} ${newOrders === 1 ? 'pedido novo' : 'pedidos novos'}`}
                >
                  {newOrders}
                </span>
              )}
            </>
          )}
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

  const newOrders = useNewOrdersCount()

  // Contador também na aba do navegador: a dona vê o pedido novo mesmo com o painel em segundo plano
  useEffect(() => {
    const original = document.title
    if (newOrders > 0) document.title = `(${newOrders}) ${original}`
    return () => {
      document.title = original
    }
  }, [newOrders])

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
            className="relative flex h-10 w-10 items-center justify-center lg:hidden"
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            {/* No celular o menu fica fechado — um ponto avisa que há pedido novo */}
            {!menuOpen && newOrders > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-terracotta ring-2 ring-chocolate" />
            )}
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
          <SidebarNav onLogout={logout} newOrders={newOrders} />
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
          <ScrollToTop />
        </main>
      </div>
      <PwaPrompts />
    </div>
  )
}