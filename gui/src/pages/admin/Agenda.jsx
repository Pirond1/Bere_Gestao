import { ChevronLeft, ChevronRight, RotateCw, Settings, TriangleAlert } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useAsync } from '../../hooks/useAsync'
import { getCalendar, updateDay } from '../../services/agendaService'
import { getSettings } from '../../services/settingsService'
import { cn } from '../../utils/cn'
import { capitalizeFirst, formatDateLong, parseDate, toDateKey } from '../../utils/date'
import { getErrorMessage } from '../../utils/errors'

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const WEEKDAY_NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

// "toda segunda", mas "todo sábado" / "todo domingo"
const everyWeekday = (index) => `${index === 0 || index === 6 ? 'todo' : 'toda'} ${WEEKDAY_NAMES[index]}`

const monthLabel = ({ year, month }) =>
  capitalizeFirst(new Date(year, month, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }))

const shiftMonth = ({ year, month }, delta) => {
  const d = new Date(year, month + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

const pedidosLabel = (n) => `${n} ${n === 1 ? 'pedido' : 'pedidos'}`

/** Situação do dia para cor e legenda. */
function dayState(dia) {
  if (dia.fechado) return 'fechado'
  if (dia.vagas_disponiveis === 0) return 'lotado'
  if (dia.pedidos_registrados > 0) return 'com-pedidos'
  return 'livre'
}

const STATE_CLASS = {
  fechado: 'border-transparent bg-muted text-muted-foreground',
  lotado: 'border-terracotta/50 bg-terracotta/10',
  'com-pedidos': 'border-gold/50 bg-gold/10',
  livre: 'border-chocolate/10 bg-white',
}

// Ajustado no próprio dia (não segue só a configuração)
const isCustom = (dia) => dia.capacidade_personalizada !== null || dia.bloqueio_dia !== null

function MonthGrid({ month, days, selected, onSelect }) {
  const byKey = Object.fromEntries((days ?? []).map((d) => [d.data, d]))
  const firstWeekday = new Date(month.year, month.month, 1).getDay()
  const daysInMonth = new Date(month.year, month.month + 1, 0).getDate()
  const today = toDateKey(new Date())

  return (
    <div className="grid grid-cols-7 gap-1 md:gap-1.5">
      {WEEKDAYS.map((w, i) => (
        <abbr key={i} title={WEEKDAY_NAMES[i]} className="pb-1 text-center text-xs font-medium text-muted-foreground no-underline">
          {w}
        </abbr>
      ))}
      {Array.from({ length: firstWeekday }, (_, i) => (
        <span key={`blank-${i}`} />
      ))}
      {Array.from({ length: daysInMonth }, (_, i) => {
        const key = toDateKey(new Date(month.year, month.month, i + 1))
        const dia = byKey[key]
        if (!dia) {
          return <span key={key} className="aspect-square animate-pulse rounded-lg bg-muted/60 md:aspect-[4/3]" />
        }
        const state = dayState(dia)
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            aria-pressed={selected === key}
            aria-label={`${formatDateLong(key)}: ${
              dia.fechado ? 'fechado' : `${dia.pedidos_registrados} de ${dia.capacidade} pedidos`
            }${isCustom(dia) ? ', ajustado' : ''}`}
            className={cn(
              'relative flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 p-0.5 text-sm transition-colors hover:border-gold md:aspect-[4/3]',
              STATE_CLASS[state],
              dia.passado && 'opacity-50',
              key === today && 'font-bold',
              selected === key && 'border-chocolate ring-2 ring-chocolate ring-offset-1 ring-offset-background',
            )}
          >
            <span className="tabular-nums">{i + 1}</span>
            <span className="text-[10px] leading-tight tabular-nums md:text-xs">
              {dia.fechado ? 'fechado' : `${dia.pedidos_registrados}/${dia.capacidade}`}
            </span>
            {isCustom(dia) && (
              <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-gold-dark" aria-hidden="true" />
            )}
          </button>
        )
      })}
    </div>
  )
}

function Legend() {
  const items = [
    { className: STATE_CLASS.livre, label: 'Livre' },
    { className: STATE_CLASS['com-pedidos'], label: 'Com pedidos' },
    { className: STATE_CLASS.lotado, label: 'Lotado' },
    { className: STATE_CLASS.fechado, label: 'Fechado' },
  ]
  return (
    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-2">
          <span className={cn('h-4 w-4 rounded border-2', item.className)} aria-hidden="true" />
          {item.label}
        </span>
      ))}
      <span className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-gold-dark" aria-hidden="true" />
        Ajustado no dia
      </span>
      <span>Números: pedidos / capacidade</span>
    </div>
  )
}

