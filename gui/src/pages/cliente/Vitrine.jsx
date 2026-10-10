import { RotateCw } from 'lucide-react'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router'

import { ProductCard, ProductCardSkeleton } from '../../components/ProductCard'
import { Button } from '../../components/ui/Button'
import { useAsync } from '../../hooks/useAsync'
import { listCategories, listProducts } from '../../services/productService'
import { cn } from '../../utils/cn'

function CategoryChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 cursor-pointer rounded-full border-2 px-4 py-2 text-sm font-medium transition-colors',
        active ? 'border-chocolate bg-chocolate text-vanilla' : 'border-chocolate/15 bg-white hover:border-gold',
      )}
    >
      {children}
    </button>
  )
}

export function Vitrine() {
  const [searchParams, setSearchParams] = useSearchParams()
  const categories = useAsync(listCategories)
  const products = useAsync(listProducts)

  const selectedId = Number(searchParams.get('categoria')) || null
  const selectedCategory = categories.data?.find((c) => c.id === selectedId)

  const visibleProducts = useMemo(() => {
    if (!products.data) return []
    if (!selectedId) return products.data
    return products.data.filter((p) => p.categoria_id === selectedId)
  }, [products.data, selectedId])

  const selectCategory = (id) => {
    setSearchParams(id ? { categoria: String(id) } : {}, { replace: true })
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      <header className="mb-8 text-center">
        <h1 className="mb-3 text-4xl md:text-5xl">{selectedCategory?.nome ?? 'Cardápio'}</h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          {selectedCategory?.descricao ?? 'Tudo feito à mão, com ingredientes selecionados e muito carinho.'}
        </p>
      </header>

      {categories.data?.length > 0 && (
        // Rolagem horizontal no celular; centralizado no desktop
        <div className="-mx-4 mb-10 overflow-x-auto px-4">
          <div className="flex w-max gap-2 md:mx-auto">
            <CategoryChip active={!selectedId} onClick={() => selectCategory(null)}>
              Todos
            </CategoryChip>
            {categories.data.map((category) => (
              <CategoryChip
                key={category.id}
                active={category.id === selectedId}
                onClick={() => selectCategory(category.id)}
              >
                {category.nome}
              </CategoryChip>
            ))}
          </div>
        </div>
      )}

      {products.error ? (
        <div className="py-16 text-center">
          <p className="mb-6 text-muted-foreground">{products.error}</p>
          <Button variant="outline" onClick={products.reload}>
            <RotateCw className="h-4 w-4" aria-hidden="true" />
            Tentar novamente
          </Button>
        </div>
      ) : products.loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : visibleProducts.length === 0 ? (
        <div className="py-16 text-center">
          <p className="mb-6 text-muted-foreground">
            {selectedId ? 'Nenhum produto disponível nesta categoria no momento.' : 'Nenhum produto disponível no momento.'}
          </p>
          {selectedId && (
            <Button variant="outline" onClick={() => selectCategory(null)}>
              Ver todos os produtos
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 md:gap-8">
          {visibleProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}