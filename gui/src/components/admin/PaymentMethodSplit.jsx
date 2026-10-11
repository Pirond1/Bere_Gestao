import { CreditCard, QrCode, Wallet } from 'lucide-react'

import { formatCurrency } from '../../utils/format'
import { PAYMENT_METHOD } from '../../utils/paymentStatus'
import { Card } from '../ui/Card'

const METHODS = {
  [PAYMENT_METHOD.PIX]: { label: 'PIX', icon: QrCode, color: 'bg-gold' },
  [PAYMENT_METHOD.CARTAO_CREDITO]: { label: 'Cartão de crédito', icon: CreditCard, color: 'bg-chocolate' },
}

/** Quanto do total pago entrou por PIX e por cartão. */
export function PaymentMethodSplit({ metodos }) {
  const total = metodos.reduce((sum, m) => sum + Number(m.total), 0)
  // Sempre mostra as duas formas, mesmo zeradas, para facilitar a comparação
  const rows = Object.entries(METHODS).map(([id, info]) => {
    const found = metodos.find((m) => m.metodo === id)
    const value = Number(found?.total ?? 0)
    return { id, ...info, value, pedidos: found?.pedidos ?? 0, share: total ? value / total : 0 }
  })

  return (
    <Card className="p-5">
      <div className="mb-1 flex items-center gap-2">
        <Wallet className="h-5 w-5 text-gold-dark" aria-hidden="true" />
        <h2 className="text-lg">PIX × Cartão</h2>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">Forma de pagamento das vendas do período</p>

      <div className="mb-5 flex h-3 overflow-hidden rounded-full bg-muted">
        {rows.map((r) => (
          <div key={r.id} className={r.color} style={{ width: `${r.share * 100}%` }} />
        ))}
      </div>

      <ul className="space-y-4 text-sm">
        {rows.map(({ id, label, icon: Icon, color, value, pedidos, share }) => (
          <li key={id} className="flex items-center gap-3">
            <span className={`h-3 w-3 shrink-0 rounded-full ${color}`} />
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p>{label}</p>
              <p className="text-xs text-muted-foreground">
                {pedidos} {pedidos === 1 ? 'pedido' : 'pedidos'} · {formatCurrency(value)}
              </p>
            </div>
            <span className="font-serif text-lg tabular-nums">{Math.round(share * 100)}%</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}