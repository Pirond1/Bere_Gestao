import {
  MessageCircle,
  MessageSquareText,
  PhoneCall,
  RotateCw,
  SmilePlus,
  Tags,
  TrendingUp,
} from 'lucide-react'
import { useCallback, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { PeriodFilter } from '../../components/admin/PeriodFilter'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useAsync } from '../../hooks/useAsync'
import { getNpsReport } from '../../services/reportService'
import { cn } from '../../utils/cn'
import { capitalizeFirst, formatDateTime, parseDate } from '../../utils/date'
import { maskPhone } from '../../utils/format'
import { periodFromPreset } from '../../utils/period'
import { whatsappLink } from '../../utils/whatsapp'

// Faixas do NPS: promotores 9–10, neutros 7–8, detratores 0–6
const GROUPS = {
  promotores: { label: 'Promotores', range: '9 e 10', text: 'text-success', bar: 'bg-success' },
  neutros: { label: 'Neutros', range: '7 e 8', text: 'text-gold-dark', bar: 'bg-gold' },
  detratores: { label: 'Detratores', range: '0 a 6', text: 'text-destructive', bar: 'bg-destructive' },
}

const groupOf = (nota) => (nota >= 9 ? 'promotores' : nota >= 7 ? 'neutros' : 'detratores')

// Zonas de classificação usuais do NPS
function zoneOf(nps) {
  if (nps >= 75) return { label: 'Zona de excelência', className: 'bg-success/10 text-success border-success/30' }
  if (nps >= 50) return { label: 'Zona de qualidade', className: 'bg-gold/15 text-gold-dark border-gold/40' }
  if (nps >= 0) return { label: 'Zona de aperfeiçoamento', className: 'bg-terracotta/10 text-terracotta border-terracotta/30' }
  return { label: 'Zona crítica', className: 'bg-destructive/10 text-destructive border-destructive/30' }
}

const pct = (part, total) => (total ? Math.round((part / total) * 100) : 0)
const plural = (n, singular, pluralForm) => `${n} ${n === 1 ? singular : pluralForm}`

// SVG do gráfico não lê as variáveis do tema — mesmas cores de index.css
const CHART = { gold: '#c4aa41', grid: 'rgba(62, 39, 35, 0.12)', text: '#6d5f54' }

/** Meio círculo de -100 a 100. */
function NpsGauge({ nps }) {
  const filled = (nps + 100) / 2
  return (
    <div className="relative mx-auto w-56">
      <svg viewBox="0 0 200 110" className="w-full" aria-hidden="true">
        <path d="M 15 100 A 85 85 0 0 1 185 100" fill="none" stroke="#f5ead8" strokeWidth="18" strokeLinecap="round" />
        {filled > 0 && (
          <path
            d="M 15 100 A 85 85 0 0 1 185 100"
            fill="none"
            stroke="#c4aa41"
            strokeWidth="18"
            strokeLinecap="round"
            pathLength="100"
            strokeDasharray={`${filled} 100`}
          />
        )}
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <p className="font-serif text-5xl text-gold-dark lining-nums">{nps}</p>
      </div>
    </div>
  )
}

function Summary({ report }) {
  const zone = zoneOf(report.nps)
  return (
    <Card className="grid grid-cols-1 gap-8 p-5 md:grid-cols-2 md:p-6">
      <div className="flex flex-col items-center justify-center text-center">
        <p className="mb-3 text-sm text-muted-foreground">Net Promoter Score</p>
        <NpsGauge nps={report.nps} />
        <span className={cn('mt-4 rounded-full border px-3 py-1 text-sm font-medium', zone.className)}>
          {zone.label}
        </span>
        <p className="mt-3 text-sm text-muted-foreground">
          {report.total_avaliacoes} {report.total_avaliacoes === 1 ? 'avaliação' : 'avaliações'} no período
        </p>
      </div>

      <div className="flex flex-col justify-center gap-4">
        {Object.entries(GROUPS).map(([key, group]) => {
          const count = report[key]
          const share = pct(count, report.total_avaliacoes)
          return (
            <div key={key}>
              <div className="mb-1.5 flex items-baseline justify-between text-sm">
                <span>
                  <span className="font-medium">{group.label}</span>{' '}
                  <span className="text-muted-foreground">(notas {group.range})</span>
                </span>
                <span className="tabular-nums">
                  <span className={cn('font-serif text-lg', group.text)}>{share}%</span>{' '}
                  <span className="text-muted-foreground">· {count}</span>
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div className={cn('h-full rounded-full', group.bar)} style={{ width: `${share}%` }} />
              </div>
            </div>
          )
        })}
        <p className="text-xs text-muted-foreground">NPS = % de promotores − % de detratores (vai de −100 a 100).</p>
        <ResponseRate entregues={report.pedidos_entregues} avaliados={report.pedidos_avaliados} />
      </div>
    </Card>
  )
}

