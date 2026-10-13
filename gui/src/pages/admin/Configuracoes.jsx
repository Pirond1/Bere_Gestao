import { CalendarDays, QrCode, RotateCw, Store } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Field } from '../../components/ui/Field'
import { formatMinutes } from '../../hooks/usePaymentDeadline'
import { useAsync } from '../../hooks/useAsync'
import { getSettings, updateSettings } from '../../services/settingsService'
import { cn } from '../../utils/cn'
import { getErrorMessage } from '../../utils/errors'

// Mesma numeração da API (date.weekday()): 0 = segunda … 6 = domingo
const WEEKDAYS = [
  { value: 0, short: 'Seg', label: 'segunda' },
  { value: 1, short: 'Ter', label: 'terça' },
  { value: 2, short: 'Qua', label: 'quarta' },
  { value: 3, short: 'Qui', label: 'quinta' },
  { value: 4, short: 'Sex', label: 'sexta' },
  { value: 5, short: 'Sáb', label: 'sábado' },
  { value: 6, short: 'Dom', label: 'domingo' },
]

// Limites iguais aos da API (schemas/configuracao.py)
const LIMITS = {
  capacidade_produtiva_padrao: [0, 500],
  antecedencia_minima_dias: [0, 60],
  prazo_pagamento_minutos: [30, 1440],
}

const toForm = (c) => ({
  capacidade_produtiva_padrao: String(c.capacidade_produtiva_padrao),
  antecedencia_minima_dias: String(c.antecedencia_minima_dias),
  prazo_pagamento_minutos: String(c.prazo_pagamento_minutos),
  dias_fechados: c.dias_fechados,
  endereco_retirada: c.endereco_retirada ?? '',
  horario_retirada: c.horario_retirada ?? '',
})

function antecedenciaHint(dias) {
  if (!Number.isInteger(dias) || dias < 0) return 'Quantos dias antes o cliente precisa encomendar.'
  if (dias === 0) return 'O cliente pode pedir para retirar no mesmo dia.'
  if (dias === 1) return 'Um pedido feito hoje pode ser retirado a partir de amanhã.'
  return `Um pedido feito hoje pode ser retirado daqui a ${dias} dias.`
}

function validate(form) {
  const errors = {}
  for (const [campo, [min, max]] of Object.entries(LIMITS)) {
    const valor = Number(form[campo])
    if (form[campo] === '' || !Number.isInteger(valor) || valor < min || valor > max) {
      errors[campo] = `Informe um número inteiro entre ${min} e ${max}`
    }
  }
  if (form.dias_fechados.length === 7) errors.dias_fechados = 'A loja precisa atender em pelo menos um dia'
  return errors
}

function Section({ icon: Icon, title, description, children }) {
  return (
    <Card className="p-5 md:p-6">
      <h2 className="mb-1 flex items-center gap-2 text-xl">
        <Icon className="h-5 w-5 text-gold-dark" aria-hidden="true" />
        {title}
      </h2>
      <p className="mb-5 text-sm text-muted-foreground">{description}</p>
      <div className="space-y-5">{children}</div>
    </Card>
  )
}

