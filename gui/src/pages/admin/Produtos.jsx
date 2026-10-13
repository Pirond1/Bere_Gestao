import { CakeSlice, Check, Pencil, Plus, RotateCw, Search, Tags, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { ProductImage } from '../../components/ProductImage'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useAsync } from '../../hooks/useAsync'
import {
  createCategory,
  deleteCategory,
  listAllProducts,
  updateCategory,
} from '../../services/adminProductService'
import { listCategories } from '../../services/productService'
import { cn } from '../../utils/cn'
import { getErrorMessage } from '../../utils/errors'
import { formatCurrency } from '../../utils/format'

const STATUS_FILTERS = [
  { id: 'todos', label: 'Todos', match: () => true },
  { id: 'vitrine', label: 'Na vitrine', match: (p) => p.disponivel },
  { id: 'desativados', label: 'Desativados', match: (p) => !p.disponivel },
]

// Busca sem acento e sem diferenciar maiúsculas: "pao" encontra "Pão de mel"
const normalize = (text) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

const inputClass =
  'h-10 w-full rounded-lg border-2 bg-white px-3 text-sm placeholder:text-muted-foreground/60 focus:border-gold focus:outline-none'

function ListSkeleton() {
  return (
    <div className="space-y-3" aria-label="Carregando">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  )
}

function LoadError({ message, onRetry }) {
  return (
    <Card className="py-16 text-center">
      <p className="mb-6 text-muted-foreground">{message}</p>
      <Button variant="outline" onClick={onRetry}>
        <RotateCw className="h-4 w-4" aria-hidden="true" />
        Tentar novamente
      </Button>
    </Card>
  )
}

