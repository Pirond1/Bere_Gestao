import { MailCheck } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { CodeInput, ResendCode } from '../../components/CodeInput'
import { AuthCard } from '../../components/layout/AuthCard'
import { PasswordStrength } from '../../components/PasswordStrength'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { PasswordField } from '../../components/ui/PasswordField'
import { forgotPassword, resetPassword } from '../../services/authService'
import { getErrorMessage } from '../../utils/errors'
import { passwordIssue } from '../../utils/password'
import { isValidEmail } from '../../utils/validators'

// Mesmo intervalo de reenvio da API (codigo_service.INTERVALO_REENVIO_SEGUNDOS)
const RESEND_SECONDS = 60

function RequestCode({ initialEmail, onSent }) {
  const [email, setEmail] = useState(initialEmail)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!isValidEmail(email.trim())) {
      setError('Informe um e-mail válido')
      return
    }
    setError('')
    setLoading(true)
    try {
      await forgotPassword(email.trim())
      onSent(email.trim())
    } catch (err) {
      setError(getErrorMessage(err))
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <p className="text-sm text-muted-foreground">
        Informe o e-mail da sua conta. Vamos enviar um código para você criar uma nova senha.
      </p>
      <Field
        label="E-mail"
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="voce@email.com"
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={error}
      />
      <Button type="submit" size="lg" className="w-full" loading={loading}>
        Enviar código
      </Button>
    </form>
  )
}

function NewPassword({ email, onChangeEmail }) {
  const navigate = useNavigate()
  const [codigo, setCodigo] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    const found = {}
    if (codigo.length !== 6) found.codigo = 'Digite os 6 dígitos do código'
    const issue = passwordIssue(senha, { email })
    if (issue) found.senha = issue
    if (confirmar !== senha) found.confirmar = 'As senhas não coincidem'
    setErrors(found)
    setError('')
    if (Object.keys(found).length) return

    setLoading(true)
    try {
      await resetPassword(email, codigo, senha)
      toast.success('Senha redefinida', { description: 'Entre com a nova senha.' })
      navigate('/login', { replace: true, state: { email } })
    } catch (err) {
      setError(getErrorMessage(err))
      setLoading(false)
    }
  }

  const handleResend = async () => {
    try {
      await forgotPassword(email)
      toast.success('Se o e-mail tiver conta, enviamos um novo código')
      setCodigo('')
      return RESEND_SECONDS
    } catch (err) {
      toast.error(getErrorMessage(err))
      return null
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <p className="flex gap-3 rounded-lg bg-muted p-4 text-sm">
        <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold-dark" aria-hidden="true" />
        <span>
          Se houver uma conta com <strong className="break-all">{email}</strong>, o código chega em instantes. Ele vale
          por 15 minutos — confira também a caixa de spam.
        </span>
      </p>
      {error && <Alert>{error}</Alert>}
      <CodeInput value={codigo} onChange={setCodigo} error={errors.codigo} />
      <PasswordField
        label="Nova senha"
        autoComplete="new-password"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        error={errors.senha}
      />
      <div className="-mt-3">
        <PasswordStrength senha={senha} pessoa={{ email }} />
      </div>
      <PasswordField
        label="Confirmar nova senha"
        autoComplete="new-password"
        value={confirmar}
        onChange={(e) => setConfirmar(e.target.value)}
        error={errors.confirmar}
      />
      <Button type="submit" size="lg" className="w-full" loading={loading}>
        Redefinir senha
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ResendCode seconds={RESEND_SECONDS} onResend={handleResend} />
        <button
          type="button"
          onClick={onChangeEmail}
          className="cursor-pointer text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Usar outro e-mail
        </button>
      </div>
    </form>
  )
}

export function RecuperarSenha() {
  const location = useLocation()
  // O login passa o e-mail que já estava digitado
  const [email, setEmail] = useState(location.state?.email ?? '')
  const [sent, setSent] = useState(false)

  return (
    <AuthCard
      title="Esqueci minha senha"
      subtitle="Crie uma nova senha em dois passos"
      footer={
        <>
          Lembrou?{' '}
          <Link to="/login" className="font-medium text-chocolate underline-offset-4 hover:underline">
            Voltar para o login
          </Link>
        </>
      }
    >
      {sent ? (
        <NewPassword email={email} onChangeEmail={() => setSent(false)} />
      ) : (
        <RequestCode
          initialEmail={email}
          onSent={(enviado) => {
            setEmail(enviado)
            setSent(true)
          }}
        />
      )}
    </AuthCard>
  )
}
