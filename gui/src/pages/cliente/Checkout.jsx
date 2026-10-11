import { CalendarDays, MessageSquareText, RotateCw } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { PickupCalendar } from '../../components/PickupCalendar'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useAsync } from '../../hooks/useAsync'
import { useCarrinho } from '../../hooks/useCarrinho'
import { useCartSync } from '../../hooks/useCartSync'
import { createOrder, getAvailability } from '../../services/orderService'
import { formatDateLong } from '../../utils/date'
import { getErrorMessage } from '../../utils/errors'
import { formatCurrency } from '../../utils/format'
import { PAYMENT_DEADLINE_MINUTES } from '../../utils/paymentStatus'

const MAX_NOTES = 500

function SectionTitle({ step, icon: Icon, children }) {
  return (
    <h2 className="mb-5 flex items-center gap-3 text-xl">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-chocolate font-sans text-sm text-gold">
        {step}
      </span>
      <Icon className="h-5 w-5 text-gold-dark" aria-hidden="true" />
      {children}
    </h2>
  )
}

export function Checkout() {
  const { items, total, clear } = useCarrinho()
  const navigate = useNavigate()
  const syncing = useCartSync()
  const availability = useAsync(getAvailability)

  const [dataRetirada, setDataRetirada] = useState(null)
  const [observacoes, setObservacoes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [placed, setPlaced] = useState(false)

  if (placed) return null
  if (items.length === 0) return <Navigate to="/carrinho" replace />

  const handleSubmit = async () => {
    setError('')
    setSubmitting(true)
    try {
      const pedido = await createOrder({
        data_retirada: dataRetirada,
        itens: items.map((i) => ({ produto_id: i.produtoId, quantidade: i.quantidade })),
        observacoes: observacoes.trim() || null,
      })
      setPlaced(true)
      clear()
      toast.success('Data reservada!', { description: 'Agora é só concluir o pagamento.' })
      navigate(`/pedidos/${pedido.id}/pagamento`, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível finalizar o pedido. Tente novamente.'))
      // A data pode ter lotado enquanto a cliente decidia — atualiza o calendário
      setDataRetirada(null)
      availability.reload()
      setSubmitting(false)
    }
  }

  const hasAnyDay = availability.data?.some((d) => d.disponivel)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <h1 className="mb-8 text-3xl md:text-4xl">Finalizar pedido</h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5 md:p-6">
            <SectionTitle step={1} icon={CalendarDays}>
              Data de retirada
            </SectionTitle>

            {availability.loading ? (
              <div className="aspect-[7/6] max-h-96 animate-pulse rounded-lg bg-muted" aria-label="Carregando datas" />
            ) : availability.error ? (
              <div className="py-8 text-center">
                <p className="mb-4 text-muted-foreground">{availability.error}</p>
                <Button variant="outline" onClick={availability.reload}>
                  <RotateCw className="h-4 w-4" aria-hidden="true" />
                  Tentar novamente
                </Button>
              </div>
            ) : !hasAnyDay ? (
              <p className="py-8 text-center text-muted-foreground">
                Nenhuma data disponível para retirada no momento. Tente novamente mais tarde.
              </p>
            ) : (
              <div className="mx-auto max-w-md">
                <PickupCalendar days={availability.data} selected={dataRetirada} onSelect={setDataRetirada} />
              </div>
            )}
          </Card>

          <Card className="p-5 md:p-6">
            <SectionTitle step={2} icon={MessageSquareText}>
              Observações <span className="font-sans text-sm font-normal text-muted-foreground">(opcional)</span>
            </SectionTitle>
            <label htmlFor="observacoes" className="sr-only">
              Observações do pedido
            </label>
            <textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              maxLength={MAX_NOTES}
              rows={4}
              placeholder="Ex.: sem coco, alergia a amendoim…"
              className="w-full resize-none rounded-lg border-2 bg-white p-3 placeholder:text-muted-foreground/60 focus:border-gold focus:outline-none"
            />
            <p className="mt-1 text-right text-xs text-muted-foreground tabular-nums">
              {observacoes.length}/{MAX_NOTES}
            </p>
          </Card>
        </div>

        <aside className="lg:col-span-1">
          <Card className="sticky top-24 p-6">
            <h2 className="mb-5 text-xl">Resumo do pedido</h2>

            <ul className="mb-5 max-h-64 space-y-3 overflow-y-auto text-sm">
              {items.map((item) => (
                <li key={item.produtoId} className="flex justify-between gap-3">
                  <span>
                    <span className="tabular-nums">{item.quantidade}×</span> {item.nome}
                  </span>
                  <span className="shrink-0 text-muted-foreground lining-nums">
                    {formatCurrency(Number(item.preco) * item.quantidade)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="space-y-2 border-t pt-4 text-sm">
              <div className="flex justify-between">
                <span>Retirada</span>
                <span className={dataRetirada ? 'text-right font-medium' : 'text-muted-foreground'}>
                  {dataRetirada ? formatDateLong(dataRetirada) : 'escolha uma data'}
                </span>
              </div>
            </div>

            <div className="my-5 flex items-baseline justify-between border-t pt-4">
              <span className="text-lg">Total</span>
              <span className="font-serif text-3xl text-gold-dark lining-nums">{formatCurrency(total)}</span>
            </div>

            {error && <Alert className="mb-4">{error}</Alert>}

            <Button
              variant="gold"
              size="lg"
              className="w-full"
              onClick={handleSubmit}
              disabled={!dataRetirada || syncing}
              loading={submitting}
            >
              Continuar para pagamento
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Na próxima etapa você paga com PIX ou cartão de crédito. A data fica reservada por{' '}
              {PAYMENT_DEADLINE_MINUTES} minutos.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  )
}