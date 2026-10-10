import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { AuthCard } from '../../components/layout/AuthCard'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { PasswordField } from '../../components/ui/PasswordField'
import { useAuth } from '../../hooks/useAuth'
import { getErrorMessage } from '../../utils/errors'
import { redirectAfterAuth } from '../../utils/redirect'

export function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(email.trim(), senha)
      navigate(redirectAfterAuth(user, from), { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível entrar. Tente novamente.'))
      setLoading(false)
    }
  }

  return (
    <AuthCard
      title="Acesse sua conta"
      subtitle="Entre para fazer e acompanhar seus pedidos"
      footer={
        <>
          Ainda não tem conta?{' '}
          <Link to="/cadastro" state={{ from }} className="font-medium text-chocolate underline-offset-4 hover:underline">
            Cadastre-se
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && <Alert>{error}</Alert>}

        <Field
          label="E-mail"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="voce@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <PasswordField
          label="Senha"
          autoComplete="current-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
        />

        <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!email || !senha}>
          Entrar
        </Button>
      </form>
    </AuthCard>
  )
}