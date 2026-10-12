import { CalendarRange } from 'lucide-react'

import { CUSTOM_PERIOD, PERIOD_PRESETS, periodFromPreset } from '../../utils/period'

const inputClass =
  'h-10 rounded-lg border-2 bg-white px-3 text-sm transition-colors focus:border-gold focus:outline-none'

/**
 * Seletor de período dos relatórios.
 * value: { preset, inicio, fim } — datas 'AAAA-MM-DD'.
 */
export function PeriodFilter({ value, onChange }) {
  const handlePreset = (e) => {
    const preset = e.target.value
    onChange(preset === CUSTOM_PERIOD ? { ...value, preset } : periodFromPreset(preset))
  }

  // Só aplica datas válidas e em ordem — evita buscar a cada tecla com período inválido
  const handleDate = (field) => (e) => {
    const next = { ...value, preset: CUSTOM_PERIOD, [field]: e.target.value }
    if (next.inicio && next.fim && next.inicio <= next.fim) onChange(next)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="relative">
        <span className="sr-only">Período</span>
        <CalendarRange
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gold-dark"
          aria-hidden="true"
        />
        <select value={value.preset} onChange={handlePreset} className={`${inputClass} cursor-pointer pl-9`}>
          {PERIOD_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
          <option value={CUSTOM_PERIOD}>Personalizado</option>
        </select>
      </label>

      {value.preset === CUSTOM_PERIOD && (
        <div className="flex items-center gap-2">
          <label>
            <span className="sr-only">Data inicial</span>
            <input
              type="date"
              defaultValue={value.inicio}
              max={value.fim}
              onChange={handleDate('inicio')}
              className={inputClass}
            />
          </label>
          <span className="text-sm text-muted-foreground">até</span>
          <label>
            <span className="sr-only">Data final</span>
            <input
              type="date"
              defaultValue={value.fim}
              min={value.inicio}
              onChange={handleDate('fim')}
              className={inputClass}
            />
          </label>
        </div>
      )}
    </div>
  )
}