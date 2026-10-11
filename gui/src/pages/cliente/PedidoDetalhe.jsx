import { ArrowLeft, CalendarDays, CircleCheck, Clock, CreditCard, QrCode, Undo2, XCircle } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { OrderStatusBadge } from '../../components/OrderStatusBadge'
import { OrderReview } from '../../components/OrderReview'
import { OrderTimeline } from '../../components/OrderTimeline'
import { ProductImage } from '../../components/ProductImage'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useAsync } from '../../hooks/useAsync'
import { cancelOrder, getOrder } from '../../services/orderService'
import { listPayments } from '../../services/paymentService'
import { formatDateLong, formatDateTime } from '../../utils/date'
import { getErrorMessage } from '../../utils/errors'
import { formatCurrency } from '../../utils/format'
import { STATUS, canClientCancel } from '../../utils/orderStatus'
import {
  PAYMENT_DEADLINE_MINUTES,
  PAYMENT_METHOD,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS,
} from '../../utils/paymentStatus'

function CancelOrder({ pedidoId, paid, onCancelled }) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCancel = async () => {
    setLoading(true)
    setError('')
    try {
      await cancelOrder(pedidoId)
      toast.success('Pedido cancelado', {
        description: paid
          ? 'O valor pago será devolvido na mesma forma de pagamento.'
          : 'A data voltou a ficar livre na agenda.',
      })
      onCancelled()
    } catch (err) {
      setError(getErrorMessage(err))
      setLoading(false)
    }
  }

  if (!confirming) {
    return (
      <Button variant="ghost" className="text-destructive" onClick={() => setConfirming(true)}>
        <XCircle className="h-4 w-4" aria-hidden="true" />
        Cancelar pedido
      </Button>
    )
  }

  return (
    <Card className="border-destructive/30 bg-destructive/5 p-4">
      <p className="mb-3 font-medium">Cancelar este pedido?</p>
      <p className="mb-4 text-sm text-muted-foreground">
        {paid
          ? 'O valor pago será estornado automaticamente. No PIX, volta para a sua conta; no cartão, aparece na fatura. Essa ação não pode ser desfeita.'
          : 'Essa ação não pode ser desfeita.'}
      </p>
      {error && <Alert className="mb-4">{error}</Alert>}
      <div className="flex flex-wrap gap-3">
        <Button className="bg-destructive hover:bg-destructive/90" onClick={handleCancel} loading={loading}>
          Sim, cancelar
        </Button>
        <Button variant="outline" onClick={() => setConfirming(false)} disabled={loading}>
          Manter pedido
        </Button>
      </div>
    </Card>
  )
}

/** Como o pedido foi pago (ou estornado) — a tentativa que importa para o cliente. */
function PaymentSummary({ pagamentos }) {
  const pagamento =
    pagamentos.find((p) => p.status === PAYMENT_STATUS.APROVADO) ??
    pagamentos.find((p) => p.status === PAYMENT_STATUS.ESTORNADO)
  if (!pagamento) return null

  const Icon = pagamento.metodo === PAYMENT_METHOD.PIX ? QrCode : CreditCard
  const refunded = pagamento.status === PAYMENT_STATUS.ESTORNADO

  return (
    <div className="mt-6 flex items-start gap-3 rounded-lg bg-muted p-4 text-sm">
      {refunded ? (
        <Undo2 className="mt-0.5 h-5 w-5 shrink-0 text-gold-dark" aria-hidden="true" />
      ) : (
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-gold-dark" aria-hidden="true" />
      )}
      <p>
        {refunded ? (
          <>
            <span className="font-medium">Valor estornado</span> — {formatCurrency(pagamento.valor)} devolvidos no{' '}
            {PAYMENT_METHOD_LABEL[pagamento.metodo]}.
          </>
        ) : (
          <>
            <span className="font-medium">Pago com {PAYMENT_METHOD_LABEL[pagamento.metodo]}</span> em{' '}
            {formatDateTime(pagamento.data_hora)}.
          </>
        )}
      </p>
    </div>
  )
}

async function loadOrder(id) {
  const [pedido, pagamentos] = await Promise.all([getOrder(id), listPayments(id)])
  return { pedido, pagamentos }
}

