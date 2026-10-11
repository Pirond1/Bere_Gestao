import { ArrowLeft, CreditCard, QrCode } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'

import { CardPaymentForm } from '../../components/CardPaymentForm'
import { PixPayment } from '../../components/PixPayment'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useAsync } from '../../hooks/useAsync'
import { getOrder } from '../../services/orderService'
import { createPayment, getMe, listPayments } from '../../services/paymentService'
import { cn } from '../../utils/cn'
import { formatDateLong, parseApiDateTime } from '../../utils/date'
import { getErrorMessage } from '../../utils/errors'
import { formatCurrency } from '../../utils/format'
import { STATUS } from '../../utils/orderStatus'
import {
  PAYMENT_DEADLINE_MINUTES,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  isPixOpen,
} from '../../utils/paymentStatus'

const METHODS = [
  {
    id: PAYMENT_METHOD.PIX,
    icon: QrCode,
    title: 'PIX',
    description: 'Aprovação na hora',
  },
  {
    id: PAYMENT_METHOD.CARTAO_CREDITO,
    icon: CreditCard,
    title: 'Cartão de crédito',
    description: 'À vista',
  },
]

function MethodOption({ method, selected, onSelect }) {
  const Icon = method.icon
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(method.id)}
      className={cn(
        'flex flex-1 cursor-pointer items-center gap-3 rounded-lg border-2 bg-white p-4 text-left transition-colors',
        selected ? 'border-gold bg-gold/5' : 'hover:border-gold/50',
      )}
    >
      <Icon className={cn('h-6 w-6 shrink-0', selected ? 'text-gold-dark' : 'text-muted-foreground')} aria-hidden="true" />
      <span>
        <span className="block font-medium">{method.title}</span>
        <span className="block text-sm text-muted-foreground">{method.description}</span>
      </span>
    </button>
  )
}

// Pedido, tentativas de pagamento e e-mail (para o formulário do cartão) em uma só carga
async function loadPaymentPage(id) {
  const [pedido, pagamentos, me] = await Promise.all([
    getOrder(id),
    listPayments(id),
    getMe().catch(() => null),
  ])
  const openPix = pagamentos.find(
    (p) => isPixOpen(p) && parseApiDateTime(p.expira_em) > new Date(),
  )
  return { pedido, openPix, email: me?.email }
}

