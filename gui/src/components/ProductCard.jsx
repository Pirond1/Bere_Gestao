import { Link } from 'react-router'

import { formatCurrency } from '../utils/format'
import { ProductImage } from './ProductImage'
import { Card } from './ui/Card'

export function ProductCard({ product }) {
  return (
    <Card
      as={Link}
      to={`/produto/${product.id}`}
      className="group flex h-full flex-col overflow-hidden border-2 transition-all hover:border-gold hover:shadow-xl"
    >
      <div className="aspect-[4/3] overflow-hidden">
        <ProductImage
          src={product.foto}
          alt={product.nome}
          className="transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        {product.categoria && (
          <span className="mb-1 text-xs font-medium uppercase tracking-wider text-terracotta">
            {product.categoria.nome}
          </span>
        )}
        <h3 className="mb-2 text-lg leading-snug">{product.nome}</h3>
        {product.descricao && (
          <p className="mb-4 line-clamp-3 flex-1 text-sm text-muted-foreground">{product.descricao}</p>
        )}
        <div className="mt-auto flex items-center justify-between gap-3">
          <span className="font-serif text-xl text-gold-dark lining-nums">{formatCurrency(product.preco)}</span>
          <span className="text-sm font-medium text-chocolate underline-offset-4 group-hover:underline">
            Ver detalhes
          </span>
        </div>
      </div>
    </Card>
  )
}

export function ProductCardSkeleton() {
  return (
    <Card className="overflow-hidden border-2" aria-hidden="true">
      <div className="aspect-[4/3] animate-pulse bg-muted" />
      <div className="space-y-3 p-5">
        <div className="h-3 w-16 animate-pulse rounded bg-muted" />
        <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-6 w-24 animate-pulse rounded bg-muted" />
      </div>
    </Card>
  )
}