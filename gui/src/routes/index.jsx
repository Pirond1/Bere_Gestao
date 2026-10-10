import { createBrowserRouter } from 'react-router'

import { AdminLayout } from '../components/layout/AdminLayout'
import { ClientLayout } from '../components/layout/ClientLayout'
import { AdminHome } from '../pages/admin/AdminHome'
import { Cadastro } from '../pages/cliente/Cadastro'
import { Carrinho } from '../pages/cliente/Carrinho'
import { Checkout } from '../pages/cliente/Checkout'
import { Home } from '../pages/cliente/Home'
import { Login } from '../pages/cliente/Login'
import { MeusPedidos } from '../pages/cliente/MeusPedidos'
import { PedidoDetalhe } from '../pages/cliente/PedidoDetalhe'
import { Produto } from '../pages/cliente/Produto'
import { Vitrine } from '../pages/cliente/Vitrine'
import { NotFound } from '../pages/NotFound'
import { GuestRoute, ProtectedRoute } from './guards'

export const router = createBrowserRouter([
  {
    path: '/',
    Component: ClientLayout,
    children: [
      { index: true, Component: Home },
      { path: 'vitrine', Component: Vitrine },
      { path: 'produto/:id', Component: Produto },
      { path: 'carrinho', Component: Carrinho },
      {
        Component: GuestRoute,
        children: [
          { path: 'login', Component: Login },
          { path: 'cadastro', Component: Cadastro },
        ],
      },
      {
        // Fechar e acompanhar pedidos exige conta de cliente
        element: <ProtectedRoute perfil="cliente" />,
        children: [
          { path: 'checkout', Component: Checkout },
          { path: 'pedidos', Component: MeusPedidos },
          { path: 'pedidos/:id', Component: PedidoDetalhe },
        ],
      },
      { path: '*', Component: NotFound },
    ],
  },
  {
    path: '/admin',
    element: <ProtectedRoute perfil="admin" />,
    children: [
      {
        Component: AdminLayout,
        children: [{ index: true, Component: AdminHome }],
      },
    ],
  },
])