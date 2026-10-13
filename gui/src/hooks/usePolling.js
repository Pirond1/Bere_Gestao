import { useEffect, useRef } from 'react'

import { onOrdersChanged } from '../services/adminOrderService'

// Pedido pago chega pelo webhook a qualquer momento — o painel confere de tempos em tempos
export const POLL_INTERVAL_MS = 30_000

/**
 * Mantém uma tela do painel de pedidos atualizada sem trocar de página:
 * chama `callback` a cada 30 s, ao voltar para a aba e quando o painel avisa que os pedidos mudaram.
 * Com a aba em segundo plano não consulta — ninguém está vendo.
 */
export function usePolling(callback) {
  const callbackRef = useRef(callback)
  useEffect(() => {
    callbackRef.current = callback
  })

  useEffect(() => {
    const tick = () => document.visibilityState === 'visible' && callbackRef.current()

    const timer = setInterval(tick, POLL_INTERVAL_MS)
    document.addEventListener('visibilitychange', tick)
    const unsubscribe = onOrdersChanged(tick)

    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
      unsubscribe()
    }
  }, [])
}
