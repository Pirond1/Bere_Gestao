import { Package, Receipt, RotateCw, TrendingDown, TrendingUp, Undo2, Wallet } from 'lucide-react'
import { useCallback, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { PaymentMethodSplit } from '../../components/admin/PaymentMethodSplit'
import { PeriodFilter } from '../../components/admin/PeriodFilter'
import { StatCard } from '../../components/admin/StatCard'
import { UpcomingPickups } from '../../components/admin/UpcomingPickups'
import { WeekdaySales } from '../../components/admin/WeekdaySales'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useAsync } from '../../hooks/useAsync'
import { getSalesReport } from '../../services/reportService'
import { capitalizeFirst, parseDate } from '../../utils/date'
import { formatCurrency } from '../../utils/format'
import { periodFromPreset } from '../../utils/period'

// SVG do gráfico não lê as variáveis do tema — mesmas cores de index.css
const CHART = { gold: '#c4aa41', grid: 'rgba(62, 39, 35, 0.12)', text: '#6d5f54' }
// Paleta da marca para as fatias de categoria: dourado, chocolate, terracota e variações
const CATEGORY_COLORS = ['#c4aa41', '#3e2723', '#e07856', '#8c7a26', '#a1887f', '#e6d48f']

const compactCurrency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
})

const pedidosLabel = (n) => `${n} ${n === 1 ? 'pedido' : 'pedidos'}`

function chartLabel(data, agrupamento) {
  const date = parseDate(data)
  return agrupamento === 'mes'
    ? capitalizeFirst(date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', ''))
    : date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { label, total, pedidos } = payload[0].payload
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      <p className="text-gold-dark lining-nums">{formatCurrency(total)}</p>
      <p className="text-muted-foreground">{pedidosLabel(pedidos)}</p>
    </div>
  )
}