export function PedidoDetalhe() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const justPaid = searchParams.get('pago') === '1'

  const fetchOrder = useCallback(() => loadOrder(id), [id])
  const { data, loading, error, reload } = useAsync(fetchOrder)

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-12" aria-hidden="true">
        <div className="h-10 w-64 animate-pulse rounded bg-muted" />
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="mb-3 text-3xl">Pedido não encontrado</h1>
        <p className="mb-8 text-muted-foreground">{error}</p>
        <Button as={Link} to="/pedidos">
          Ver meus pedidos
        </Button>
      </div>
    )
  }

  const { pedido, pagamentos } = data
  const status = pedido.status.descricao
  const cancelled = status === STATUS.CANCELADO
  const paid = pagamentos.some((p) => p.status === PAYMENT_STATUS.APROVADO)
  const showPaidHero = justPaid && paid && !cancelled

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:py-12">
      <Button as={Link} to="/pedidos" variant="ghost" size="sm" className="mb-6 -ml-3">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Meus pedidos
      </Button>

      {showPaidHero && (
        <div className="mb-8 text-center">
          <CircleCheck className="mx-auto mb-4 h-16 w-16 text-gold-dark" aria-hidden="true" />
          <h1 className="mb-2 text-3xl md:text-4xl">Pagamento confirmado!</h1>
          <p className="text-lg text-muted-foreground">
            Seu pedido já está na nossa fila de produção. Te esperamos na data da retirada.
          </p>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          {showPaidHero ? (
            <h2 className="text-2xl">Detalhes do pedido</h2>
          ) : (
            <h1 className="text-3xl">Detalhes do pedido</h1>
          )}
          <p className="text-sm text-muted-foreground">
            Feito em {formatDateTime(pedido.data_pedido)}
            {/* Mesmo número que a loja vê no painel — útil se o cliente precisar falar com a loja */}
            <span className="whitespace-nowrap"> · Código #{pedido.id}</span>
          </p>
        </div>
        <OrderStatusBadge descricao={status} className="px-3 py-1 text-sm" />
      </div>

      <div className="space-y-6">
        {/* Pesquisa NPS: só depois da retirada, e no topo para não passar despercebida */}
        {status === STATUS.ENTREGUE && (
          <OrderReview pedidoId={pedido.id} avaliacao={pedido.avaliacao} onReviewed={reload} />
        )}

        {/* Retirada + andamento */}
        <Card className="p-5 md:p-6">
          <div className="mb-6 flex items-center gap-3">
            <CalendarDays className="h-6 w-6 shrink-0 text-gold-dark" aria-hidden="true" />
            <div>
              <p className="text-sm text-muted-foreground">Retirada na loja</p>
              <p className="font-serif text-xl">{formatDateLong(pedido.data_retirada)}</p>
            </div>
          </div>
          {cancelled ? (
            <p className="rounded-lg bg-red-50 p-4 text-sm text-red-800">Este pedido foi cancelado.</p>
          ) : (
            <OrderTimeline descricao={status} />
          )}
        </Card>

        {status === STATUS.AGUARDANDO_PAGAMENTO && (
          <Card className="flex flex-col gap-4 border-2 border-gold/40 bg-gold/5 p-5 sm:flex-row sm:items-center md:p-6">
            <QrCode className="hidden h-8 w-8 shrink-0 text-gold-dark sm:block" aria-hidden="true" />
            <div className="flex-1">
              <h2 className="mb-1 text-xl">Falta pagar</h2>
              <p className="text-muted-foreground">
                Pague com PIX ou cartão de crédito. Pedidos sem pagamento em {PAYMENT_DEADLINE_MINUTES} minutos são
                cancelados e a data é liberada.
              </p>
            </div>
            <Button as={Link} to={`/pedidos/${pedido.id}/pagamento`} variant="gold" size="lg" className="shrink-0">
              Pagar agora
            </Button>
          </Card>
        )}

        {/* Itens */}
        <Card className="p-5 md:p-6">
          <h2 className="mb-4 text-xl">Itens</h2>
          <ul className="divide-y">
            {pedido.itens.map((item) => (
              <li key={item.id} className="flex items-center gap-4 py-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                  <ProductImage src={item.produto_foto} alt="" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.produto_nome}</p>
                  <p className="text-sm text-muted-foreground tabular-nums">
                    {item.quantidade} × {formatCurrency(item.preco_unitario)}
                  </p>
                </div>
                <span className="shrink-0 lining-nums">{formatCurrency(item.subtotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-baseline justify-between border-t-2 border-gold pt-4">
            <span className="text-lg">Total</span>
            <span className="font-serif text-3xl text-gold-dark lining-nums">{formatCurrency(pedido.valor_total)}</span>
          </div>

          <PaymentSummary pagamentos={pagamentos} />

          {pedido.observacoes && (
            <div className="mt-6 rounded-lg bg-muted p-4">
              <p className="mb-1 text-sm font-medium">Observações</p>
              <p className="whitespace-pre-line text-sm text-muted-foreground">{pedido.observacoes}</p>
            </div>
          )}
        </Card>

        {canClientCancel(status) && (
          <div className="flex flex-col items-start gap-2">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" aria-hidden="true" />
              Você pode cancelar enquanto o pedido não entrar em produção.
            </p>
            <CancelOrder pedidoId={pedido.id} paid={paid} onCancelled={reload} />
          </div>
        )}
      </div>
    </div>
  )
}