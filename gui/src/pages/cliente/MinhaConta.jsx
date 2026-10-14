import { Download, KeyRound, LogOut, MapPin, RotateCw, ShieldCheck, Trash2, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { AddressForm } from '../../components/AddressForm'
import { CodeInput, ResendCode } from '../../components/CodeInput'
import { PasswordStrength } from '../../components/PasswordStrength'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Field } from '../../components/ui/Field'
import { PasswordField } from '../../components/ui/PasswordField'
import { useAsync } from '../../hooks/useAsync'
import { useAuth } from '../../hooks/useAuth'
import {
  confirmEmailChange,
  deleteMyAccount,
  downloadMyData,
  getProfile,
  requestEmailChange,
  saveAddress,
  updateAccount,
} from '../../services/profileService'
import { toDateKey } from '../../utils/date'
import { getErrorMessage } from '../../utils/errors'
import { maskCpf, maskPhone, onlyDigits } from '../../utils/format'
import { passwordIssue } from '../../utils/password'
import { replaceToken } from '../../utils/token'
import { isValidCpf, isValidEmail, isValidPhone } from '../../utils/validators'


function Section({ icon: Icon, title, description, children }) {
  return (
    <Card className="p-5 md:p-6">
      <h2 className="mb-1 flex items-center gap-2 text-xl">
        <Icon className="h-5 w-5 text-gold-dark" aria-hidden="true" />
        {title}
      </h2>
      {description && <p className="mb-5 text-sm text-muted-foreground">{description}</p>}
      {!description && <div className="mb-5" />}
      {children}
    </Card>
  )
}

/** Envia o formulário, mostra erro da API e avisa quando deu certo. */
function useSubmit(action, successMessage) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (...args) => {
    setSaving(true)
    setError('')
    try {
      const result = await action(...args)
      toast.success(successMessage)
      return result
    } catch (err) {
      setError(getErrorMessage(err))
      return null
    } finally {
      setSaving(false)
    }
  }

  return { saving, error, submit }
}

function PersonalData({ cliente, onSaved }) {
  const [nome, setNome] = useState(cliente.nome)
  const [telefone, setTelefone] = useState(cliente.telefone ? maskPhone(cliente.telefone) : '')
  const [nascimento, setNascimento] = useState(cliente.data_nascimento ?? '')
  const [errors, setErrors] = useState({})
  const { saving, error, submit } = useSubmit(updateAccount, 'Dados atualizados')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const found = {}
    if (!nome.trim()) found.nome = 'Informe seu nome'
    if (!isValidPhone(telefone)) found.telefone = 'Informe o telefone com DDD'
    // Datas AAAA-MM-DD comparam como texto
    if (nascimento && nascimento > toDateKey(new Date())) found.nascimento = 'A data não pode ser no futuro'
    setErrors(found)
    if (Object.keys(found).length) return
    const conta = await submit({
      nome: nome.trim(),
      telefone: onlyDigits(telefone),
      data_nascimento: nascimento || null,
    })
    if (conta) onSaved()
  }

  return (
    <Section icon={UserRound} title="Dados pessoais">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Field
          label="Nome completo"
          autoComplete="name"
          maxLength={100}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          error={errors.nome}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Telefone (WhatsApp)"
            type="tel"
            autoComplete="tel-national"
            inputMode="numeric"
            value={telefone}
            onChange={(e) => setTelefone(maskPhone(e.target.value))}
            error={errors.telefone}
            hint="É por ele que a loja avisa quando o pedido fica pronto."
          />
          <Field
            label="Data de nascimento"
            optional
            type="date"
            autoComplete="bday"
            max={toDateKey(new Date())}
            value={nascimento}
            onChange={(e) => setNascimento(e.target.value)}
            error={errors.nascimento}
          />
        </div>
        {error && <Alert>{error}</Alert>}
        <Button type="submit" loading={saving}>
          Salvar dados
        </Button>
      </form>
    </Section>
  )
}

