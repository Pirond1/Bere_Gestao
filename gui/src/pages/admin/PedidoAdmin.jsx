import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  Mail,
  MessageCircle,
  MessageSquareText,
  Phone,
  QrCode,
  Star,
  Undo2,
  XCircle,
} from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'

import { OrderStatusBadge } from '../../components/OrderStatusBadge'
import { OrderTimeline } from '../../components/OrderTimeline'
import { ProductImage } from '../../components/ProductImage'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useAsync } from '../../hooks/useAsync'
import {
  advanceOrder,
  cancelPanelOrder,
  getPanelOrder,
  markOrderSeen,
  notifyOrdersChanged,
  revertOrder,
} from '../../services/adminOrderService'
import { cn } from '../../utils/cn'
import { formatDateLong, formatDateTime } from '../../utils/date'
import { getErrorMessage } from '../../utils/errors'
import { formatCurrency, maskPhone } from '../../utils/format'
import { STATUS, STATUS_INFO, canAdminCancel, panelActions } from '../../utils/orderStatus'
import { PAYMENT_METHOD, PAYMENT_METHOD_LABEL, PAYMENT_STATUS, PAYMENT_STATUS_LABEL } from '../../utils/paymentStatus'

const MAX_REASON = 255

const PAYMENT_STATUS_CLASS = {
  [PAYMENT_STATUS.APROVADO]: 'text-success',
  [PAYMENT_STATUS.ESTORNADO]: 'text-gold-dark',
  [PAYMENT_STATUS.RECUSADO]: 'text-destructive',
}

/** Avançar/voltar etapa — a ação principal da tela. */
function StatusActions({ pedido, onChanged }) {
  const [loading, setLoading] = useState(null)
  const { next, previous } = panelActions(pedido.status.descricao)
  if (!next && !previous) return null

  const run = (action, fn) => async () => {
    setLoading(action)
    try {
      const atualizado = await fn(pedido.id)
      toast.success('Status atualizado', {
        description: `Pedido agora está como "${STATUS_INFO[atualizado.status.descricao].label}".`,
      })
      onChanged()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      {next && (
        <Button size="lg" onClick={run('next', advanceOrder)} loading={loading === 'next'} disabled={Boolean(loading)}>
          {next}
        </Button>
      )}
      {previous && (
        <Button
          variant="ghost"
          size="sm"
          onClick={run('previous', revertOrder)}
          loading={loading === 'previous'}
          disabled={Boolean(loading)}
          className="text-muted-foreground"
        >
          <Undo2 className="h-4 w-4" aria-hidden="true" />
          {previous}
        </Button>
      )}
    </div>
  )
}

function CancelOrder({ pedido, paid, onCancelled }) {
  const [open, setOpen] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCancel = async () => {
    setLoading(true)
    setError('')
    try {
      await cancelPanelOrder(pedido.id, motivo.trim())
      toast.success('Pedido cancelado', {
        description: paid ? 'O valor foi estornado ao cliente e a vaga voltou para a agenda.' : 'A vaga voltou para a agenda.',
      })
      onCancelled()
    } catch (err) {
      setError(getErrorMessage(err))
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setOpen(true)}>
        <XCircle className="h-4 w-4" aria-hidden="true" />
        Cancelar pedido
      </Button>
    )
  }

  return (
    <Card className="border-destructive/30 bg-destructive/5 p-4">
      <p className="mb-1 font-medium">Cancelar o pedido de {pedido.cliente.nome}?</p>
      <p className="mb-4 text-sm text-muted-foreground">
        {paid
          ? `O pagamento de ${formatCurrency(pedido.valor_total)} será estornado automaticamente. `
          : ''}
        A data volta a ficar livre na agenda. Essa ação não pode ser desfeita.
      </p>
      <label htmlFor="motivo" className="mb-1.5 block text-sm font-medium">
        Motivo <span className="font-normal text-muted-foreground">(opcional — o cliente verá)</span>
      </label>
      <textarea
        id="motivo"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        maxLength={MAX_REASON}
        rows={2}
        placeholder="Ex.: faltou um ingrediente para este sabor"
        className="mb-4 w-full resize-none rounded-lg border-2 bg-white p-3 text-sm placeholder:text-muted-foreground/60 focus:border-gold focus:outline-none"
      />
      {error && <Alert className="mb-4">{error}</Alert>}
      <div className="flex flex-wrap gap-3">
        <Button className="bg-destructive hover:bg-destructive/90" onClick={handleCancel} loading={loading}>
          Sim, cancelar
        </Button>
        <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
          Manter pedido
        </Button>
      </div>
    </Card>
  )
}

