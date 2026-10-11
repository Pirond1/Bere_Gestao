import { ChevronRight, ClipboardList, RotateCw } from 'lucide-react'
import { Link } from 'react-router'

import { OrderStatusBadge } from '../../components/OrderStatusBadge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useAsync } from '../../hooks/useAsync'
import { listMyOrders } from '../../services/orderService'
import { formatDateLong } from '../../utils/date'
import { formatCurrency } from '../../utils/format'

const itemsLabel = (itens) => {
  const n = itens.reduce((sum, i) => sum + i.quantidade, 0)
  return `${n} ${n === 1 ? 'item' : 'itens'}`
}

export function MeusPedidos() {
  const { data: pedidos, loading, error, reload } = useAsync(listMyOrders)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      <h1 className="mb-8 text-3xl md:text-4xl">Meus pedidos</h1>

      {loading ? (
        <div className="space-y-4" aria-hidden="true">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : error ? (
        <div className="py-16 text-center">
          <p className="mb-6 text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={reload}>
            <RotateCw className="h-4 w-4" aria-hidden="true" />
            Tentar novamente
          </Button>
        </div>
      ) : pedidos.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <ClipboardList className="mb-6 h-16 w-16 text-muted-foreground/50" aria-hidden="true" />
          <p className="mb-2 text-xl">Você ainda não fez nenhum pedido</p>
          <p className="mb-8 text-muted-foreground">Que tal começar por um dos nossos bolos?</p>
          <Button as={Link} to="/vitrine" size="lg">
            Ver cardápio
          </Button>
        </div>
      ) : (
        <ul className="space-y-4">
          {pedidos.map((pedido) => (
            <li key={pedido.id}>
              <Card
                as={Link}
                to={`/pedidos/${pedido.id}`}
                className="group flex items-center gap-4 border-2 p-5 transition-colors hover:border-gold"
              >
                <div className="min-w-0 flex-1">
                  {/* O cliente reconhece o pedido pela data de retirada, não por um número interno */}
                  <p className="text-xs tracking-wide text-muted-foreground uppercase">Retirada</p>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="font-serif text-lg">{formatDateLong(pedido.data_retirada)}</span>
                    <OrderStatusBadge descricao={pedido.status.descricao} />
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {itemsLabel(pedido.itens)} · {pedido.itens.map((i) => i.produto_nome).join(', ')}
                  </p>
                </div>
                <span className="shrink-0 font-serif text-lg text-gold-dark lining-nums">
                  {formatCurrency(pedido.valor_total)}
                </span>
                <ChevronRight
                  className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}