function ProductsTab({ products, categories }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(STATUS_FILTERS[0])
  const [categoryId, setCategoryId] = useState('')

  const term = normalize(search.trim())
  const visible = products.filter(
    (p) =>
      status.match(p) &&
      (!categoryId || p.categoria_id === Number(categoryId)) &&
      (!term || normalize(p.nome).includes(term)),
  )

  if (products.length === 0) {
    return (
      <Card className="flex flex-col items-center px-4 py-16 text-center">
        <CakeSlice className="mb-4 h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
        <p className="mb-1 text-lg">Nenhum produto cadastrado</p>
        <p className="mb-6 text-sm text-muted-foreground">Cadastre o primeiro doce para ele aparecer na vitrine.</p>
        <Button as={Link} to="/admin/produtos/novo">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Novo produto
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Buscar produto</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar pelo nome"
            className={cn(inputClass, 'pl-9')}
          />
        </label>
        <label>
          <span className="sr-only">Categoria</span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={cn(inputClass, 'cursor-pointer sm:w-auto')}
          >
            <option value="">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex gap-2" role="group" aria-label="Situação">
        {STATUS_FILTERS.map((f) => {
          const count = products.filter(f.match).length
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={status.id === f.id}
              onClick={() => setStatus(f)}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors',
                status.id === f.id ? 'border-chocolate bg-chocolate text-vanilla' : 'bg-card hover:border-gold',
              )}
            >
              {f.label}
              <span className="text-xs tabular-nums opacity-70">{count}</span>
            </button>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <Card className="py-12 text-center text-sm text-muted-foreground">
          Nenhum produto encontrado com esses filtros.
        </Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {visible.map((p) => (
            <li key={p.id}>
              <Link
                to={`/admin/produtos/${p.id}`}
                className="flex items-center gap-4 rounded-lg border bg-card p-3 shadow-sm transition-colors hover:border-gold"
              >
                <div className={cn('h-16 w-16 shrink-0 overflow-hidden rounded-lg', !p.disponivel && 'opacity-50')}>
                  <ProductImage src={p.foto} alt="" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.nome}</p>
                  <p className="truncate text-sm text-muted-foreground">{p.categoria.nome}</p>
                  {!p.disponivel && (
                    <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      Desativado
                    </span>
                  )}
                </div>
                <span className="shrink-0 font-serif text-lg text-gold-dark lining-nums">
                  {formatCurrency(p.preco)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function CategoryForm({ initial = { nome: '', descricao: '' }, submitLabel, onSubmit, onCancel }) {
  const [nome, setNome] = useState(initial.nome)
  const [descricao, setDescricao] = useState(initial.descricao ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!nome.trim()) {
      setError('Informe o nome da categoria')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSubmit({ nome: nome.trim(), descricao: descricao.trim() || null })
      if (!onCancel) {
        setNome('')
        setDescricao('')
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          aria-label="Nome da categoria"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={100}
          placeholder="Nome (ex.: Bolos)"
          className={cn(inputClass, 'sm:w-48')}
        />
        <input
          aria-label="Descrição da categoria (opcional)"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          maxLength={255}
          placeholder="Descrição (opcional)"
          className={cn(inputClass, 'flex-1')}
        />
        <div className="flex gap-2">
          <Button type="submit" size="sm" loading={saving} className="h-10 flex-1 sm:flex-none">
            {onCancel ? <Check className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
            {submitLabel}
          </Button>
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving} className="h-10" aria-label="Cancelar">
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
      {error && <Alert>{error}</Alert>}
    </form>
  )
}

function CategoryRow({ categoria, count, onChanged }) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (editing) {
    return (
      <li className="py-3">
        <CategoryForm
          initial={categoria}
          submitLabel="Salvar"
          onCancel={() => setEditing(false)}
          onSubmit={async (dados) => {
            await updateCategory(categoria.id, dados)
            toast.success('Categoria atualizada')
            setEditing(false)
            onChanged()
          }}
        />
      </li>
    )
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteCategory(categoria.id)
      toast.success(`Categoria "${categoria.nome}" excluída`)
      onChanged()
    } catch (err) {
      toast.error(getErrorMessage(err))
      setDeleting(false)
    }
  }

  return (
    <li className="flex items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-medium">{categoria.nome}</p>
        <p className="truncate text-sm text-muted-foreground">
          {count} {count === 1 ? 'produto' : 'produtos'}
          {categoria.descricao && ` · ${categoria.descricao}`}
        </p>
      </div>
      <Button variant="ghost" size="icon" onClick={() => setEditing(true)} aria-label={`Editar ${categoria.nome}`}>
        <Pencil className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDelete}
        loading={deleting}
        // Categoria com produtos não pode ser excluída — mova os produtos antes
        disabled={count > 0}
        title={count > 0 ? 'Mova ou exclua os produtos desta categoria antes' : undefined}
        aria-label={`Excluir ${categoria.nome}`}
        className="text-destructive"
      >
        {!deleting && <Trash2 className="h-4 w-4" aria-hidden="true" />}
      </Button>
    </li>
  )
}

function CategoriesTab({ categories, products, onChanged }) {
  const countFor = (id) => products.filter((p) => p.categoria_id === id).length

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h2 className="mb-3 text-lg">Nova categoria</h2>
        <CategoryForm
          submitLabel="Adicionar"
          onSubmit={async (dados) => {
            await createCategory(dados)
            toast.success(`Categoria "${dados.nome}" criada`)
            onChanged()
          }}
        />
      </Card>

      <Card className="px-5 py-2">
        {categories.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma categoria ainda. Crie uma para poder cadastrar produtos.
          </p>
        ) : (
          <ul className="divide-y">
            {categories.map((c) => (
              <CategoryRow key={c.id} categoria={c} count={countFor(c.id)} onChanged={onChanged} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

const TABS = [
  { id: 'produtos', label: 'Produtos', icon: CakeSlice },
  { id: 'categorias', label: 'Categorias', icon: Tags },
]

export function Produtos() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('aba') === 'categorias' ? 'categorias' : 'produtos'

  const products = useAsync(listAllProducts)
  const categories = useAsync(listCategories)

  const loading = (products.loading && !products.data) || (categories.loading && !categories.data)
  const error = products.error || categories.error
  const retry = () => {
    products.reload()
    categories.reload()
  }
  // Os produtos trazem o nome da categoria — renomear também precisa atualizá-los
  const refreshAll = () => {
    categories.refresh()
    products.refresh()
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="mb-1 text-3xl">Produtos</h1>
          <p className="text-muted-foreground">O que aparece na vitrine e como está organizado.</p>
        </div>
        <Button as={Link} to="/admin/produtos/novo" className="self-start sm:self-auto">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Novo produto
        </Button>
      </header>

      <div className="flex gap-2 border-b" role="tablist" aria-label="Seções">
        {TABS.map(({ id, label, icon: Icon }) => {
          const count = id === 'produtos' ? products.data?.length : categories.data?.length
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setSearchParams(id === 'produtos' ? {} : { aba: id }, { replace: true })}
              className={cn(
                '-mb-px flex cursor-pointer items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                tab === id ? 'border-gold text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
              {count !== undefined && <span className="text-xs tabular-nums opacity-70">{count}</span>}
            </button>
          )
        })}
      </div>

      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <LoadError message={error} onRetry={retry} />
      ) : tab === 'produtos' ? (
        <ProductsTab products={products.data} categories={categories.data} />
      ) : (
        <CategoriesTab categories={categories.data} products={products.data} onChanged={refreshAll} />
      )}
    </div>
  )
}
