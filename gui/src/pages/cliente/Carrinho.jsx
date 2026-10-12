import { ShoppingBag, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router'

import { ProductImage } from '../../components/ProductImage'
import { QuantityStepper } from '../../components/QuantityStepper'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useAuth } from '../../hooks/useAuth'
import { useCarrinho } from '../../hooks/useCarrinho'
import { useCartSync } from '../../hooks/useCartSync'
import { formatCurrency } from '../../utils/format'

const plural = (n) => `${n} ${n === 1 ? 'item' : 'itens'}`

export function Carrinho() {
  const { items, itemCount, total, updateQuantity, removeItem } = useCarrinho()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  useCartSync()

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
        <ShoppingBag className="mb-6 h-20 w-20 text-muted-foreground/50" aria-hidden="true" />
        <h1 className="mb-3 text-3xl">Seu carrinho está vazio</h1>
        <p className="mb-8 text-muted-foreground">Escolha suas delícias no cardápio e elas aparecem aqui.</p>
        <Button as={Link} to="/vitrine" size="lg">
          Ver cardápio
        </Button>
      </div>
    )
  }

  const goToCheckout = () => {
    // Sem login, passa pelo login e volta direto para o checkout
    if (isAuthenticated) navigate('/checkout')
    else navigate('/login', { state: { from: { pathname: '/checkout' } } })
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <h1 className="mb-8 text-3xl md:text-4xl">
        Meu carrinho <span className="text-muted-foreground">({plural(itemCount)})</span>
      </h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <ul className="space-y-4 lg:col-span-2">
          {items.map((item) => (
            <li key={item.produtoId}>
              <Card className="flex gap-4 p-4 md:p-5">
                <Link
                  to={`/produto/${item.produtoId}`}
                  className="h-24 w-24 shrink-0 overflow-hidden rounded-lg md:h-28 md:w-28"
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  <ProductImage src={item.foto} alt="" />
                </Link>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {item.categoria && (
                        <span className="text-xs font-medium uppercase tracking-wider text-terracotta">
                          {item.categoria}
                        </span>
                      )}
                      <Link to={`/produto/${item.produtoId}`} className="block hover:underline">
                        <h2 className="truncate text-lg">{item.nome}</h2>
                      </Link>
                      <p className="text-sm text-muted-foreground">{formatCurrency(item.preco)} cada</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="-mr-2 -mt-2 shrink-0 text-destructive"
                      onClick={() => removeItem(item.produtoId)}
                      aria-label={`Remover ${item.nome}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                    <QuantityStepper
                      size="sm"
                      value={item.quantidade}
                      onChange={(q) => updateQuantity(item.produtoId, q)}
                      label={`Quantidade de ${item.nome}`}
                    />
                    <span className="font-serif text-lg text-gold-dark lining-nums">
                      {formatCurrency(Number(item.preco) * item.quantidade)}
                    </span>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>

        <aside className="lg:col-span-1">
          <Card className="sticky top-24 p-6">
            <h2 className="mb-6 text-xl">Resumo do pedido</h2>
            <div className="mb-4 flex justify-between text-muted-foreground">
              <span>Subtotal ({plural(itemCount)})</span>
              <span className="lining-nums">{formatCurrency(total)}</span>
            </div>
            <div className="mb-6 flex justify-between text-muted-foreground">
              <span>Retirada na loja</span>
              <span className="text-success">Grátis</span>
            </div>
            <div className="mb-6 flex items-baseline justify-between border-t pt-4">
              <span className="text-lg">Total</span>
              <span className="font-serif text-3xl text-gold-dark lining-nums">{formatCurrency(total)}</span>
            </div>
            <Button size="lg" className="mb-3 w-full" onClick={goToCheckout}>
              {isAuthenticated ? 'Escolher data de retirada' : 'Entrar para finalizar'}
            </Button>
            <Button as={Link} to="/vitrine" variant="outline" className="w-full">
              Continuar comprando
            </Button>
          </Card>
        </aside>
      </div>
    </div>
  )
}