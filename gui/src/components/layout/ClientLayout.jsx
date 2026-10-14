import { LayoutDashboard, LogIn, LogOut, Menu, ShoppingBag, UserRound, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'

import { useAuth } from '../../hooks/useAuth'
import { useCarrinho } from '../../hooks/useCarrinho'
import { cn } from '../../utils/cn'
import { ScrollToTop } from '../ScrollToTop'
import { PwaPrompts } from '../PwaPrompts'
import { WhatsAppButton } from '../WhatsAppButton'
import { TermsGate } from '../TermsGate'
import { Button } from '../ui/Button'
import { Footer } from './Footer'
import { LogoHorizontal } from '../ui/Logo'

const baseNav = [
  { to: '/', label: 'Início', end: true },
  { to: '/vitrine', label: 'Cardápio' },
]
const clientNav = [...baseNav, { to: '/pedidos', label: 'Meus pedidos' }]

function navClass({ isActive }) {
  return cn('transition-colors hover:text-gold', isActive && 'text-gold')
}

const iconLinkClass = ({ isActive }) =>
  cn('relative flex h-10 w-10 items-center justify-center transition-colors hover:text-gold', isActive && 'text-gold')

function CartLink() {
  const { itemCount } = useCarrinho()
  return (
    <NavLink
      to="/carrinho"
      className={iconLinkClass}
      aria-label={itemCount > 0 ? `Carrinho, ${itemCount} ${itemCount === 1 ? 'item' : 'itens'}` : 'Carrinho vazio'}
    >
      <ShoppingBag className="h-6 w-6" aria-hidden="true" />
      {itemCount > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-terracotta px-1 text-xs font-semibold text-white tabular-nums"
          aria-hidden="true"
        >
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </NavLink>
  )
}

/** Minha conta (dados, endereço, senha e o botão Sair). */
function AccountLink() {
  return (
    <NavLink to="/conta" className={iconLinkClass} aria-label="Minha conta" title="Minha conta">
      <UserRound className="h-6 w-6" aria-hidden="true" />
    </NavLink>
  )
}

export function ClientLayout() {
  const { isAuthenticated, isAdmin, logout } = useAuth()
  const navItems = isAuthenticated && !isAdmin ? clientNav : baseNav
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [lastPath, setLastPath] = useState(location.pathname)

  // Fecha o menu mobile ao trocar de página
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname)
    setMenuOpen(false)
  }

  const isClient = isAuthenticated && !isAdmin

  // Cliente sai pela tela Minha conta; o admin não tem essa tela, então Painel e Sair ficam aqui
  const accountActions = isClient ? null : isAuthenticated ? (
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
            <div className="flex items-center gap-2">
              {!isAdmin && <CartLink />}
              {isClient && <AccountLink />}
            </div>
            {accountActions && (
              <div className="flex items-center gap-6 border-l border-vanilla/20 pl-8">{accountActions}</div>
            )}
          </nav>

          {/* Mobile: carrinho e conta sempre visíveis ao lado do menu */}
          <div className="flex items-center gap-1 md:hidden">
            {!isAdmin && <CartLink />}
            {isClient && <AccountLink />}
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-10 w-10 items-center justify-center"
              aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="border-t border-vanilla/20 md:hidden" aria-label="Principal">
            <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className={(s) => cn(navClass(s), 'py-2.5')}>
                  {item.label}
                </NavLink>
              ))}
              {accountActions && (
                <div className="mt-2 flex flex-col items-start gap-4 border-t border-vanilla/20 pt-4">
                  {accountActions}
                </div>
              )}
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
        <ScrollToTop />
      </main>

      <Footer />
      <PwaPrompts />
      <TermsGate />
      <WhatsAppButton />
    </div>
  )
}