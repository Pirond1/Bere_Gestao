import { CheckCheck, ChevronLeft, ChevronRight, ClipboardList, MessageSquareText, RotateCw, Search } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { OrderStatusBadge } from '../../components/OrderStatusBadge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useAsync } from '../../hooks/useAsync'
import {
  advanceOrder,
  listPanelOrders,
  markAllOrdersSeen,
  notifyOrdersChanged,
} from '../../services/adminOrderService'
import { cn } from '../../utils/cn'
import { formatDateLong, toDateKey } from '../../utils/date'
import { getErrorMessage } from '../../utils/errors'
import { formatCurrency } from '../../utils/format'
import { STATUS, STATUS_INFO, panelActions } from '../../utils/orderStatus'

const PAGE_SIZE = 20

// Cartões das etapas de produção — também funcionam como filtro (clicar de novo volta para "Em aberto")
const STAGES = [
  { id: 'confirmados', label: 'Confirmados', status: [STATUS.CONFIRMADO], accent: 'border-sky-300 bg-sky-50' },
  { id: 'producao', label: 'Em produção', status: [STATUS.EM_PRODUCAO], accent: 'border-orange-300 bg-orange-50' },
  { id: 'prontos', label: 'Aguardando retirada', status: [STATUS.PRONTO], accent: 'border-emerald-300 bg-emerald-50' },
  // Sem filtro de data, mostra só os de hoje — o total histórico só cresceria e não diz nada do dia
  {
    id: 'retirados',
    label: 'Retirados',
    status: [STATUS.ENTREGUE],
    accent: 'border-stone-300 bg-stone-100',
    recentFirst: true,
    todayWhenUnfiltered: true,
  },
]

// Abas para o que não é etapa de produção. O que está em andamento vem em ordem de retirada;
// histórico (cancelados, todos) mostra os mais recentes primeiro
const TABS = [
  { id: 'abertos', label: 'Em aberto', status: [STATUS.CONFIRMADO, STATUS.EM_PRODUCAO, STATUS.PRONTO] },
  { id: 'aguardando', label: 'Aguardando pagamento', status: [STATUS.AGUARDANDO_PAGAMENTO] },
  { id: 'cancelados', label: 'Cancelados', status: [STATUS.CANCELADO], recentFirst: true },
  { id: 'todos', label: 'Todos', status: [], recentFirst: true },
]

const addDays = (days) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return toDateKey(d)
}

// Filtro pela data de retirada — calculado na hora para "hoje" nunca ficar desatualizado
const DATE_FILTERS = [
  { id: 'qualquer', label: 'Qualquer data', range: () => [null, null] },
  { id: 'hoje', label: 'Hoje', range: () => [addDays(0), addDays(0)] },
  { id: 'amanha', label: 'Amanhã', range: () => [addDays(1), addDays(1)] },
  { id: '7dias', label: 'Próximos 7 dias', range: () => [addDays(0), addDays(6)] },
]

const itemsSummary = (itens) => itens.map((i) => `${i.quantidade}× ${i.produto_nome}`).join(', ')

function relativeDayLabel(dateKey) {
  if (dateKey === addDays(0)) return 'Hoje'
  if (dateKey === addDays(1)) return 'Amanhã'
  return null
}

/** Agrupa pedidos consecutivos com a mesma data de retirada (a lista já vem ordenada por ela). */
function groupByPickup(pedidos) {
  const groups = []
  for (const pedido of pedidos) {
    const last = groups.at(-1)
    if (last?.date === pedido.data_retirada) last.pedidos.push(pedido)
    else groups.push({ date: pedido.data_retirada, pedidos: [pedido] })
  }
  return groups
}

function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function OrderRow({ pedido, onChanged }) {
  const [loading, setLoading] = useState(false)
  const { next } = panelActions(pedido.status.descricao)

  const handleAdvance = async () => {
    setLoading(true)
    try {
      const atualizado = await advanceOrder(pedido.id)
      toast.success(`Pedido ${pedido.id} atualizado`, {
        description: `Agora está como "${STATUS_INFO[atualizado.status.descricao].label}".`,
      })
      onChanged()
      // Avançar também marca o pedido como visto
      notifyOrdersChanged()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card
      className={cn(
        'flex flex-col gap-3 p-4 transition-colors hover:border-gold sm:flex-row sm:items-center',
        pedido.novo && 'border-l-4 border-l-terracotta',
      )}
    >
      <Link to={`/admin/pedidos/${pedido.id}`} className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          {pedido.novo && (
            <span className="rounded-full bg-terracotta px-2 py-0.5 text-xs font-semibold text-white">Novo</span>
          )}
          <span className="font-medium">{pedido.cliente.nome}</span>
          <OrderStatusBadge descricao={pedido.status.descricao} />
          <span className="text-xs text-muted-foreground">Código #{pedido.id}</span>
        </div>
        <p className="truncate text-sm text-muted-foreground">{itemsSummary(pedido.itens)}</p>
        {pedido.observacoes && (
          <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-terracotta">
            <MessageSquareText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {pedido.observacoes}
          </p>
        )}
      </Link>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <span className="font-serif text-lg text-gold-dark lining-nums">{formatCurrency(pedido.valor_total)}</span>
        {next && (
          <Button size="sm" onClick={handleAdvance} loading={loading} className="shrink-0">
            {next}
          </Button>
        )}
      </div>
    </Card>
  )
}

function MarkAllSeen({ onDone }) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      const quantidade = await markAllOrdersSeen()
      toast.success(`${quantidade} ${quantidade === 1 ? 'pedido marcado' : 'pedidos marcados'} como visto`)
      notifyOrdersChanged()
      onDone()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} loading={loading} className="self-start sm:self-auto">
      <CheckCheck className="h-4 w-4" aria-hidden="true" />
      Marcar todos como vistos
    </Button>
  )
}

