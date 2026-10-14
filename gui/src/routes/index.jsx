import { createBrowserRouter } from 'react-router'

import { AdminLayout } from '../components/layout/AdminLayout'
import { ClientLayout } from '../components/layout/ClientLayout'
import { Cadastro } from '../pages/cliente/Cadastro'
import { Carrinho } from '../pages/cliente/Carrinho'
import { Checkout } from '../pages/cliente/Checkout'
import { Home } from '../pages/cliente/Home'
import { Login } from '../pages/cliente/Login'
import { MeusPedidos } from '../pages/cliente/MeusPedidos'
import { MinhaConta } from '../pages/cliente/MinhaConta'
import { Pagamento } from '../pages/cliente/Pagamento'
import { PedidoDetalhe } from '../pages/cliente/PedidoDetalhe'
import { Produto } from '../pages/cliente/Produto'
import { RecuperarSenha } from '../pages/cliente/RecuperarSenha'
import { Vitrine } from '../pages/cliente/Vitrine'
import { NotFound } from '../pages/NotFound'
import { Privacidade } from '../pages/Privacidade'
import { GuestRoute, ProtectedRoute } from './guards'

export const router = createBrowserRouter([
  {
    path: '/',
    Component: ClientLayout,
    children: [
      { index: true, Component: Home },
      { path: 'vitrine', Component: Vitrine },
      { path: 'privacidade', Component: Privacidade },
      { path: 'produto/:id', Component: Produto },
      { path: 'carrinho', Component: Carrinho },
      {
        Component: GuestRoute,
        children: [
          { path: 'login', Component: Login },
          { path: 'cadastro', Component: Cadastro },
          { path: 'recuperar-senha', Component: RecuperarSenha },
        ],
      },
      {
        // Fechar e acompanhar pedidos exige conta de cliente
        element: <ProtectedRoute perfil="cliente" />,
        children: [
          { path: 'checkout', Component: Checkout },
          { path: 'pedidos', Component: MeusPedidos },
          { path: 'pedidos/:id', Component: PedidoDetalhe },
          { path: 'pedidos/:id/pagamento', Component: Pagamento },
          { path: 'conta', Component: MinhaConta },
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
        // Carregadas sob demanda: os gráficos do painel não pesam no app do cliente
        children: [
          { index: true, lazy: () => import('../pages/admin/Dashboard').then((m) => ({ Component: m.Dashboard })) },
          { path: 'pedidos', lazy: () => import('../pages/admin/Pedidos').then((m) => ({ Component: m.Pedidos })) },
          {
            path: 'pedidos/:id',
            lazy: () => import('../pages/admin/PedidoAdmin').then((m) => ({ Component: m.PedidoAdmin })),
          },
          {
            path: 'produtos',
            lazy: () => import('../pages/admin/Produtos').then((m) => ({ Component: m.Produtos })),
          },
          {
            // "novo" e o id do produto usam a mesma tela
            path: 'produtos/:id',
            lazy: () => import('../pages/admin/ProdutoForm').then((m) => ({ Component: m.ProdutoForm })),
          },
          {
            path: 'clientes',
            lazy: () => import('../pages/admin/Clientes').then((m) => ({ Component: m.Clientes })),
          },
          {
            path: 'clientes/:id',
            lazy: () => import('../pages/admin/ClienteAdmin').then((m) => ({ Component: m.ClienteAdmin })),
          },
          {
            path: 'agenda',
            lazy: () => import('../pages/admin/Agenda').then((m) => ({ Component: m.Agenda })),
          },
          {
            path: 'configuracoes',
            lazy: () => import('../pages/admin/Configuracoes').then((m) => ({ Component: m.Configuracoes })),
          },
          {
            path: 'nps',
            lazy: () => import('../pages/admin/RelatorioNPS').then((m) => ({ Component: m.RelatorioNPS })),
          },
        ],
      },
    ],
  },
])