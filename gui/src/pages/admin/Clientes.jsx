import { ChevronLeft, ChevronRight, RotateCw, Search, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useAsync } from '../../hooks/useAsync'
import { listPanelClients } from '../../services/adminClientService'
import { formatDateTime } from '../../utils/date'
import { formatCurrency, maskPhone } from '../../utils/format'

const PAGE_SIZE = 20

function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

const pedidosLabel = (n) => `${n} ${n === 1 ? 'pedido pago' : 'pedidos pagos'}`

export function Clientes() {
  const [searchInput, setSearchInput] = useState('')
  const busca = useDebounced(searchInput.trim())
  const [pagina, setPagina] = useState(1)

  const fetchClients = useCallback(() => listPanelClients({ busca, pagina, limite: PAGE_SIZE }), [busca, pagina])
  const { data, loading, error, reload } = useAsync(fetchClients)
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="mb-1 text-3xl">Clientes</h1>
        <p className="text-muted-foreground">Cadastro, contato e histórico de compras de quem pede na loja.</p>
      </header>

      <label className="relative block">
        <span className="sr-only">Buscar cliente</span>
        <Search
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value)
            setPagina(1)
          }}
          placeholder="Buscar por nome, e-mail, CPF ou telefone"
          className="h-10 w-full rounded-lg border-2 bg-white pr-3 pl-9 text-sm focus:border-gold focus:outline-none"
        />
      </label>

      {loading && !data ? (
        <div className="space-y-3" aria-label="Carregando clientes">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : error ? (
        <Card className="py-16 text-center">
          <p className="mb-6 text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={reload}>
            <RotateCw className="h-4 w-4" aria-hidden="true" />
            Tentar novamente
          </Button>
        </Card>
      ) : data.itens.length === 0 ? (
        <Card className="flex flex-col items-center px-4 py-16 text-center">
          <Users className="mb-4 h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
          <p className="text-lg">{busca ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado ainda'}</p>
          {busca && <p className="text-sm text-muted-foreground">Confira a grafia ou busque pelo telefone.</p>}
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground tabular-nums">
            {data.total} {data.total === 1 ? 'cliente' : 'clientes'}
          </p>
          <ul className="space-y-3">
            {data.itens.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/admin/clientes/${c.id}`}
                  className="flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-sm transition-colors hover:border-gold sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.nome}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {c.email}
                      {c.telefone && ` · ${maskPhone(c.telefone)}`}
                    </p>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 sm:block sm:text-right">
                    <p className="font-serif text-lg text-gold-dark lining-nums">{formatCurrency(c.total_gasto)}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.pedidos_pagos
                        ? `${pedidosLabel(c.pedidos_pagos)} · último em ${formatDateTime(c.ultimo_pedido).split(' às')[0]}`
                        : 'Nenhum pedido pago'}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <nav className="flex items-center justify-center gap-4" aria-label="Paginação">
              <Button variant="outline" size="sm" onClick={() => setPagina((p) => p - 1)} disabled={pagina === 1}>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground tabular-nums">
                Página {pagina} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagina((p) => p + 1)}
                disabled={pagina >= totalPages}
              >
                Próxima
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  )
}