function SettingsForm({ initial }) {
  const [saved, setSaved] = useState(() => toForm(initial))
  const [form, setForm] = useState(saved)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const dirty = JSON.stringify(form) !== JSON.stringify(saved)
  const update = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))
  const toggleDay = (value) =>
    setForm((f) => ({
      ...f,
      dias_fechados: f.dias_fechados.includes(value)
        ? f.dias_fechados.filter((d) => d !== value)
        : [...f.dias_fechados, value].sort(),
    }))

  const prazo = Number(form.prazo_pagamento_minutos)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const found = validate(form)
    setErrors(found)
    setError('')
    if (Object.keys(found).length) return

    setSaving(true)
    try {
      const atualizada = await updateSettings({
        capacidade_produtiva_padrao: Number(form.capacidade_produtiva_padrao),
        antecedencia_minima_dias: Number(form.antecedencia_minima_dias),
        prazo_pagamento_minutos: prazo,
        dias_fechados: form.dias_fechados,
        endereco_retirada: form.endereco_retirada.trim() || null,
        horario_retirada: form.horario_retirada.trim() || null,
      })
      const novo = toForm(atualizada)
      setSaved(novo)
      setForm(novo)
      toast.success('Configurações salvas')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <Section
        icon={CalendarDays}
        title="Agenda"
        description="Valem para todos os dias que você não ajustou no calendário da Agenda."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Pedidos por dia"
            type="number"
            inputMode="numeric"
            min={0}
            value={form.capacidade_produtiva_padrao}
            onChange={update('capacidade_produtiva_padrao')}
            error={errors.capacidade_produtiva_padrao}
            hint="Quantos pedidos você consegue produzir em um dia."
          />
          <Field
            label="Antecedência mínima (dias)"
            type="number"
            inputMode="numeric"
            min={0}
            value={form.antecedencia_minima_dias}
            onChange={update('antecedencia_minima_dias')}
            error={errors.antecedencia_minima_dias}
            hint={antecedenciaHint(Number(form.antecedencia_minima_dias))}
          />
        </div>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Dias da semana sem atendimento</legend>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((d) => {
              const closed = form.dias_fechados.includes(d.value)
              return (
                <button
                  key={d.value}
                  type="button"
                  aria-pressed={closed}
                  aria-label={`${d.label}${closed ? ', fechado' : ', aberto'}`}
                  onClick={() => toggleDay(d.value)}
                  className={cn(
                    'h-10 min-w-14 cursor-pointer rounded-lg border-2 px-3 text-sm font-medium transition-colors',
                    closed
                      ? 'border-chocolate bg-chocolate text-vanilla line-through decoration-gold'
                      : 'bg-white hover:border-gold',
                  )}
                >
                  {d.short}
                </button>
              )
            })}
          </div>
          {errors.dias_fechados ? (
            <p className="mt-1.5 text-sm text-destructive">{errors.dias_fechados}</p>
          ) : (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Marque os dias em que a loja não abre. Para abrir um deles como exceção, use a Agenda.
            </p>
          )}
        </fieldset>
      </Section>

      <Section
        icon={QrCode}
        title="Pagamento"
        description="Enquanto o cliente não paga, a data fica reservada para ele."
      >
        <Field
          label="Prazo para pagar o PIX (minutos)"
          type="number"
          inputMode="numeric"
          min={30}
          step={5}
          value={form.prazo_pagamento_minutos}
          onChange={update('prazo_pagamento_minutos')}
          error={errors.prazo_pagamento_minutos}
          hint={`${
            Number.isInteger(prazo) && prazo >= 30 ? `${formatMinutes(prazo)}. ` : ''
          }Entre 30 minutos e 24 horas. Depois disso o pedido não pago é cancelado e a vaga volta para a agenda.`}
          className="sm:max-w-xs"
        />
      </Section>

      <Section
        icon={Store}
        title="Retirada"
        description="Vão na mensagem de pedido pronto que você envia pelo WhatsApp."
      >
        <Field
          label="Endereço de retirada"
          optional
          maxLength={255}
          value={form.endereco_retirada}
          onChange={update('endereco_retirada')}
          placeholder="Ex.: Rua das Flores, 123 – Centro"
        />
        <Field
          label="Horário de retirada"
          optional
          maxLength={100}
          value={form.horario_retirada}
          onChange={update('horario_retirada')}
          placeholder="Ex.: das 9h às 18h"
        />
      </Section>

      {error && <Alert>{error}</Alert>}

      {/* Fixo no rodapé no celular: o formulário é longo e o botão precisa estar à mão */}
      <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
        {dirty && (
          <Button
            variant="ghost"
            onClick={() => {
              setForm(saved)
              setErrors({})
              setError('')
            }}
            disabled={saving}
          >
            Descartar
          </Button>
        )}
        <Button type="submit" loading={saving} disabled={!dirty}>
          Salvar alterações
        </Button>
      </div>
    </form>
  )
}

export function Configuracoes() {
  const { data, loading, error, reload } = useAsync(getSettings)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="mb-1 text-3xl">Configurações</h1>
        <p className="text-muted-foreground">Regras da agenda, do pagamento e da retirada.</p>
      </header>

      {loading && !data ? (
        <div className="space-y-6" aria-label="Carregando configurações">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-lg bg-muted" />
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
      ) : (
        <SettingsForm initial={data} />
      )}
    </div>
  )
}