import { ArrowLeft, ClipboardList, Mail, MapPin, MessageCircle, Phone, Trash2, UserRound } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'

import { AddressForm } from '../../components/AddressForm'
import { OrderStatusBadge } from '../../components/OrderStatusBadge'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Field } from '../../components/ui/Field'
import { useAsync } from '../../hooks/useAsync'
import { deleteClient, getPanelClient, saveClientAddress, updateClient } from '../../services/adminClientService'
import { formatDateShort, formatDateTime, toDateKey } from '../../utils/date'
import { getErrorMessage } from '../../utils/errors'
import { formatCurrency, maskCpf, maskPhone, onlyDigits } from '../../utils/format'
import { isValidCpf, isValidPhone } from '../../utils/validators'
import { whatsappLink } from '../../utils/whatsapp'

function SectionTitle({ icon: Icon, children }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-xl">
      <Icon className="h-5 w-5 text-gold-dark" aria-hidden="true" />
      {children}
    </h2>
  )
}

function ClientData({ cliente, onSaved }) {
  const [form, setForm] = useState({
    nome: cliente.nome,
    cpf: maskCpf(cliente.cpf),
    telefone: cliente.telefone ? maskPhone(cliente.telefone) : '',
    data_nascimento: cliente.data_nascimento ?? '',
  })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const update = (campo, mask) => (e) => setForm((f) => ({ ...f, [campo]: mask ? mask(e.target.value) : e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const found = {}
    if (!form.nome.trim()) found.nome = 'Informe o nome'
    if (!isValidCpf(form.cpf)) found.cpf = 'CPF inválido'
    if (!isValidPhone(form.telefone)) found.telefone = 'Informe o telefone com DDD'
    if (form.data_nascimento && form.data_nascimento > toDateKey(new Date())) found.data_nascimento = 'Data no futuro'
    setErrors(found)
    setError('')
    if (Object.keys(found).length) return

    setSaving(true)
    try {
      await updateClient(cliente.id, {
        nome: form.nome.trim(),
        cpf: onlyDigits(form.cpf),
        telefone: onlyDigits(form.telefone),
        data_nascimento: form.data_nascimento || null,
      })
      toast.success('Cadastro atualizado')
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="p-5 md:p-6">
      <SectionTitle icon={UserRound}>Dados cadastrais</SectionTitle>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Field label="Nome completo" maxLength={100} value={form.nome} onChange={update('nome')} error={errors.nome} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="CPF" inputMode="numeric" value={form.cpf} onChange={update('cpf', maskCpf)} error={errors.cpf} />
          <Field
            label="Telefone (WhatsApp)"
            type="tel"
            inputMode="numeric"
            value={form.telefone}
            onChange={update('telefone', maskPhone)}
            error={errors.telefone}
          />
          <Field
            label="Data de nascimento"
            optional
            type="date"
            max={toDateKey(new Date())}
            value={form.data_nascimento}
            onChange={update('data_nascimento')}
            error={errors.data_nascimento}
          />
        </div>
        <p className="text-xs text-muted-foreground">E-mail e senha são o acesso do cliente — só ele pode alterar.</p>
        {error && <Alert>{error}</Alert>}
        <Button type="submit" loading={saving}>
          Salvar cadastro
        </Button>
      </form>
    </Card>
  )
}

function Contact({ cliente }) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-lg">Contato</h2>
      <ul className="space-y-3 text-sm">
        {cliente.telefone ? (
          <li className="flex flex-wrap items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <a href={`tel:+55${cliente.telefone}`} className="hover:text-gold-dark hover:underline">
              {maskPhone(cliente.telefone)}
            </a>
            <a
              href={whatsappLink(cliente.telefone)}
              target="_blank"
              rel="noreferrer"
              className="ml-auto flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success hover:bg-success/20"
            >
              <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
              WhatsApp
            </a>
          </li>
        ) : (
          <li className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-4 w-4" aria-hidden="true" />
            Sem telefone cadastrado
          </li>
        )}
        <li className="flex items-center gap-2">
          <Mail className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <a href={`mailto:${cliente.email}`} className="truncate hover:text-gold-dark hover:underline">
            {cliente.email}
          </a>
        </li>
      </ul>
    </Card>
  )
}

function Summary({ cliente }) {
  const ticket = cliente.pedidos_pagos ? Number(cliente.total_gasto) / cliente.pedidos_pagos : 0
  const items = [
    { label: 'Pedidos pagos', value: cliente.pedidos_pagos },
    { label: 'Total gasto', value: formatCurrency(cliente.total_gasto) },
    { label: 'Ticket médio', value: cliente.pedidos_pagos ? formatCurrency(ticket) : '–' },
    { label: 'Último pedido', value: cliente.ultimo_pedido ? formatDateTime(cliente.ultimo_pedido).split(' às')[0] : '–' },
  ]
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-lg">Compras</h2>
      <dl className="grid grid-cols-2 gap-4">
        {items.map((item) => (
          <div key={item.label}>
            <dt className="text-xs text-muted-foreground">{item.label}</dt>
            <dd className="font-serif text-lg lining-nums">{item.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-muted-foreground">Contam só pedidos pagos, como nos relatórios.</p>
    </Card>
  )
}

function OrderHistory({ pedidos }) {
  return (
    <Card className="p-5 md:p-6">
      <SectionTitle icon={ClipboardList}>Pedidos</SectionTitle>
      {pedidos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Este cliente ainda não fez pedidos.</p>
      ) : (
        <ul className="divide-y">
          {pedidos.map((p) => (
            <li key={p.id}>
              <Link
                to={`/admin/pedidos/${p.id}`}
                className="-mx-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2 py-3 transition-colors hover:bg-muted/60"
              >
                <span className="font-medium tabular-nums">#{p.id}</span>
                <OrderStatusBadge descricao={p.status} />
                <span className="text-sm text-muted-foreground">Retirada {formatDateShort(p.data_retirada)}</span>
                <span className="ml-auto font-serif text-gold-dark lining-nums">{formatCurrency(p.valor_total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function DeleteClient({ cliente }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    setLoading(true)
    setError('')
    try {
      await deleteClient(cliente.id)
      toast.success('Conta excluída', { description: 'Os dados pessoais foram apagados.' })
      navigate('/admin/clientes', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        Excluir conta
      </Button>
    )
  }

  return (
    <Card className="border-destructive/30 bg-destructive/5 p-4">
      <p className="mb-1 font-medium">Excluir a conta de {cliente.nome}?</p>
      <p className="mb-4 text-sm text-muted-foreground">
        Use quando o cliente pedir a exclusão dos dados (LGPD). Nome, CPF, telefone, nascimento e endereço são apagados e
        o acesso é bloqueado. Os pedidos continuam nos relatórios, sem identificar a pessoa. Não pode ser desfeito.
      </p>
      {error && <Alert className="mb-4">{error}</Alert>}
      <div className="flex flex-wrap gap-3">
        <Button className="bg-destructive hover:bg-destructive/90" onClick={handleDelete} loading={loading}>
          Sim, excluir
        </Button>
        <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
          Manter conta
        </Button>
      </div>
    </Card>
  )
}

export function ClienteAdmin() {
  const { id } = useParams()
  const fetchClient = useCallback(() => getPanelClient(id), [id])
  const { data: cliente, loading, error, refresh } = useAsync(fetchClient)

  if (loading && !cliente) {
    return (
      <div className="mx-auto max-w-5xl space-y-6" aria-hidden="true">
        <div className="h-10 w-64 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="mb-3 text-3xl">Cliente não encontrado</h1>
        <p className="mb-8 text-muted-foreground">{error}</p>
        <Button as={Link} to="/admin/clientes">
          Voltar para clientes
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Button as={Link} to="/admin/clientes" variant="ghost" size="sm" className="mb-4 -ml-3">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Clientes
      </Button>
      <header className="mb-6">
        <h1 className="text-3xl">{cliente.nome}</h1>
        {cliente.data_assinatura && (
          <p className="text-sm text-muted-foreground">Cliente desde {formatDateShort(cliente.data_assinatura)}</p>
        )}
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ClientData cliente={cliente} onSaved={refresh} />
          <Card className="p-5 md:p-6">
            <SectionTitle icon={MapPin}>Endereço</SectionTitle>
            <AddressForm
              endereco={cliente.enderecos[0] ?? null}
              onSave={(dados) => saveClientAddress(cliente.id, dados)}
              onSaved={refresh}
            />
          </Card>
          <OrderHistory pedidos={cliente.pedidos} />
        </div>

        <aside className="order-first space-y-6 lg:order-none">
          <Contact cliente={cliente} />
          <Summary cliente={cliente} />
          <DeleteClient cliente={cliente} />
        </aside>
      </div>
    </div>
  )
}
