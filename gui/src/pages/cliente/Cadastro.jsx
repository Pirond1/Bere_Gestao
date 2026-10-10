import { ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { AuthCard } from '../../components/layout/AuthCard'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { PasswordField } from '../../components/ui/PasswordField'
import { useAuth } from '../../hooks/useAuth'
import { getErrorMessage } from '../../utils/errors'
import { maskCpf, maskPhone, onlyDigits } from '../../utils/format'
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
}

function validate(form) {
  const errors = {}
  if (!form.nome.trim()) errors.nome = 'Informe seu nome'
  if (!isValidEmail(form.email.trim())) errors.email = 'Informe um e-mail válido'
  if (!isValidCpf(form.cpf)) errors.cpf = 'CPF inválido'
  if (form.telefone && !isValidPhone(form.telefone)) errors.telefone = 'Informe DDD + número'
  if (!form.senha) errors.senha = 'Crie uma senha'
  if (form.confirmarSenha !== form.senha) errors.confirmarSenha = 'As senhas não coincidem'
  return errors
}

export function Cadastro() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from

  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading] = useState(false)

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
      const user = await register({
        nome: form.nome.trim(),
        email: form.email.trim(),
        cpf: onlyDigits(form.cpf),
        telefone: form.telefone ? onlyDigits(form.telefone) : null,
        data_nascimento: form.data_nascimento || null,
        senha: form.senha,
      })
      toast.success('Conta criada!', { description: 'Agora é só escolher seus doces.' })
      navigate(redirectAfterAuth(user, from), { replace: true })
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'Não foi possível criar sua conta. Tente novamente.'))
      setLoading(false)
    }
  }

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
            label="Celular"
            optional
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

        <PasswordField
          label="Confirmar senha"
          autoComplete="new-password"
          value={form.confirmarSenha}
          onChange={update('confirmarSenha')}
          error={errors.confirmarSenha}
        />

        <p className="flex gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0 text-gold-dark" aria-hidden="true" />
          Seus dados são usados apenas para identificar e entregar seus pedidos, conforme a LGPD.
        </p>

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Criar conta
        </Button>
      </form>
    </AuthCard>
  )
}