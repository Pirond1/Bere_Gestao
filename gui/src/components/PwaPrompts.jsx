import { Download, RefreshCw, Share, SquarePlus, WifiOff, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { toast } from 'sonner'

import { applyUpdate, isIos, isStandalone, promptInstall, subscribePwa } from '../utils/pwa'
import { BrandIcon } from './ui/Logo'
import { Button } from './ui/Button'

// O cartão fixo no rodapé não pode tampar o botão de pagar nem formulários de acesso
const QUIET_PATHS = ['/checkout', '/pagamento', '/login', '/cadastro', '/recuperar-senha']

const DISMISS_KEY = 'bere-pwa-convite-dispensado'
// Quem fechou o convite só vê de novo depois disso
const DISMISS_DAYS = 30

function wasDismissed() {
  try {
    const when = Number(localStorage.getItem(DISMISS_KEY))
    return when && Date.now() - when < DISMISS_DAYS * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

function rememberDismiss() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
  } catch {
    // Sem storage (navegação privada): o convite volta na próxima visita
  }
}

function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

function InstallCard({ ios, onInstall, onClose }) {
  return (
    <div
      role="dialog"
      aria-label="Instalar o app"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-xl border border-gold/40 bg-card p-4 shadow-xl sm:inset-x-auto sm:right-4 sm:bottom-4"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-2 right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex gap-3 pr-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-vanilla">
          <BrandIcon className="h-10" />
        </div>
        <div className="min-w-0">
          <p className="font-medium">Instale o app da Dona Berê</p>
          <p className="text-sm text-muted-foreground">
            Abra o cardápio direto da tela inicial, em tela cheia, sem procurar o site.
          </p>
        </div>
      </div>
      {ios ? (
        <ol className="mt-3 space-y-1.5 rounded-lg bg-muted p-3 text-sm">
          <li className="flex items-center gap-2">
            <span className="font-medium">1.</span> Toque em
            <Share className="h-4 w-4 text-chocolate" aria-label="Compartilhar" />
            <span>(Compartilhar)</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="font-medium">2.</span> Escolha
            <SquarePlus className="h-4 w-4 text-chocolate" aria-hidden="true" />
            <span>Adicionar à Tela de Início</span>
          </li>
        </ol>
      ) : (
        <Button onClick={onInstall} className="mt-3 w-full">
          <Download className="h-4 w-4" aria-hidden="true" />
          Instalar app
        </Button>
      )}
    </div>
  )
}

/**
 * Avisos do PWA (BG-18): convite para instalar, "sem internet" e "nova versão".
 * Fica nos layouts (cliente e admin) — a dona também pode instalar o painel no celular.
 */
export function PwaPrompts() {
  const online = useOnline()
  const { pathname } = useLocation()
  const [pwa, setPwa] = useState({ installEvent: null, waitingWorker: null })
  const [hidden, setHidden] = useState(() => isStandalone() || wasDismissed())

  useEffect(() => subscribePwa(setPwa), [])

  // Nova versão publicada: oferece atualizar em vez de trocar no meio do que a pessoa está fazendo
  useEffect(() => {
    if (!pwa.waitingWorker) return
    toast('Nova versão do app disponível', {
      id: 'pwa-update',
      duration: Infinity,
      icon: <RefreshCw className="h-4 w-4" />,
      action: { label: 'Atualizar', onClick: applyUpdate },
    })
  }, [pwa.waitingWorker])

  const close = () => {
    rememberDismiss()
    setHidden(true)
  }

  const handleInstall = async () => {
    const accepted = await promptInstall()
    if (accepted) setHidden(true)
  }

  // Android/Chrome avisam quando dá para instalar; no iPhone, mostramos o passo a passo
  const ios = isIos()
  const canInstall = Boolean(pwa.installEvent) || ios
  const quiet = QUIET_PATHS.some((p) => pathname.includes(p))

  return (
    <>
      {!online && (
        <div
          role="status"
          className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 bg-terracotta px-4 py-2 text-sm font-medium text-white"
        >
          <WifiOff className="h-4 w-4" aria-hidden="true" />
          Você está sem internet — pedidos e pagamentos voltam quando a conexão voltar.
        </div>
      )}
      {!hidden && canInstall && !quiet && <InstallCard ios={ios} onInstall={handleInstall} onClose={close} />}
    </>
  )
}
