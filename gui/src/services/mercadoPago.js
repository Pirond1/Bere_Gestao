import { initMercadoPago } from '@mercadopago/sdk-react'

// Public key do Mercado Pago (gui/.env). Pode ir para o navegador — só tokeniza o cartão.
const publicKey = import.meta.env.VITE_MP_PUBLIC_KEY

let started = false

/** Inicializa o SDK uma única vez. Retorna false se a chave não estiver configurada. */
export function ensureMercadoPago() {
  if (!publicKey) return false
  if (!started) {
    initMercadoPago(publicKey, { locale: 'pt-BR' })
    started = true
  }
  return true
}