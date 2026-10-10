import { ArrowLeft, ShoppingBag } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'

import { ProductImage } from '../../components/ProductImage'
import { QuantityStepper } from '../../components/QuantityStepper'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useAsync } from '../../hooks/useAsync'
import { useAuth } from '../../hooks/useAuth'
import { useCarrinho } from '../../hooks/useCarrinho'
import { getProduct } from '../../services/productService'
import { formatCurrency } from '../../utils/format'

function ProdutoSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12" aria-hidden="true">
      <div className="aspect-square animate-pulse rounded-lg bg-muted" />
      <div className="space-y-4">
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        <div className="h-10 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-20 w-full animate-pulse rounded bg-muted" />
        <div className="h-10 w-32 animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}

export function Produto() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { addItem } = useCarrinho()
  const [quantidade, setQuantidade] = useState(1)

  const fetchProduct = useCallback(() => getProduct(id), [id])
  const { data: product, loading, error } = useAsync(fetchProduct)

  const handleAdd = () => {
    addItem(product, quantidade)
    toast.success('Adicionado ao carrinho', {
      description: `${quantidade}× ${product.nome}`,
      action: { label: 'Ver carrinho', onClick: () => navigate('/carrinho') },
    })
    setQuantidade(1)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <Button as={Link} to="/vitrine" variant="ghost" size="sm" className="mb-6 -ml-3">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Voltar ao cardápio
      </Button>

      {loading ? (
        <ProdutoSkeleton />
      ) : error ? (
        <div className="py-16 text-center">
          <h1 className="mb-3 text-3xl">Produto não encontrado</h1>
          <p className="mb-8 text-muted-foreground">Ele pode ter saído do cardápio. Que tal ver as outras delícias?</p>
          <Button as={Link} to="/vitrine">
            Ver cardápio
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
          <Card className="aspect-square overflow-hidden shadow-xl">
            <ProductImage src={product.foto} alt={product.nome} iconClassName="h-1/4" />
          </Card>

          <div className="flex flex-col gap-6">
            <div>
              {product.categoria && (
                <Link
                  to={`/vitrine?categoria=${product.categoria.id}`}
                  className="mb-2 inline-block text-xs font-medium uppercase tracking-wider text-terracotta hover:underline"
                >
                  {product.categoria.nome}
                </Link>
              )}
              <h1 className="mb-3 text-3xl md:text-4xl">{product.nome}</h1>
              {product.descricao && <p className="text-lg text-muted-foreground">{product.descricao}</p>}
            </div>

            <span className="font-serif text-4xl text-gold-dark lining-nums">{formatCurrency(product.preco)}</span>

            {isAdmin ? (
              <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                Esta é uma conta de administração — pedidos são feitos por uma conta de cliente.
              </p>
            ) : (
              <Card className="space-y-5 bg-chocolate p-6 text-vanilla">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium">Quantidade</span>
                  <div className="rounded-lg bg-vanilla p-1 text-chocolate">
                    <QuantityStepper value={quantidade} onChange={setQuantidade} />
                  </div>
                </div>
                <div className="flex items-baseline justify-between border-t border-vanilla/20 pt-4">
                  <span>Total</span>
                  <span className="font-serif text-3xl lining-nums">
                    {formatCurrency(Number(product.preco) * quantidade)}
                  </span>
                </div>
                <Button variant="gold" size="lg" className="w-full" onClick={handleAdd}>
                  <ShoppingBag className="h-5 w-5" aria-hidden="true" />
                  Adicionar ao carrinho
                </Button>
              </Card>
            )}

            <p className="text-sm text-muted-foreground">
              Retirada na loja, na data que você escolher ao finalizar o pedido.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}