function Choice({ checked, onChange, children }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onChange}
      className={cn(
        'flex-1 cursor-pointer rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors',
        checked ? 'border-chocolate bg-chocolate text-vanilla' : 'bg-white hover:border-gold',
      )}
    >
      {children}
    </button>
  )
}

/** Edição de um dia. Montado de novo a cada dia selecionado (key), então o estado começa do zero. */
function DayEditor({ dia, padrao, onSaved }) {
  const [aberto, setAberto] = useState(!dia.fechado)
  const [personalizada, setPersonalizada] = useState(dia.capacidade_personalizada !== null)
  const [capacidade, setCapacidade] = useState(String(dia.capacidade))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const every = everyWeekday(parseDate(dia.data).getDay())
  // O que o dia teria sem ajuste — salvar igual a isso volta a seguir a configuração
  const abertoNaSemana = !dia.fechado_na_semana
  const capacidadeNumero = Number(capacidade)

  const handleSave = async () => {
    setError('')
    if (personalizada && (capacidade === '' || !Number.isInteger(capacidadeNumero) || capacidadeNumero < 0)) {
      setError('Informe a capacidade do dia (número inteiro).')
      return
    }
    setSaving(true)
    try {
      await updateDay(dia.data, {
        bloqueada: aberto === abertoNaSemana ? null : !aberto,
        capacidade_maxima: personalizada ? capacidadeNumero : null,
      })
      toast.success('Dia atualizado', { description: formatDateLong(dia.data) })
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (dia.passado) {
    return (
      <Card className="p-5">
        <h2 className="mb-1 text-xl">{formatDateLong(dia.data)}</h2>
        <p className="mb-3 text-sm text-muted-foreground">Dia que já passou — apenas consulta.</p>
        <p className="text-sm">
          {dia.fechado ? 'Fechado' : `${pedidosLabel(dia.pedidos_registrados)} de ${dia.capacidade}`}
        </p>
      </Card>
    )
  }

  return (
    <Card className="space-y-5 p-5">
      <div>
        <h2 className="mb-1 text-xl">{formatDateLong(dia.data)}</h2>
        <p className="text-sm text-muted-foreground">
          {dia.pedidos_registrados > 0
            ? `${pedidosLabel(dia.pedidos_registrados)} para retirar neste dia.`
            : 'Nenhum pedido para este dia ainda.'}
        </p>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Atendimento</legend>
        <div className="flex gap-2" role="radiogroup">
          <Choice checked={aberto} onChange={() => setAberto(true)}>
            Aberto
          </Choice>
          <Choice checked={!aberto} onChange={() => setAberto(false)}>
            Fechado
          </Choice>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {abertoNaSemana
            ? aberto
              ? `Aberto, como ${every}.`
              : 'Folga ou feriado: nenhum cliente consegue escolher este dia.'
            : aberto
              ? `Exceção: ${every} a loja fica fechada (Configurações), mas este dia vai abrir.`
              : `${capitalizeFirst(every)} a loja fica fechada, conforme as Configurações.`}
        </p>
        {!aberto && dia.pedidos_registrados > 0 && (
          <p className="mt-3 flex gap-2 rounded-lg border border-gold/40 bg-gold/10 p-3 text-sm">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-gold-dark" aria-hidden="true" />
            <span>
              Este dia tem {pedidosLabel(dia.pedidos_registrados)}. Fechar só impede novos pedidos — os atuais
              continuam ativos. Se precisar, cancele cada um em{' '}
              <Link to="/admin/pedidos" className="font-medium underline hover:text-gold-dark">
                Pedidos
              </Link>
              .
            </span>
          </p>
        )}
      </fieldset>

      {aberto && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Capacidade</legend>
          <div className="flex gap-2" role="radiogroup">
            <Choice checked={!personalizada} onChange={() => setPersonalizada(false)}>
              Padrão{padrao !== null && ` (${padrao})`}
            </Choice>
            <Choice checked={personalizada} onChange={() => setPersonalizada(true)}>
              Personalizada
            </Choice>
          </div>
          {personalizada ? (
            <label className="mt-3 block">
              <span className="mb-1.5 block text-xs text-muted-foreground">
                Pedidos neste dia (mínimo {dia.pedidos_registrados}, os que já existem)
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={dia.pedidos_registrados}
                value={capacidade}
                onChange={(e) => setCapacidade(e.target.value)}
                className="h-11 w-full rounded-lg border-2 bg-white px-3 text-base focus:border-gold focus:outline-none"
              />
            </label>
          ) : (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Acompanha a capacidade padrão das Configurações, mesmo se ela mudar.
            </p>
          )}
        </fieldset>
      )}

      {error && <Alert>{error}</Alert>}

      <Button onClick={handleSave} loading={saving} className="w-full">
        Salvar dia
      </Button>
    </Card>
  )
}

export function Agenda() {
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selected, setSelected] = useState(null)
  const editorRef = useRef(null)

  const fetchMonth = useCallback(
    () =>
      getCalendar(
        toDateKey(new Date(month.year, month.month, 1)),
        toDateKey(new Date(month.year, month.month + 1, 0)),
      ),
    [month],
  )
  const { data: days, error, reload, refresh } = useAsync(fetchMonth)
  // Capacidade padrão, para mostrar no editor — se falhar, o editor só não mostra o número
  const { data: configuracao } = useAsync(getSettings)

  const selectedDay = days?.find((d) => d.data === selected)

  const selectDay = (key) => {
    setSelected(key)
    // No celular o editor fica abaixo do calendário — leva a tela até ele
    if (!window.matchMedia('(min-width: 1024px)').matches) {
      requestAnimationFrame(() => editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }
  }

  const changeMonth = (delta) => {
    setMonth((m) => shiftMonth(m, delta))
    setSelected(null)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="mb-1 text-3xl">Agenda</h1>
          <p className="text-muted-foreground">
            Capacidade e folgas por dia. Dias sem ajuste seguem as Configurações.
          </p>
        </div>
        <Button as={Link} to="/admin/configuracoes" variant="outline" size="sm" className="self-start sm:self-auto">
          <Settings className="h-4 w-4" aria-hidden="true" />
          Padrões da agenda
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <Card className="p-3 md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => changeMonth(-1)} aria-label="Mês anterior">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="font-serif text-lg" aria-live="polite">
              {monthLabel(month)}
            </span>
            <Button variant="ghost" size="icon" onClick={() => changeMonth(1)} aria-label="Próximo mês">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {error ? (
            <div className="py-12 text-center">
              <p className="mb-6 text-muted-foreground">{error}</p>
              <Button variant="outline" onClick={reload}>
                <RotateCw className="h-4 w-4" aria-hidden="true" />
                Tentar novamente
              </Button>
            </div>
          ) : (
            <>
              <MonthGrid month={month} days={days} selected={selected} onSelect={selectDay} />
              <Legend />
            </>
          )}
        </Card>

        <aside ref={editorRef} className="scroll-mt-20 lg:sticky lg:top-24">
          {selectedDay ? (
            <DayEditor
              key={selectedDay.data}
              dia={selectedDay}
              padrao={configuracao?.capacidade_produtiva_padrao ?? null}
              onSaved={refresh}
            />
          ) : (
            <Card className="p-5 text-sm text-muted-foreground">
              Toque em um dia para fechar (folga, feriado) ou mudar quantos pedidos ele aceita.
            </Card>
          )}
        </aside>
      </div>
    </div>
  )
}