/** Comparação do total pago com o período imediatamente anterior, de mesmo tamanho. */
function Variation({ atual, anterior }) {
  if (anterior === 0) {
    return atual > 0 ? 'Sem vendas no período anterior' : 'Igual ao período anterior'
  }
  const pct = Math.round(((atual - anterior) / anterior) * 100)
  const up = pct >= 0
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <span className={`flex items-center gap-1 ${up ? 'text-success' : 'text-destructive'}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {up ? '+' : ''}
      {pct}% vs período anterior
    </span>
  )
}

// Grade, eixos e tooltip iguais nos dois formatos do gráfico de faturamento
const chartAxes = (cursor) => [
  <CartesianGrid key="grid" vertical={false} stroke={CHART.grid} strokeDasharray="3 3" />,
  <XAxis
    key="x"
    dataKey="label"
    tick={{ fill: CHART.text, fontSize: 12 }}
    tickLine={false}
    axisLine={{ stroke: CHART.grid }}
    minTickGap={12}
  />,
  <YAxis
    key="y"
    tick={{ fill: CHART.text, fontSize: 12 }}
    tickLine={false}
    axisLine={false}
    tickFormatter={(v) => compactCurrency.format(v)}
    width={64}
    allowDecimals={false}
  />,
  <Tooltip key="tooltip" content={<ChartTooltip />} cursor={cursor} />,
]

function SalesChart({ report }) {
  const monthly = report.agrupamento === 'mes'
  const data = report.serie.map((s) => ({
    label: chartLabel(s.data, report.agrupamento),
    total: Number(s.total),
    pedidos: s.pedidos,
  }))
  const margin = { top: 8, right: 8, bottom: 0, left: 0 }

  return (
    <Card className="p-5 md:p-6">
      <h2 className="mb-1 text-xl">Faturamento</h2>
      <p className="mb-6 text-sm text-muted-foreground">Total pago por {monthly ? 'mês' : 'dia'}</p>
      <div className="h-64 md:h-72">
        <ResponsiveContainer width="100%" height="100%">
          {/* Por mês, a linha mostra melhor a tendência; por dia, as barras destacam cada data */}
          {monthly ? (
            <LineChart data={data} margin={margin}>
              {chartAxes({ stroke: CHART.grid })}
              <Line
                type="monotone"
                dataKey="total"
                stroke={CHART.gold}
                strokeWidth={3}
                dot={{ fill: CHART.gold, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          ) : (
            <BarChart data={data} margin={margin}>
              {chartAxes({ fill: 'rgba(196, 170, 65, 0.12)' })}
              <Bar dataKey="total" fill={CHART.gold} radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

function CategoryChart({ categorias }) {
  const total = categorias.reduce((sum, c) => sum + Number(c.total), 0)
  const data = categorias.map((c, i) => ({
    ...c,
    total: Number(c.total),
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }))

  return (
    <Card className="p-5 md:p-6">
      <h2 className="mb-1 text-xl">Vendas por categoria</h2>
      <p className="mb-6 text-sm text-muted-foreground">Participação no total pago</p>

      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma venda no período.</p>
      ) : (
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <div className="h-44 w-44 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="total"
                  nameKey="nome"
                  innerRadius="58%"
                  outerRadius="100%"
                  paddingAngle={data.length > 1 ? 2 : 0}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {data.map((c) => (
                    <Cell key={c.categoria_id ?? 'sem-categoria'} fill={c.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="w-full min-w-0 flex-1 space-y-3 text-sm">
            {data.map((c) => (
              <li key={c.categoria_id ?? 'sem-categoria'} className="flex items-center gap-3">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="min-w-0 flex-1 truncate">{c.nome}</span>
                <span className="shrink-0 text-muted-foreground lining-nums">{formatCurrency(c.total)}</span>
                <span className="w-10 shrink-0 text-right font-medium tabular-nums">
                  {Math.round((c.total / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

function TopProducts({ produtos }) {
  const max = produtos[0]?.quantidade ?? 0

  return (
    <Card className="p-5 md:p-6">
      <h2 className="mb-1 text-xl">Produtos mais vendidos</h2>
      <p className="mb-6 text-sm text-muted-foreground">Por quantidade vendida</p>

      {produtos.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma venda no período.</p>
      ) : (
        <ol className="space-y-4">
          {produtos.map((produto, index) => (
            <li key={produto.produto_id}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">
                  <span className="mr-2 font-serif text-gold-dark">{index + 1}º</span>
                  {produto.nome}
                </span>
                <span className="shrink-0 text-muted-foreground lining-nums">{formatCurrency(produto.total)}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gold"
                    style={{ width: `${(produto.quantidade / max) * 100}%` }}
                  />
                </div>
                <span className="w-14 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                  {produto.quantidade} un.
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}

export function Dashboard() {
  const [period, setPeriod] = useState(() => periodFromPreset('month'))
  const fetchReport = useCallback(() => getSalesReport(period.inicio, period.fim), [period.inicio, period.fim])
  const { data: report, loading, error, reload } = useAsync(fetchReport)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="mb-1 text-3xl">Visão geral</h1>
          <p className="text-muted-foreground">Vendas pagas no período, pela data do pedido.</p>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </header>

      {loading && !report ? (
        <div className="space-y-6" aria-label="Carregando relatório">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
          <div className="h-80 animate-pulse rounded-lg bg-muted" />
        </div>
      ) : error ? (
        <Card className="py-16 text-center">
          <p className="mb-6 text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={reload}>
            <RotateCw className="h-4 w-4" aria-hidden="true" />
            Tentar novamente
          </Button>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              highlight
              label="Total pago"
              icon={Wallet}
              value={formatCurrency(report.total_pago)}
              footer={
                <Variation
                  atual={Number(report.total_pago)}
                  anterior={Number(report.total_pago_periodo_anterior)}
                />
              }
            />
            <StatCard
              label="Pedidos pagos"
              icon={Package}
              value={report.quantidade_pedidos}
              footer="No período"
            />
            <StatCard
              label="Ticket médio"
              icon={Receipt}
              value={formatCurrency(report.ticket_medio)}
              footer="Por pedido"
            />
            <StatCard
              label="Estornado"
              icon={Undo2}
              value={formatCurrency(report.total_estornado)}
              footer="Devolvido em cancelamentos"
            />
          </div>

          <SalesChart report={report} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <CategoryChart categorias={report.vendas_por_categoria} />
            <TopProducts produtos={report.produtos_mais_vendidos} />
          </div>

          {/* Informações de apoio, em destaque menor */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            <UpcomingPickups />
            <WeekdaySales dias={report.vendas_por_dia_semana} />
            <PaymentMethodSplit metodos={report.vendas_por_metodo} />
          </div>
        </>
      )}
    </div>
  )
}
