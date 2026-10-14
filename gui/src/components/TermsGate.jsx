import { ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { toast } from 'sonner'

import { useAuth } from '../hooks/useAuth'
import { acceptTerms, getAccountStatus } from '../services/profileService'
import { getErrorMessage } from '../utils/errors'
import { Button } from './ui/Button'

/**
 * Conta criada antes da política (ou política nova): pede o aceite ao entrar (LGPD — BG-20).
 * Até aceitar, a API não deixa finalizar pedidos; navegar e montar o carrinho continua livre.
 */
export function TermsGate() {
  const { user, isAdmin } = useAuth()
  const { pathname } = useLocation()
  const [pending, setPending] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [saving, setSaving] = useState(false)
  const isClient = Boolean(user) && !isAdmin

  useEffect(() => {
    if (!isClient) return
    let active = true
    getAccountStatus()
      .then((conta) => active && setPending(conta.termos_pendentes))
      // Sem resposta, não bloqueia nada: a API confere de novo ao fazer o pedido
      .catch(() => {})
    return () => {
      active = false
    }
  }, [isClient, user?.id])

  // Na própria página da política a pessoa precisa conseguir ler antes de aceitar
  if (!isClient || !pending || dismissed || pathname === '/privacidade') return null

  const handleAccept = async () => {
    setSaving(true)
    try {
      await acceptTerms()
      setPending(false)
      toast.success('Obrigado! Aceite registrado.')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-chocolate/50 p-3 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="termos-titulo"
        className="w-full max-w-md rounded-xl bg-card p-5 shadow-2xl"
      >
        <ShieldCheck className="mb-3 h-8 w-8 text-gold-dark" aria-hidden="true" />
        <h2 id="termos-titulo" className="mb-2 text-xl">
          Atualizamos nossa Política de Privacidade
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Explicamos quais dados guardamos, para quê e como você pode baixar, corrigir ou excluir seus dados a qualquer
          momento. Para continuar fazendo pedidos, precisamos do seu aceite.
        </p>
        <Link to="/privacidade" className="mb-5 inline-block text-sm font-medium underline underline-offset-2">
          Ler a Política de Privacidade e os Termos de Uso
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button onClick={handleAccept} loading={saving} className="sm:flex-1">
            Li e aceito
          </Button>
          <Button variant="ghost" onClick={() => setDismissed(true)} disabled={saving}>
            Agora não
          </Button>
        </div>
      </div>
    </div>
  )
}
