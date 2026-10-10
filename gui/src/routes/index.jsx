import { createBrowserRouter } from 'react-router'

import { AdminLayout } from '../components/layout/AdminLayout'
import { ClientLayout } from '../components/layout/ClientLayout'
import { AdminHome } from '../pages/admin/AdminHome'
import { Cadastro } from '../pages/cliente/Cadastro'
import { Home } from '../pages/cliente/Home'
import { Login } from '../pages/cliente/Login'
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
      {
        Component: GuestRoute,
        children: [
          { path: 'login', Component: Login },
          { path: 'cadastro', Component: Cadastro },
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