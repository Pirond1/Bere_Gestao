import { LoaderCircle } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

import { lookupCep } from '../services/profileService'
import { cn } from '../utils/cn'
import { getErrorMessage } from '../utils/errors'
import { maskCep, onlyDigits } from '../utils/format'
import { Alert } from './ui/Alert'
import { Button } from './ui/Button'
import { Field } from './ui/Field'

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

const emptyAddress = { cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' }

/**
 * Endereço com preenchimento pelo CEP (CompleteCEP — ViaCEP pela API).
 * Usado pelo cliente (Minha conta) e pela loja (Admin › Clientes); `onSave(dados)` decide para onde vai.
 */
export function AddressForm({ endereco, onSave, onSaved }) {
  const [form, setForm] = useState(
    endereco
      ? { ...endereco, cep: maskCep(endereco.cep), complemento: endereco.complemento ?? '' }
      : emptyAddress,
  )
  const [errors, setErrors] = useState({})
  const [cepStatus, setCepStatus] = useState({ loading: false, message: '' })
  const numeroRef = useRef(null)
  const lastLookup = useRef(endereco?.cep ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const update = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))

  // CompleteCEP: com os 8 dígitos, busca rua, bairro, cidade e UF
  const handleCep = async (e) => {
    const cep = maskCep(e.target.value)
    setForm((f) => ({ ...f, cep }))
    const digits = onlyDigits(cep)
    if (digits.length !== 8 || digits === lastLookup.current) return
    lastLookup.current = digits

    setCepStatus({ loading: true, message: '' })
    try {
      const found = await lookupCep(digits)
      setForm((f) => ({
        ...f,
        // CEP geral de cidade não tem rua/bairro — mantém o que já foi digitado
        rua: found.rua ?? f.rua,
        bairro: found.bairro ?? f.bairro,
        cidade: found.cidade,
        uf: found.uf,
      }))
      setErrors({})
      setCepStatus({ loading: false, message: '' })
      numeroRef.current?.focus()
    } catch (err) {
      setCepStatus({ loading: false, message: getErrorMessage(err) })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const found = {}
    if (onlyDigits(form.cep).length !== 8) found.cep = 'Informe os 8 dígitos do CEP'
    for (const [campo, label] of [['rua', 'a rua'], ['numero', 'o número'], ['bairro', 'o bairro'], ['cidade', 'a cidade']]) {
      if (!form[campo].trim()) found[campo] = `Informe ${label}`
    }
    if (!form.uf) found.uf = 'Escolha a UF'
    setErrors(found)
    if (Object.keys(found).length) return

    setSaving(true)
    setError('')
    try {
      const salvo = await onSave({
        cep: onlyDigits(form.cep),
        rua: form.rua.trim(),
        numero: form.numero.trim(),
        complemento: form.complemento.trim() || null,
        bairro: form.bairro.trim(),
        cidade: form.cidade.trim(),
        uf: form.uf,
      })
      // A API grava a grafia oficial da cidade
      setForm((f) => ({ ...f, cidade: salvo.cidade }))
      toast.success('Endereço salvo')
      onSaved?.()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <Field
        label="CEP"
        inputMode="numeric"
        autoComplete="postal-code"
        value={form.cep}
        onChange={handleCep}
        error={errors.cep || cepStatus.message}
        hint="Digite o CEP para preencher o endereço automaticamente."
        className="sm:max-w-48"
      >
        {cepStatus.loading && (
          <LoaderCircle
            className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
            aria-label="Buscando CEP"
          />
        )}
      </Field>

      <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
        <Field label="Rua" autoComplete="address-line1" maxLength={150} value={form.rua} onChange={update('rua')} error={errors.rua} />
        <Field label="Número" ref={numeroRef} maxLength={10} value={form.numero} onChange={update('numero')} error={errors.numero} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Complemento" optional autoComplete="address-line2" maxLength={100} value={form.complemento} onChange={update('complemento')} />
        <Field label="Bairro" maxLength={100} value={form.bairro} onChange={update('bairro')} error={errors.bairro} />
      </div>
      <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
        <Field label="Cidade" autoComplete="address-level2" maxLength={100} value={form.cidade} onChange={update('cidade')} error={errors.cidade} />
        <div className="space-y-1.5">
          <label htmlFor="uf" className="block text-sm font-medium">
            UF
          </label>
          <select
            id="uf"
            autoComplete="address-level1"
            value={form.uf}
            onChange={update('uf')}
            aria-invalid={Boolean(errors.uf)}
            className={cn(
              'h-11 w-full cursor-pointer rounded-lg border-2 bg-white px-3 text-base focus:border-gold focus:outline-none',
              errors.uf && 'border-destructive/60',
            )}
          >
            <option value="">–</option>
            {UFS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
          {errors.uf && <p className="text-sm text-destructive">{errors.uf}</p>}
        </div>
      </div>
      {error && <Alert>{error}</Alert>}
      <Button type="submit" loading={saving}>
        {endereco ? 'Salvar endereço' : 'Cadastrar endereço'}
      </Button>
    </form>
  )
}