function Address({ endereco, onSaved }) {
  return (
    <Section
      icon={MapPin}
      title="Endereço"
      description="Usado só no seu cadastro — os pedidos são retirados na loja."
    >
      <AddressForm endereco={endereco} onSave={saveAddress} onSaved={onSaved} />
    </Section>
  )
}

/** Campos de um dado protegido + senha atual. Só um destes fica aberto por vez. */
function ProtectedForm({ submitLabel, successMessage, validate, payload, onDone, action = updateAccount, children }) {
  const [senhaAtual, setSenhaAtual] = useState('')
  const [senhaErro, setSenhaErro] = useState('')
  const { saving, error, submit } = useSubmit(action, successMessage)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const valid = validate()
    setSenhaErro(senhaAtual ? '' : 'Informe sua senha atual')
    if (!valid || !senhaAtual) return
    const dados = { ...payload(), senha_atual: senhaAtual }
    const resultado = await submit(dados)
    // Senha trocada: as outras sessões caem e esta segue com o token novo
    if (resultado?.access_token) replaceToken(resultado.access_token)
    if (resultado) onDone(resultado, dados)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {children}
      <PasswordField
        label="Senha atual"
        autoComplete="current-password"
        value={senhaAtual}
        onChange={(e) => setSenhaAtual(e.target.value)}
        error={senhaErro}
        hint="Para confirmar que é você."
      />
      {error && <Alert>{error}</Alert>}
      <Button type="submit" loading={saving}>
        {submitLabel}
      </Button>
    </form>
  )
}

/** 1º a senha atual e o novo e-mail; 2º o código que chegou no novo e-mail. */
function EmailForm({ email, onDone }) {
  const [novo, setNovo] = useState('')
  const [erro, setErro] = useState('')
  // Código enviado: guarda o pedido para o "reenviar" (a senha fica só na memória desta tela)
  const [pending, setPending] = useState(null)

  const validate = () => {
    const valor = novo.trim()
    const found = !isValidEmail(valor)
      ? 'Informe um e-mail válido'
      : valor.toLowerCase() === email.toLowerCase()
        ? 'Este já é o seu e-mail'
        : ''
    setErro(found)
    return !found
  }

  if (pending) return <ConfirmNewEmail pending={pending} onDone={onDone} onBack={() => setPending(null)} />

  return (
    <ProtectedForm
      submitLabel="Enviar código"
      successMessage="Enviamos um código para o novo e-mail"
      validate={validate}
      payload={() => ({ email: novo.trim() })}
      action={(dados) => requestEmailChange(dados.email, dados.senha_atual)}
      onDone={(enviado, dados) => setPending({ ...enviado, senhaAtual: dados.senha_atual })}
    >
      <Field
        label="Novo e-mail"
        type="email"
        autoComplete="email"
        autoFocus
        value={novo}
        onChange={(e) => setNovo(e.target.value)}
        error={erro}
        hint="Vamos enviar um código para confirmar que o endereço é seu."
      />
    </ProtectedForm>
  )
}

function ConfirmNewEmail({ pending, onDone, onBack }) {
  const [codigo, setCodigo] = useState('')
  const { saving, error, submit } = useSubmit(confirmEmailChange, 'E-mail alterado')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (await submit(codigo)) onDone()
  }

  const handleResend = async () => {
    try {
      const enviado = await requestEmailChange(pending.email, pending.senhaAtual)
      toast.success('Enviamos um novo código')
      setCodigo('')
      return enviado.reenvio_em_segundos
    } catch (err) {
      toast.error(getErrorMessage(err))
      return null
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <p className="text-sm">
        Digite o código enviado para <strong className="break-all">{pending.email}</strong>. Seu e-mail só muda depois
        disso.
      </p>
      <CodeInput value={codigo} onChange={setCodigo} error={error} id="codigo-email" />
      <Button type="submit" loading={saving} disabled={codigo.length !== 6}>
        Confirmar novo e-mail
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ResendCode seconds={pending.reenvio_em_segundos} onResend={handleResend} />
        <button
          type="button"
          onClick={onBack}
          className="cursor-pointer text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Usar outro e-mail
        </button>
      </div>
    </form>
  )
}