export function Pedidos() {
  const [tab, setTab] = useState(TABS[0])
  const [dateFilter, setDateFilter] = useState(DATE_FILTERS[0].id)
  const [searchInput, setSearchInput] = useState('')
  const busca = useDebounced(searchInput.trim())
  const [pagina, setPagina] = useState(1)

  const unfiltered = dateFilter === 'qualquer'

  const fetchOrders = useCallback(async () => {
    const range = (id) => DATE_FILTERS.find((f) => f.id === id).range()
    const [data_inicio, data_fim] = range(tab.todayWhenUnfiltered && unfiltered ? 'hoje' : dateFilter)
    const [hoje] = range('hoje')

    const [lista, retiradosHoje] = await Promise.all([
      listPanelOrders({
        status: tab.status,
        data_inicio,
        data_fim,
        busca: busca || undefined,
        mais_recentes_primeiro: Boolean(tab.recentFirst),
        pagina,
        limite: PAGE_SIZE,
      }),
      // Sem filtro de data, o cartão "Retirados" conta só os de hoje
      unfiltered
        ? listPanelOrders({
            status: [STATUS.ENTREGUE],
            data_inicio: hoje,
            data_fim: hoje,
            busca: busca || undefined,
            limite: 1,
          })
        : null,
    ])
    return { ...lista, retirados_hoje: retiradosHoje?.total ?? null }
  }, [tab, dateFilter, unfiltered, busca, pagina])
  const { data, loading, error, reload } = useAsync(fetchOrders)

  // Qualquer mudança de filtro volta para a primeira página
  const changeFilter = (setter) => (value) => {
    setter(value)
    setPagina(1)
  }

  const countFor = (t) => {
    if (!data) return null
    const counts = data.contagem_por_status
    const statuses = t.status.length ? t.status : Object.keys(counts)
    return statuses.reduce((sum, s) => sum + (counts[s] ?? 0), 0)
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="mb-1 text-3xl">Pedidos</h1>
          <p className="text-muted-foreground">Acompanhe as encomendas pela data de retirada.</p>
        </div>
        {data?.itens.some((p) => p.novo) && <MarkAllSeen onDone={reload} />}
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" role="group" aria-label="Pedidos por etapa">
        {STAGES.map((stage) => {
          const active = tab.id === stage.id
          return (
            <button
              key={stage.id}
              type="button"
              aria-pressed={active}
              onClick={() => changeFilter(setTab)(active ? TABS[0] : stage)}
              className={cn(
                'cursor-pointer rounded-lg border-2 p-4 text-left transition-shadow hover:shadow-md',
                stage.accent,
                active && 'ring-2 ring-chocolate ring-offset-2 ring-offset-background',
              )}
            >
              <span className="block font-serif text-3xl lining-nums">
                {(stage.todayWhenUnfiltered && unfiltered ? data?.retirados_hoje : countFor(stage)) ?? '–'}
              </span>
              <span className="text-sm">
                {stage.label}
                {stage.todayWhenUnfiltered && unfiltered && ' hoje'}
              </span>
            </button>
          )
        })}
      </div>

      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div className="flex gap-2" role="tablist" aria-label="Situação dos pedidos">
          {TABS.map((t) => {
            const count = countFor(t)
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab.id === t.id}
                onClick={() => changeFilter(setTab)(t)}
                className={cn(
                  'flex shrink-0 cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm whitespace-nowrap transition-colors',
                  tab.id === t.id ? 'border-chocolate bg-chocolate text-vanilla' : 'bg-card hover:border-gold',
                )}
              >
                {t.label}
                {count !== null && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 text-xs tabular-nums',
                      tab.id === t.id ? 'bg-vanilla/20' : 'bg-muted',
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Buscar pedido</span>
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
            placeholder="Buscar por nome do cliente ou código"
            className="h-10 w-full rounded-lg border-2 bg-white pr-3 pl-9 text-sm focus:border-gold focus:outline-none"
          />
        </label>
        <label>
          <span className="sr-only">Data de retirada</span>
          <select
            value={dateFilter}
            onChange={(e) => changeFilter(setDateFilter)(e.target.value)}
            className="h-10 w-full cursor-pointer rounded-lg border-2 bg-white px-3 text-sm focus:border-gold focus:outline-none sm:w-auto"
          >
            {DATE_FILTERS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.id === 'qualquer' ? 'Retirada: qualquer data' : `Retirada: ${f.label.toLowerCase()}`}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading && !data ? (
        <div className="space-y-3" aria-label="Carregando pedidos">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
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
          <ClipboardList className="mb-4 h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
          <p className="text-lg">Nenhum pedido encontrado</p>
          <p className="text-sm text-muted-foreground">Tente outra aba ou ajuste os filtros.</p>
        </Card>
      ) : (
        <>
          <div className="space-y-6">
            {groupByPickup(data.itens).map((group) => {
              const relative = relativeDayLabel(group.date)
              return (
                <section key={group.date}>
                  <h2 className="mb-3 flex items-baseline gap-2 text-lg">
                    {relative && <span className="text-gold-dark">{relative} ·</span>}
                    {formatDateLong(group.date)}
                    <span className="font-sans text-sm text-muted-foreground">
                      ({group.pedidos.length} {group.pedidos.length === 1 ? 'pedido' : 'pedidos'})
                    </span>
                  </h2>
                  <ul className="space-y-3">
                    {group.pedidos.map((pedido) => (
                      <li key={pedido.id}>
                        <OrderRow pedido={pedido} onChanged={reload} />
                      </li>
                    ))}
                  </ul>
                </section>
              )
            })}
          </div>

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
