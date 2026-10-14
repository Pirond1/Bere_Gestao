import { SiWhatsapp } from 'react-icons/si'
import { useLocation } from 'react-router'

import { useAsync } from '../hooks/useAsync'
import { getPublicSettings } from '../services/settingsService'
import { whatsappLink } from '../utils/whatsapp'

// Não tampa o botão de pagar nem o resumo do pedido
const HIDDEN_PATHS = ['/checkout', '/pagamento']

/** Botão flutuante para falar com a loja (BG-21). Só aparece com o WhatsApp preenchido nas Configurações. */
export function WhatsAppButton() {
  const { pathname } = useLocation()
  const { data: loja } = useAsync(getPublicSettings)

  if (!loja?.whatsapp_loja || HIDDEN_PATHS.some((p) => pathname.includes(p))) return null

  return (
    <a
      href={whatsappLink(loja.whatsapp_loja, 'Olá! Vim pelo site da Dona Berê Doces e gostaria de tirar uma dúvida.')}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar com a loja pelo WhatsApp"
      title="Falar com a loja pelo WhatsApp"
      // Canto esquerdo: o convite de instalação do app (PWA) fica à direita
      className="fixed bottom-4 left-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 focus-visible:ring-4 focus-visible:ring-[#25D366]/40 focus-visible:outline-none"
    >
      <SiWhatsapp className="h-7 w-7" aria-hidden="true" />
    </a>
  )
}