function CpfForm({ cpf, onDone }) {
  const [novo, setNovo] = useState('')
  const [erro, setErro] = useState('')

  const validate = () => {
    const found = !isValidCpf(novo) ? 'CPF inválido' : onlyDigits(novo) === cpf ? 'Este já é o seu CPF' : ''
    setErro(found)
    return !found
  }

  return (
    <ProtectedForm
      submitLabel="Salvar CPF"
      successMessage="CPF corrigido"
      validate={validate}
      payload={() => ({ cpf: onlyDigits(novo) })}
      onDone={onDone}
    >
      <Field
        label="CPF correto"
        inputMode="numeric"
        autoFocus
        value={novo}
        onChange={(e) => setNovo(maskCpf(e.target.value))}
        error={erro}
      />
    </ProtectedForm>
  )
}

function PasswordForm({ perfil, onDone }) {
  const [form, setForm] = useState({ nova: '', confirmar: '' })
  const [errors, setErrors] = useState({})
  const update = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))
  const pessoa = { nome: perfil.cliente?.nome, email: perfil.email, cpf: perfil.cliente?.cpf }

  const validate = () => {
    const found = {}
    const issue = passwordIssue(form.nova, pessoa)
    if (issue) found.nova = issue
    if (form.confirmar !== form.nova) found.confirmar = 'As senhas não coincidem'
    setErrors(found)
    return !Object.keys(found).length
  }

  return (
    <ProtectedForm
      submitLabel="Salvar senha"
      successMessage="Senha alterada — outros aparelhos conectados foram desconectados"
      validate={validate}
      payload={() => ({ senha: form.nova })}
      onDone={onDone}
    >
      <PasswordField
        label="Nova senha"
        autoComplete="new-password"
        autoFocus
        value={form.nova}
        onChange={update('nova')}
        error={errors.nova}
      />
      <div className="-mt-2">
        <PasswordStrength senha={form.nova} pessoa={pessoa} />
      </div>
      <PasswordField
        label="Confirmar nova senha"
        autoComplete="new-password"
        value={form.confirmar}
        onChange={update('confirmar')}
        error={errors.confirmar}
      />
    </ProtectedForm>
  )
}

function AccessRow({ label, value, open, onToggle, children }) {
  return (
    <li className="py-4">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="truncate font-medium">{value}</p>
        </div>
        <Button variant={open ? 'ghost' : 'outline'} size="sm" onClick={onToggle} aria-expanded={open}>
          {open ? 'Cancelar' : 'Alterar'}
        </Button>
      </div>
      {open && <div className="mt-4 rounded-lg bg-muted/50 p-4">{children}</div>}
    </li>
  )
}

function Access({ perfil, onSaved }) {
  const [open, setOpen] = useState(null)
  const toggle = (id) => () => setOpen((atual) => (atual === id ? null : id))
  const done = () => {
    setOpen(null)
    onSaved()
  }

  return (
    <Section
      icon={KeyRound}
      title="Acesso e segurança"
      description="Para alterar estes dados, confirme com a sua senha atual."
    >
      <ul className="-my-4 divide-y">
        <AccessRow label="E-mail" value={perfil.email} open={open === 'email'} onToggle={toggle('email')}>
          <EmailForm email={perfil.email} onDone={done} />
        </AccessRow>
        <AccessRow label="CPF" value={maskCpf(perfil.cliente.cpf)} open={open === 'cpf'} onToggle={toggle('cpf')}>
          <CpfForm cpf={perfil.cliente.cpf} onDone={done} />
        </AccessRow>
        <AccessRow label="Senha" value="••••••••" open={open === 'senha'} onToggle={toggle('senha')}>
          <PasswordForm perfil={perfil} onDone={done} />
        </AccessRow>
      </ul>
    </Section>
  )
}

