import { RouterProvider } from 'react-router'
import { Toaster } from 'sonner'

import { AuthProvider } from './context/AuthContext'
import { router } from './routes'

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster position="top-center" richColors closeButton />
    </AuthProvider>
  )
}

export default App