export function Pagamento() {
  const { id } = useParams()
  const navigate = useNavigate()
  const fetchPage = useCallback(() => loadPaymentPage(id), [id])
  const { data, loading, error } = useAsync(fetchPage)

  // null = segue o PIX em aberto (se houver); depois, a escolha do cliente
  const [chosen, setChosen] = useState(null)
  const [newPix, setNewPix] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState('')

  const goToOrder = useCallback(
    (search = '') => navigate(`/pedidos/${id}${search}`, { replace: true }),
    [id, navigate],
  )

  const handleResolved = useCallback(
    (pagamento) => {
      if (pagamento.status === PAYMENT_STATUS.APROVADO) {
        toast.success('Pagamento confirmado!')
        goToOrder('?pago=1')
      } else if (pagamento.status === PAYMENT_STATUS.PENDENTE) {
        // Cartão em análise antifraude — o pedido mostra o andamento
        toast.info('Pagamento em análise', { description: 'Avisaremos assim que for aprovado.' })
        goToOrder()
      }
    },
    [goToOrder],
  )

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-12" aria-hidden="true">
        <div className="h-10 w-64 animate-pulse rounded bg-muted" />
        <div className="h-96 animate-pulse rounded-lg bg-muted" />
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

  const { pedido, openPix, email } = data
  // Já pago, cancelado ou em produção: não há o que pagar aqui
  if (pedido.status.descricao !== STATUS.AGUARDANDO_PAGAMENTO) {
    return <Navigate to={`/pedidos/${id}`} replace />
  }

  const pix = newPix ?? openPix
  const method = chosen ?? (pix ? PAYMENT_METHOD.PIX : null)

  const generatePix = async () => {
    setMessage('')
    setGenerating(true)
    try {
      setNewPix(await createPayment(id, { metodo: PAYMENT_METHOD.PIX }))
    } catch (err) {
      setMessage(getErrorMessage(err, 'Não foi possível gerar o PIX. Tente novamente.'))
    } finally {
      setGenerating(false)
    }
  }

  const payWithCard = async (cardData) => {
    setMessage('')
    try {
      const pagamento = await createPayment(id, {
        metodo: PAYMENT_METHOD.CARTAO_CREDITO,
        token: cardData.token,
        bandeira: cardData.payment_method_id,
      })
      if (pagamento.status === PAYMENT_STATUS.RECUSADO) {
        setMessage(pagamento.motivo_recusa)
        return
      }
      // O PIX que estava aberto foi cancelado pela API ao pagar com cartão
      setNewPix(null)
      handleResolved(pagamento)
    } catch (err) {
      setMessage(getErrorMessage(err, 'Não foi possível processar o pagamento. Tente novamente.'))
    }
  }

  const selectMethod = (value) => {
    setMessage('')
    setChosen(value)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <Button as={Link} to={`/pedidos/${id}`} variant="ghost" size="sm" className="mb-6 -ml-3">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Ver pedido
      </Button>

      <h1 className="mb-2 text-3xl md:text-4xl">Pagamento</h1>
      <p className="mb-8 text-muted-foreground">
        Sua data de retirada está reservada. Conclua o pagamento em até {PAYMENT_DEADLINE_MINUTES} minutos
        para garantir o pedido.
      </p>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="p-5 md:p-6">
            <h2 className="mb-4 text-xl">Como você quer pagar?</h2>
            <div role="radiogroup" aria-label="Forma de pagamento" className="mb-6 flex flex-col gap-3 sm:flex-row">
              {METHODS.map((m) => (
                <MethodOption key={m.id} method={m} selected={method === m.id} onSelect={selectMethod} />
              ))}
            </div>

            {message && <Alert className="mb-5">{message}</Alert>}

            {method === PAYMENT_METHOD.PIX &&
              (pix ? (
                <PixPayment key={pix.id} pagamento={pix} onResolved={handleResolved} />
              ) : (
                <div className="text-center">
                  <p className="mb-5 text-muted-foreground">
                    Vamos gerar um QR Code e um código “Pix Copia e Cola” para você pagar pelo app do seu banco.
                  </p>
                  <Button variant="gold" size="lg" className="w-full sm:w-auto" onClick={generatePix} loading={generating}>
                    <QrCode className="h-5 w-5" aria-hidden="true" />
                    Gerar PIX
                  </Button>
                </div>
              ))}

            {method === PAYMENT_METHOD.CARTAO_CREDITO && (
              <>
                {pix && (
                  <p className="mb-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                    Ao pagar com cartão, o PIX gerado para este pedido deixa de valer.
                  </p>
                )}
                <CardPaymentForm amount={pedido.valor_total} email={email} onSubmit={payWithCard} />
              </>
            )}

            {!method && (
              <p className="py-6 text-center text-sm text-muted-foreground">Escolha uma forma de pagamento acima.</p>
            )}
          </Card>
        </div>

        <aside className="lg:col-span-1">
          <Card className="sticky top-24 p-6">
            <h2 className="mb-5 text-xl">Resumo do pedido</h2>
            <ul className="mb-5 max-h-64 space-y-3 overflow-y-auto text-sm">
              {pedido.itens.map((item) => (
                <li key={item.id} className="flex justify-between gap-3">
                  <span>
                    <span className="tabular-nums">{item.quantidade}×</span> {item.produto_nome}
                  </span>
                  <span className="shrink-0 text-muted-foreground lining-nums">{formatCurrency(item.subtotal)}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between gap-3 border-t pt-4 text-sm">
              <span>Retirada</span>
              <span className="text-right font-medium">{formatDateLong(pedido.data_retirada)}</span>
            </div>
            <div className="mt-5 flex items-baseline justify-between border-t pt-4">
              <span className="text-lg">Total</span>
              <span className="font-serif text-3xl text-gold-dark lining-nums">{formatCurrency(pedido.valor_total)}</span>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  )
}