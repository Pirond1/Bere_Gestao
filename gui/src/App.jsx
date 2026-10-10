import { RouterProvider } from 'react-router'
import { Toaster } from 'sonner'

import { AuthProvider } from './context/AuthContext'
import { CarrinhoProvider } from './context/CarrinhoContext'
import { router } from './routes'

function App() {
  return (
    <AuthProvider>
      <CarrinhoProvider>
        <RouterProvider router={router} />
        <Toaster position="top-center" richColors closeButton />
      </CarrinhoProvider>
    </AuthProvider>
  )
}

export default App