function CustomerCard({ cliente }) {
  const digits = cliente.telefone?.replace(/\D/g, '')
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-lg">Cliente</h2>
      <p className="mb-3 font-medium">{cliente.nome}</p>
      <ul className="space-y-2 text-sm">
        {digits ? (
          <li className="flex flex-wrap items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <a href={`tel:+55${digits}`} className="hover:text-gold-dark hover:underline">
              {maskPhone(digits)}
            </a>
            <a
              href={`https://wa.me/55${digits}`}
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

/** Todas as tentativas, da mais recente para a mais antiga. */
function PaymentsCard({ pagamentos }) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-lg">Pagamento</h2>
      {pagamentos.length === 0 ? (
        <p className="text-sm text-muted-foreground">O cliente ainda não tentou pagar.</p>
      ) : (
        <ul className="space-y-3 text-sm">
          {[...pagamentos].reverse().map((p) => {
            const Icon = p.metodo === PAYMENT_METHOD.PIX ? QrCode : CreditCard
            return (
              <li key={p.id} className="flex items-start gap-3">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p>
                    <span className="capitalize">{PAYMENT_METHOD_LABEL[p.metodo]}</span> ·{' '}
                    <span className={cn('font-medium', PAYMENT_STATUS_CLASS[p.status])}>
                      {PAYMENT_STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(p.data_hora)} · {formatCurrency(p.valor)}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

export function PedidoAdmin() {
  const { id } = useParams()
  const fetchOrder = useCallback(async () => {
    const pedido = await getPanelOrder(id)
    if (!pedido.novo) return pedido
    // Abrir o detalhe é o que tira o pedido da lista de novos
    const visto = await markOrderSeen(id)
    notifyOrdersChanged()
    return visto
  }, [id])
  const { data: pedido, loading, error, reload } = useAsync(fetchOrder)

  if (loading && !pedido) {
    return (
      <div className="mx-auto max-w-5xl space-y-6" aria-hidden="true">
        <div className="h-10 w-64 animate-pulse rounded bg-muted" />
        <div className="h-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="mb-3 text-3xl">Pedido não encontrado</h1>
        <p className="mb-8 text-muted-foreground">{error}</p>
        <Button as={Link} to="/admin/pedidos">
          Voltar para pedidos
        </Button>
      </div>
    )
  }

  const status = pedido.status.descricao
  const cancelled = status === STATUS.CANCELADO
  const paid = pedido.pagamentos.some((p) => p.status === PAYMENT_STATUS.APROVADO)

  return (
    <div className="mx-auto max-w-5xl">
      <Button as={Link} to="/admin/pedidos" variant="ghost" size="sm" className="mb-4 -ml-3">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Pedidos
      </Button>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl">Pedido {pedido.id}</h1>
          <p className="text-sm text-muted-foreground">Feito em {formatDateTime(pedido.data_pedido)}</p>
        </div>
        <OrderStatusBadge descricao={status} className="px-3 py-1 text-sm" />
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="space-y-6 p-5 md:p-6">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-6 w-6 shrink-0 text-gold-dark" aria-hidden="true" />
              <div>
                <p className="text-sm text-muted-foreground">Retirada</p>
                <p className="font-serif text-xl">{formatDateLong(pedido.data_retirada)}</p>
              </div>
            </div>

            {cancelled ? (
              <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
                <p className="font-medium">Pedido cancelado</p>
                {pedido.motivo_cancelamento && <p className="mt-1">Motivo: {pedido.motivo_cancelamento}</p>}
              </div>
            ) : (
              <OrderTimeline descricao={status} />
            )}

            {status === STATUS.AGUARDANDO_PAGAMENTO && (
              <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                Aguardando o cliente pagar. O pedido é confirmado automaticamente quando o pagamento for aprovado — ou
                cancelado se o prazo acabar.
              </p>
            )}

            <StatusActions pedido={pedido} onChanged={reload} />
          </Card>

          <Card className="p-5 md:p-6">
            <h2 className="mb-4 text-xl">Itens</h2>
            {pedido.observacoes && (
              <div className="mb-4 flex gap-3 rounded-lg border-2 border-terracotta/30 bg-terracotta/5 p-4">
                <MessageSquareText className="mt-0.5 h-5 w-5 shrink-0 text-terracotta" aria-hidden="true" />
                <div>
                  <p className="mb-1 text-sm font-medium">Observações do cliente</p>
                  <p className="text-sm whitespace-pre-line">{pedido.observacoes}</p>
                </div>
              </div>
            )}
            <ul className="divide-y">
              {pedido.itens.map((item) => (
                <li key={item.id} className="flex items-center gap-4 py-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                    <ProductImage src={item.produto_foto} alt="" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      <span className="tabular-nums">{item.quantidade}×</span> {item.produto_nome}
                    </p>
                    <p className="text-sm text-muted-foreground tabular-nums">
                      {formatCurrency(item.preco_unitario)} cada
                    </p>
                  </div>
                  <span className="shrink-0 lining-nums">{formatCurrency(item.subtotal)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex items-baseline justify-between border-t-2 border-gold pt-4">
              <span className="text-lg">Total</span>
              <span className="font-serif text-3xl text-gold-dark lining-nums">
                {formatCurrency(pedido.valor_total)}
              </span>
            </div>
          </Card>

          {canAdminCancel(status) && <CancelOrder pedido={pedido} paid={paid} onCancelled={reload} />}
        </div>

        <aside className="space-y-6">
          <CustomerCard cliente={pedido.cliente} />
          <PaymentsCard pagamentos={pedido.pagamentos} />
          {pedido.avaliacao && (
            <Card className="p-5">
              <h2 className="mb-3 flex items-center gap-2 text-lg">
                <Star className="h-5 w-5 text-gold-dark" aria-hidden="true" />
                Avaliação
              </h2>
              <p className="font-serif text-3xl text-gold-dark lining-nums">
                {pedido.avaliacao.nota}
                <span className="font-sans text-sm text-muted-foreground"> / 10</span>
              </p>
              {pedido.avaliacao.comentario && (
                <p className="mt-2 text-sm whitespace-pre-line">“{pedido.avaliacao.comentario}”</p>
              )}
            </Card>
          )}
        </aside>
      </div>
    </div>
  )
}
