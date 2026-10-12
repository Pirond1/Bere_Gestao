import { useEffect, useState } from 'react'

import { getNewOrdersCount, onOrdersChanged } from '../services/adminOrderService'

// Pedido pago chega pelo webhook a qualquer momento — o painel confere de tempos em tempos
const POLL_INTERVAL_MS = 60_000

/**
 * Quantidade de pedidos novos para o indicador do menu.
 * Atualiza a cada minuto, ao voltar para a aba e quando o painel avisa que algo mudou.
 */
export function useNewOrdersCount() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let active = true
    const refresh = () => {
      getNewOrdersCount()
        .then((n) => active && setCount(n))
        // Falha pontual (rede, servidor reiniciando) não deve quebrar o menu
        .catch(() => {})
    }

    refresh()
    const timer = setInterval(refresh, POLL_INTERVAL_MS)
    const onVisible = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onVisible)
    const unsubscribe = onOrdersChanged(refresh)

    return () => {
      active = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      unsubscribe()
    }
  }, [])

  return count
}