function DeleteAccount({ onDeleted }) {
  const [open, setOpen] = useState(false)
  const [senha, setSenha] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleDelete = async (e) => {
    e.preventDefault()
    if (!senha) {
      setError('Informe sua senha atual')
      return
    }
    setLoading(true)
    setError('')
    try {
      await deleteMyAccount(senha)
      onDeleted()
    } catch (err) {
      setError(getErrorMessage(err))
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        Excluir minha conta
      </Button>
    )
  }

  return (
    <form onSubmit={handleDelete} noValidate className="space-y-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <div>
        <p className="mb-1 font-medium">Excluir sua conta?</p>
        <p className="text-sm text-muted-foreground">
          Apagamos seu nome, CPF, telefone, data de nascimento, endereço e e-mail, e você não consegue mais entrar. Os
          pedidos já feitos continuam no histórico da loja sem identificar você. Não dá para desfazer — se quiser, baixe
          seus dados antes.
        </p>
      </div>
      <PasswordField
        label="Senha atual"
        autoComplete="current-password"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        error={error}
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" className="bg-destructive hover:bg-destructive/90" loading={loading}>
          Excluir minha conta
        </Button>
        <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
          Manter conta
        </Button>
      </div>
    </form>
  )
}

/** Direitos do titular (LGPD art. 18): acessar/baixar os dados e excluir a conta. */
function Privacy({ onDeleted }) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await downloadMyData()
      toast.success('Arquivo com seus dados baixado')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Section
      icon={ShieldCheck}
      title="Privacidade e dados"
      description="Seus direitos pela LGPD: ver tudo o que a loja guarda sobre você e excluir sua conta quando quiser."
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            Cadastro, endereço, pedidos e avaliações em um arquivo.{' '}
            <Link to="/privacidade" className="text-muted-foreground underline underline-offset-2 hover:text-chocolate">
              Ler a Política de Privacidade
            </Link>
          </p>
          <Button variant="outline" size="sm" onClick={handleDownload} loading={downloading} className="shrink-0">
            <Download className="h-4 w-4" aria-hidden="true" />
            Baixar meus dados
          </Button>
        </div>
        <div className="border-t pt-4">
          <DeleteAccount onDeleted={onDeleted} />
        </div>
      </div>
    </Section>
  )
}

export function MinhaConta() {
  const { data: perfil, loading, error, reload, refresh } = useAsync(getProfile)
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  const handleDeleted = () => {
    logout()
    navigate('/', { replace: true })
    toast.success('Sua conta foi excluída', { description: 'Enviamos a confirmação para o seu e-mail.' })
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      <h1 className="mb-2 text-3xl md:text-4xl">Minha conta</h1>
      <p className="mb-8 text-muted-foreground">Seus dados de cadastro, endereço e acesso.</p>

      {loading && !perfil ? (
        <div className="space-y-6" aria-label="Carregando">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : error ? (
        <Card className="py-16 text-center">
          <p className="mb-6 text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={reload}>
            <RotateCw className="h-4 w-4" aria-hidden="true" />
            Tentar novamente
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          <PersonalData cliente={perfil.cliente} onSaved={refresh} />
          <Address endereco={perfil.cliente.enderecos[0] ?? null} onSaved={refresh} />
          <Access perfil={perfil} onSaved={refresh} />
          <Privacy onDeleted={handleDeleted} />
        </div>
      )}

      {/* Fora do carregamento: sair precisa funcionar mesmo se o perfil não carregar */}
      <div className="mt-10 border-t pt-6">
        <Button variant="outline" onClick={handleLogout} className="w-full sm:w-auto">
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sair da conta
        </Button>
      </div>
    </div>
  )
}
