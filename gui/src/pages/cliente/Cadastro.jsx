import { MailCheck, ShieldCheck } from 'lucide-react'
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
import { useAuth } from '../../hooks/useAuth'
import { resendRegistrationCode } from '../../services/authService'
import { getErrorMessage } from '../../utils/errors'
import { maskCpf, maskPhone, onlyDigits } from '../../utils/format'
import { passwordIssue } from '../../utils/password'
import { redirectAfterAuth } from '../../utils/redirect'
import { isValidCpf, isValidEmail, isValidPhone } from '../../utils/validators'

const initialForm = {
  nome: '',
  email: '',
  cpf: '',
  telefone: '',
  data_nascimento: '',
  senha: '',
  confirmarSenha: '',
  aceite: false,
}

const personOf = (form) => ({ nome: form.nome, email: form.email, cpf: form.cpf })

/** 2ª etapa: o código que chegou no e-mail cria a conta. */
function ConfirmEmail({ pending, onBack, from }) {
  const { confirmRegistration } = useAuth()
  const navigate = useNavigate()
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (codigo.length !== 6) {
      setError('Digite os 6 dígitos do código')
      return
    }
    setError('')
    setLoading(true)
    try {
      const user = await confirmRegistration(pending.email, codigo)
      toast.success('Conta criada!', { description: 'Agora é só escolher seus doces.' })
      navigate(redirectAfterAuth(user, from), { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
      setLoading(false)
    }
  }

  const handleResend = async () => {
    try {
      const enviado = await resendRegistrationCode(pending.email)
      toast.success('Enviamos um novo código')
      setCodigo('')
      setError('')
      return enviado.reenvio_em_segundos
    } catch (err) {
      toast.error(getErrorMessage(err))
      return null
    }
  }

  return (
    <AuthCard title="Confirme seu e-mail" subtitle="Falta só um passo para criar sua conta">
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <p className="flex gap-3 rounded-lg bg-muted p-4 text-sm">
          <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold-dark" aria-hidden="true" />
          <span>
            Enviamos um código para <strong className="break-all">{pending.email}</strong>. Ele vale por 15 minutos —
            confira também a caixa de spam.
          </span>
        </p>
        <CodeInput value={codigo} onChange={setCodigo} error={error} />
        <Button type="submit" size="lg" className="w-full" loading={loading} disabled={codigo.length !== 6}>
          Confirmar e criar conta
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ResendCode seconds={pending.reenvio_em_segundos} onResend={handleResend} />
          <button
            type="button"
            onClick={onBack}
            className="cursor-pointer text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Corrigir meus dados
          </button>
        </div>
      </form>
    </AuthCard>
  )
}

function validate(form) {
  const errors = {}
  if (!form.nome.trim()) errors.nome = 'Informe seu nome'
  if (!isValidEmail(form.email.trim())) errors.email = 'Informe um e-mail válido'
  if (!isValidCpf(form.cpf)) errors.cpf = 'CPF inválido'
  if (!isValidPhone(form.telefone)) errors.telefone = 'Informe o celular com DDD'
  if (!form.senha) errors.senha = 'Crie uma senha'
  else {
    const issue = passwordIssue(form.senha, personOf(form))
    if (issue) errors.senha = issue
  }
  if (form.confirmarSenha !== form.senha) errors.confirmarSenha = 'As senhas não coincidem'
  if (!form.aceite) errors.aceite = 'Para criar a conta, aceite a Política de Privacidade e os Termos'
  return errors
}

export function Cadastro() {
  const { register } = useAuth()
  const location = useLocation()
  const from = location.state?.from

  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading] = useState(false)
  // Código enviado: { email, expira_em, reenvio_em_segundos } — mostra a etapa de confirmação
  const [pending, setPending] = useState(null)

  const update = (field, mask) => (event) => {
    const value = mask ? mask(event.target.value) : event.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')

    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setLoading(true)
    try {
      const enviado = await register({
        nome: form.nome.trim(),
        email: form.email.trim(),
        cpf: onlyDigits(form.cpf),
        telefone: onlyDigits(form.telefone),
        data_nascimento: form.data_nascimento || null,
        senha: form.senha,
        aceite_termos: form.aceite,
      })
      setPending(enviado)
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'Não foi possível criar sua conta. Tente novamente.'))
    } finally {
      setLoading(false)
    }
  }

  if (pending) return <ConfirmEmail pending={pending} onBack={() => setPending(null)} from={from} />

  return (
    <AuthCard
      title="Crie sua conta"
      subtitle="Leva menos de um minuto e agiliza seus próximos pedidos"
      footer={
        <>
          Já tem conta?{' '}
          <Link to="/login" state={{ from }} className="font-medium text-chocolate underline-offset-4 hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {submitError && <Alert>{submitError}</Alert>}

        <Field
          label="Nome completo"
          autoComplete="name"
          value={form.nome}
          onChange={update('nome')}
          error={errors.nome}
        />

        <Field
          label="E-mail"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="voce@email.com"
          value={form.email}
          onChange={update('email')}
          error={errors.email}
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field
            label="CPF"
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={form.cpf}
            onChange={update('cpf', maskCpf)}
            error={errors.cpf}
          />
          <Field
            label="Celular (WhatsApp)"
            type="tel"
            autoComplete="tel-national"
            placeholder="(18) 99999-9999"
            value={form.telefone}
            onChange={update('telefone', maskPhone)}
            error={errors.telefone}
          />
        </div>

        <Field
          label="Data de nascimento"
          optional
          type="date"
          autoComplete="bday"
          max={new Date().toISOString().slice(0, 10)}
          value={form.data_nascimento}
          onChange={update('data_nascimento')}
        />

        <PasswordField
          label="Senha"
          autoComplete="new-password"
          value={form.senha}
          onChange={update('senha')}
          error={errors.senha}
        />
        <div className="-mt-3">
          <PasswordStrength senha={form.senha} pessoa={personOf(form)} />
        </div>

        <PasswordField
          label="Confirmar senha"
          autoComplete="new-password"
          value={form.confirmarSenha}
          onChange={update('confirmarSenha')}
          error={errors.confirmarSenha}
        />

        <div>
          <label className="flex cursor-pointer gap-3 text-sm">
            <input
              type="checkbox"
              checked={form.aceite}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, aceite: e.target.checked }))
                if (errors.aceite) setErrors((prev) => ({ ...prev, aceite: undefined }))
              }}
              aria-invalid={Boolean(errors.aceite)}
              className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-chocolate"
            />
            <span>
              Li e aceito a{' '}
              <Link to="/privacidade" target="_blank" className="font-medium underline underline-offset-2">
                Política de Privacidade e os Termos de Uso
              </Link>
              .
            </span>
          </label>
          {errors.aceite && <p className="mt-1.5 text-sm text-destructive">{errors.aceite}</p>}
        </div>

        <p className="flex gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0 text-gold-dark" aria-hidden="true" />
          Seus dados são usados apenas para identificar você e cuidar dos seus pedidos, conforme a LGPD.
        </p>

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Criar conta
        </Button>
      </form>
    </AuthCard>
  )
}