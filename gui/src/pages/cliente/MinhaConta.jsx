import { KeyRound, LoaderCircle, LogOut, MapPin, RotateCw, UserRound } from 'lucide-react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Field } from '../../components/ui/Field'
import { PasswordField } from '../../components/ui/PasswordField'
import { useAsync } from '../../hooks/useAsync'
import { useAuth } from '../../hooks/useAuth'
import { getProfile, lookupCep, saveAddress, updateAccount } from '../../services/profileService'
import { cn } from '../../utils/cn'
import { toDateKey } from '../../utils/date'
import { getErrorMessage } from '../../utils/errors'
import { maskCep, maskCpf, maskPhone, onlyDigits } from '../../utils/format'
import { MIN_PASSWORD, isValidCpf, isValidEmail, isValidPhone } from '../../utils/validators'

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

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
    if (telefone && !isValidPhone(telefone)) found.telefone = 'Informe DDD + número'
    // Datas AAAA-MM-DD comparam como texto
    if (nascimento && nascimento > toDateKey(new Date())) found.nascimento = 'A data não pode ser no futuro'
    setErrors(found)
    if (Object.keys(found).length) return
    const conta = await submit({
      nome: nome.trim(),
      telefone: telefone ? onlyDigits(telefone) : null,
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
            optional
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

const emptyAddress = { cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' }

function Address({ endereco, onSaved }) {
  const [form, setForm] = useState(
    endereco
      ? { ...endereco, cep: maskCep(endereco.cep), complemento: endereco.complemento ?? '' }
      : emptyAddress,
  )
  const [errors, setErrors] = useState({})
  const [cepStatus, setCepStatus] = useState({ loading: false, message: '' })
  const numeroRef = useRef(null)
  const lastLookup = useRef(endereco?.cep ?? null)
  const { saving, error, submit } = useSubmit(saveAddress, 'Endereço salvo')

  const update = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))

  // CompleteCEP: com os 8 dígitos, busca rua, bairro, cidade e UF
  const handleCep = async (e) => {
    const cep = maskCep(e.target.value)
    setForm((f) => ({ ...f, cep }))
    const digits = onlyDigits(cep)
    if (digits.length !== 8 || digits === lastLookup.current) return
    lastLookup.current = digits

    setCepStatus({ loading: true, message: '' })
    try {
      const found = await lookupCep(digits)
      setForm((f) => ({
        ...f,
        // CEP geral de cidade não tem rua/bairro — mantém o que já foi digitado
        rua: found.rua ?? f.rua,
        bairro: found.bairro ?? f.bairro,
        cidade: found.cidade,
        uf: found.uf,
      }))
      setErrors({})
      setCepStatus({ loading: false, message: '' })
      numeroRef.current?.focus()
    } catch (err) {
      setCepStatus({ loading: false, message: getErrorMessage(err) })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const found = {}
    if (onlyDigits(form.cep).length !== 8) found.cep = 'Informe os 8 dígitos do CEP'
    for (const [campo, label] of [['rua', 'a rua'], ['numero', 'o número'], ['bairro', 'o bairro'], ['cidade', 'a cidade']]) {
      if (!form[campo].trim()) found[campo] = `Informe ${label}`
    }
    if (!form.uf) found.uf = 'Escolha a UF'
    setErrors(found)
    if (Object.keys(found).length) return

    const salvo = await submit({
      cep: onlyDigits(form.cep),
      rua: form.rua.trim(),
      numero: form.numero.trim(),
      complemento: form.complemento.trim() || null,
      bairro: form.bairro.trim(),
      cidade: form.cidade.trim(),
      uf: form.uf,
    })
    if (salvo) {
      // A API grava a grafia oficial da cidade
      setForm((f) => ({ ...f, cidade: salvo.cidade }))
      onSaved()
    }
  }

  return (
    <Section
      icon={MapPin}
      title="Endereço"
      description="Usado só no seu cadastro — os pedidos são retirados na loja."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Field
          label="CEP"
          inputMode="numeric"
          autoComplete="postal-code"
          value={form.cep}
          onChange={handleCep}
          error={errors.cep || cepStatus.message}
          hint="Digite o CEP para preencher o endereço automaticamente."
          className="sm:max-w-48"
        >
          {cepStatus.loading && (
            <LoaderCircle
              className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
              aria-label="Buscando CEP"
            />
          )}
        </Field>

        <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
          <Field label="Rua" autoComplete="address-line1" maxLength={150} value={form.rua} onChange={update('rua')} error={errors.rua} />
          <Field label="Número" ref={numeroRef} maxLength={10} value={form.numero} onChange={update('numero')} error={errors.numero} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Complemento" optional autoComplete="address-line2" maxLength={100} value={form.complemento} onChange={update('complemento')} />
          <Field label="Bairro" maxLength={100} value={form.bairro} onChange={update('bairro')} error={errors.bairro} />
        </div>
        <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
          <Field label="Cidade" autoComplete="address-level2" maxLength={100} value={form.cidade} onChange={update('cidade')} error={errors.cidade} />
          <div className="space-y-1.5">
            <label htmlFor="uf" className="block text-sm font-medium">
              UF
            </label>
            <select
              id="uf"
              autoComplete="address-level1"
              value={form.uf}
              onChange={update('uf')}
              aria-invalid={Boolean(errors.uf)}
              className={cn(
                'h-11 w-full cursor-pointer rounded-lg border-2 bg-white px-3 text-base focus:border-gold focus:outline-none',
                errors.uf && 'border-destructive/60',
              )}
            >
              <option value="">–</option>
              {UFS.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
            {errors.uf && <p className="text-sm text-destructive">{errors.uf}</p>}
          </div>
        </div>
        {error && <Alert>{error}</Alert>}
        <Button type="submit" loading={saving}>
          {endereco ? 'Salvar endereço' : 'Cadastrar endereço'}
        </Button>
      </form>
    </Section>
  )
}

/** Campos de um dado protegido + senha atual. Só um destes fica aberto por vez. */
function ProtectedForm({ submitLabel, successMessage, validate, payload, onDone, children }) {
  const [senhaAtual, setSenhaAtual] = useState('')
  const [senhaErro, setSenhaErro] = useState('')
  const { saving, error, submit } = useSubmit(updateAccount, successMessage)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const valid = validate()
    setSenhaErro(senhaAtual ? '' : 'Informe sua senha atual')
    if (!valid || !senhaAtual) return
    if (await submit({ ...payload(), senha_atual: senhaAtual })) onDone()
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

function EmailForm({ email, onDone }) {
  const [novo, setNovo] = useState('')
  const [erro, setErro] = useState('')

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

  return (
    <ProtectedForm
      submitLabel="Salvar e-mail"
      successMessage="E-mail alterado"
      validate={validate}
      payload={() => ({ email: novo.trim() })}
      onDone={onDone}
    >
      <Field
        label="Novo e-mail"
        type="email"
        autoComplete="email"
        autoFocus
        value={novo}
        onChange={(e) => setNovo(e.target.value)}
        error={erro}
      />
    </ProtectedForm>
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

function PasswordForm({ onDone }) {
  const [form, setForm] = useState({ nova: '', confirmar: '' })
  const [errors, setErrors] = useState({})
  const update = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))

  const validate = () => {
    const found = {}
    if (form.nova.length < MIN_PASSWORD) found.nova = `A nova senha precisa ter pelo menos ${MIN_PASSWORD} caracteres`
    if (form.confirmar !== form.nova) found.confirmar = 'As senhas não coincidem'
    setErrors(found)
    return !Object.keys(found).length
  }

  return (
    <ProtectedForm
      submitLabel="Salvar senha"
      successMessage="Senha alterada"
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
        hint={`Pelo menos ${MIN_PASSWORD} caracteres.`}
      />
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
          <PasswordForm onDone={done} />
        </AccessRow>
      </ul>
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