/** Quanto dá para confiar no índice: poucas respostas deixam o NPS instável. */
function ResponseRate({ entregues, avaliados }) {
  const rate = pct(avaliados, entregues)
  return (
    <div className="rounded-lg border border-gold/40 bg-gold/5 p-4">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">Taxa de resposta</span>
        <span className="font-serif text-2xl text-gold-dark lining-nums">{entregues ? `${rate}%` : '—'}</span>
      </div>
      <div className="mb-2 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-gold" style={{ width: `${rate}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">
        {entregues
          ? `${avaliados} de ${plural(entregues, 'pedido retirado', 'pedidos retirados')} no período foram avaliados.`
          : 'Nenhum pedido retirado no período.'}
      </p>
    </div>
  )
}

/** Clientes insatisfeitos recentes — um contato da loja pode reverter a experiência. */
function Detractors({ detratores, total }) {
  if (detratores.length === 0) {
    return (
      <Card className="flex items-center gap-3 p-4 text-sm">
        <SmilePlus className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
        Nenhum detrator no período — nenhum cliente deu nota de 0 a 6.
      </Card>
    )
  }

  return (
    <Card className="border-2 border-terracotta/40 p-5 md:p-6">
      <div className="mb-1 flex items-center gap-2">
        <PhoneCall className="h-5 w-5 text-terracotta" aria-hidden="true" />
        <h2 className="text-xl">Detratores para retornar</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        {total > detratores.length
          ? `Os ${detratores.length} mais recentes de ${total} no período.`
          : 'Clientes que deram nota de 0 a 6.'}{' '}
        Um contato da loja pode reverter a experiência.
      </p>

      <ul className="divide-y">
        {detratores.map((d) => (
          <li key={d.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 gap-4">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 font-serif text-lg text-destructive lining-nums"
                aria-label={`Nota ${d.nota}`}
              >
                {d.nota}
              </span>
              <div className="min-w-0">
                <p className="text-sm">
                  <span className="font-medium">{d.cliente_nome}</span>{' '}
                  <span className="text-muted-foreground">
                    · Pedido {d.pedido_id} · {formatDateTime(d.data_avaliacao)}
                  </span>
                </p>
                <p className={cn('text-sm', !d.comentario && 'text-muted-foreground italic')}>
                  {d.comentario || 'Sem comentário'}
                </p>
              </div>
            </div>
            {d.telefone ? (
              <Button
                as="a"
                href={whatsappLink(d.telefone)}
                target="_blank"
                rel="noreferrer"
                variant="outline"
                size="sm"
                className="shrink-0 self-start sm:self-center"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                {maskPhone(d.telefone)}
              </Button>
            ) : (
              <span className="shrink-0 text-xs text-muted-foreground">Sem telefone cadastrado</span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}

const monthLabel = (value) =>
  capitalizeFirst(parseDate(value).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''))

function EvolutionTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { label, nps, avaliacoes } = payload[0].payload
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      <p className="text-gold-dark">NPS {nps ?? '—'}</p>
      <p className="text-muted-foreground">{plural(avaliacoes, 'avaliação', 'avaliações')}</p>
    </div>
  )
}

/** NPS mês a mês — meses sem avaliação ficam como lacuna na linha. */
function Evolution({ evolucao }) {
  const data = evolucao.map((m) => ({ label: monthLabel(m.mes), nps: m.nps, avaliacoes: m.avaliacoes }))
  return (
    <Card className="p-5">
      <div className="mb-1 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-gold-dark" aria-hidden="true" />
        <h2 className="text-lg">Evolução do NPS</h2>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">Últimos {evolucao.length} meses</p>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke={CHART.grid} strokeDasharray="3 3" />
            <ReferenceLine y={0} stroke={CHART.text} strokeOpacity={0.4} />
            <XAxis dataKey="label" tick={{ fill: CHART.text, fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis
              domain={[-100, 100]}
              ticks={[-100, -50, 0, 50, 100]}
              tick={{ fill: CHART.text, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<EvolutionTooltip />} cursor={{ stroke: CHART.grid }} />
            <Line
              type="monotone"
              dataKey="nps"
              stroke={CHART.gold}
              strokeWidth={3}
              dot={{ fill: CHART.gold, r: 4 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

/** Categorias presentes nos pedidos avaliados — aponta onde estão as notas baixas. */
function CategoryNps({ categorias }) {
  return (
    <Card className="p-5">
      <div className="mb-1 flex items-center gap-2">
        <Tags className="h-5 w-5 text-gold-dark" aria-hidden="true" />
        <h2 className="text-lg">NPS por categoria</h2>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Pela categoria dos produtos do pedido avaliado — um pedido pode contar para mais de uma
      </p>
      <ul className="space-y-3 text-sm">
        {categorias.map((c) => {
          const zone = zoneOf(c.nps)
          return (
            <li key={c.categoria_id ?? 'sem-categoria'} className="flex items-center gap-3">
              <span className="min-w-0 flex-1 truncate">{c.nome}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{plural(c.avaliacoes, 'avaliação', 'avaliações')}</span>
              <span
                className={cn(
                  'w-14 shrink-0 rounded-full border py-0.5 text-center font-medium tabular-nums',
                  zone.className,
                )}
              >
                {c.nps}
              </span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function Distribution({ distribuicao }) {
  const max = Math.max(...distribuicao, 1)
  return (
    <Card className="p-5 md:p-6">
      <h2 className="mb-1 text-xl">Distribuição das notas</h2>
      <p className="mb-6 text-sm text-muted-foreground">Quantas avaliações receberam cada nota</p>
      <div className="flex h-40 items-end gap-1.5 sm:gap-2">
        {distribuicao.map((count, nota) => (
          <div key={nota} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-xs text-muted-foreground tabular-nums">{count || ''}</span>
            <div
              className={cn('w-full rounded-t', GROUPS[groupOf(nota)].bar, count === 0 && 'opacity-20')}
              style={{ height: count ? `${(count / max) * 100}%` : '2px' }}
              title={`Nota ${nota}: ${count}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5 border-t pt-2 sm:gap-2">
        {distribuicao.map((_, nota) => (
          <span key={nota} className="flex-1 text-center text-xs font-medium tabular-nums">
            {nota}
          </span>
        ))}
      </div>
    </Card>
  )
}

/** Clientes novos × recorrentes do período e a satisfação de cada grupo. */
function Loyalty({ novos, recorrentes }) {
  const totalClientes = novos.clientes + recorrentes.clientes
  const segments = [
    { key: 'novos', label: 'Novos', hint: '1ª compra no período', color: 'bg-gold', data: novos },
    { key: 'recorrentes', label: 'Recorrentes', hint: 'Já tinham comprado antes', color: 'bg-chocolate', data: recorrentes },
  ]
  const diff = novos.nps !== null && recorrentes.nps !== null ? recorrentes.nps - novos.nps : null

  return (
    <Card className="p-5 md:p-6">
      <h2 className="mb-1 text-xl">Clientes novos × recorrentes</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        {plural(totalClientes, 'cliente comprou', 'clientes compraram')} no período
      </p>

      <div className="mb-6 flex h-3 overflow-hidden rounded-full bg-muted">
        {segments.map((s) => (
          <div
            key={s.key}
            className={s.color}
            style={{ width: `${pct(s.data.clientes, totalClientes)}%` }}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {segments.map((s) => (
          <div key={s.key} className="rounded-lg bg-muted/50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className={cn('h-3 w-3 rounded-full', s.color)} />
              <span className="font-medium">{s.label}</span>
            </div>
            <p className="font-serif text-3xl lining-nums">{s.data.clientes}</p>
            <p className="mb-3 text-xs text-muted-foreground">{s.hint}</p>
            <p className="text-sm">
              NPS{' '}
              <span className="font-serif text-lg text-gold-dark lining-nums">{s.data.nps ?? '—'}</span>
            </p>
            <p className="text-xs text-muted-foreground">{plural(s.data.avaliacoes, 'avaliação', 'avaliações')}</p>
          </div>
        ))}
      </div>

      {diff !== null && diff !== 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          Quem volta a comprar avalia <span className="font-medium text-foreground">{Math.abs(diff)} pontos</span>{' '}
          {diff > 0 ? 'acima' : 'abaixo'} de quem compra pela primeira vez.
        </p>
      )}
    </Card>
  )
}

const FILTERS =[{ id: 'todas', label: 'Todas' }, ...Object.entries(GROUPS).map(([id, g]) => ({ id, label: g.label }))]

function Reviews({ avaliacoes }) {
  const [filter, setFilter] = useState('todas')
  const visible = filter === 'todas' ? avaliacoes : avaliacoes.filter((a) => groupOf(a.nota) === filter)

  return (
    <Card className="p-5 md:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl">Comentários dos clientes</h2>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar avaliações">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={cn(
                'cursor-pointer rounded-full border px-3 py-1 text-sm transition-colors',
                filter === f.id ? 'border-chocolate bg-chocolate text-vanilla' : 'hover:border-gold',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma avaliação neste filtro.</p>
      ) : (
        <ul className="divide-y">
          {visible.map((a) => {
            const group = GROUPS[groupOf(a.nota)]
            return (
              <li key={a.id} className="flex gap-4 py-4">
                <span
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 font-serif text-lg lining-nums',
                    group.text,
                  )}
                  aria-label={`Nota ${a.nota}`}
                >
                  {a.nota}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-baseline gap-x-2 text-sm">
                    <span className="font-medium">{a.cliente_nome}</span>
                    {a.primeira_compra && (
                      <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs text-gold-dark">1ª compra</span>
                    )}
                    <span className="text-muted-foreground">
                      · Pedido #{a.pedido_id} · {formatDateTime(a.data_avaliacao)}
                    </span>
                  </div>
                  {a.comentario ? (
                    <p className="whitespace-pre-line">{a.comentario}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Sem comentário</p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

export function RelatorioNPS() {
  // Avaliações chegam em menor volume que vendas — começa com uma janela maior
  const [period, setPeriod] = useState(() => periodFromPreset('90d'))
  const fetchReport = useCallback(() => getNpsReport(period.inicio, period.fim), [period.inicio, period.fim])
  const { data: report, loading, error, reload } = useAsync(fetchReport)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="mb-1 text-3xl">Avaliações (NPS)</h1>
          <p className="text-muted-foreground">Satisfação dos clientes após a entrega dos pedidos.</p>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </header>

      {loading && !report ? (
        <div className="space-y-6" aria-label="Carregando relatório">
          <div className="h-72 animate-pulse rounded-lg bg-muted" />
          <div className="h-56 animate-pulse rounded-lg bg-muted" />
        </div>
      ) : error ? (
        <Card className="py-16 text-center">
          <p className="mb-6 text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={reload}>
            <RotateCw className="h-4 w-4" aria-hidden="true" />
            Tentar novamente
          </Button>
        </Card>
      ) : report.total_avaliacoes === 0 ? (
        <Card className="flex flex-col items-center px-4 py-16 text-center">
          <MessageSquareText className="mb-6 h-14 w-14 text-muted-foreground/50" aria-hidden="true" />
          <p className="mb-2 text-xl">Nenhuma avaliação neste período</p>
          <p className="max-w-md text-muted-foreground">
            Os clientes avaliam o pedido depois que ele é marcado como entregue. Tente um período maior.
          </p>
          {report.pedidos_entregues > 0 && (
            <p className="mt-4 text-sm text-terracotta">
              {plural(report.pedidos_entregues, 'pedido foi retirado', 'pedidos foram retirados')} no período sem
              receber avaliação.
            </p>
          )}
        </Card>
      ) : (
        <>
          <Summary report={report} />
          <Detractors detratores={report.detratores_recentes} total={report.detratores} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Distribution distribuicao={report.distribuicao} />
            <Loyalty novos={report.novos} recorrentes={report.recorrentes} />
          </div>

          {/* Informações de apoio, em destaque menor */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Evolution evolucao={report.evolucao} />
            <CategoryNps categorias={report.por_categoria} />
          </div>
          <Reviews avaliacoes={report.avaliacoes} />
        </>
      )}
    </div>
  )
}
