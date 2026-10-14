import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { getNewOrdersCount, notifyOrdersChanged, onOrdersChanged } from '../services/adminOrderService'
import { POLL_INTERVAL_MS } from './usePolling'

/**
 * Quantidade de pedidos novos para o indicador do menu.
 * Atualiza a cada 30 s (inclusive em segundo plano, para o título da aba), ao voltar para a aba
 * e quando o painel avisa que algo mudou. Se aumentar, avisa a dona e faz as telas abertas recarregarem.
 */
export function useNewOrdersCount() {
  const [count, setCount] = useState(0)
  const lastCount = useRef(null)
  // Em ref para o efeito não reiniciar (e reconsultar) a cada troca de página
  const navigate = useNavigate()
  const navigateRef = useRef(navigate)
  useEffect(() => {
    navigateRef.current = navigate
  })

  useEffect(() => {
    let active = true
    const refresh = () => {
      getNewOrdersCount()
        .then((n) => {
          if (!active) return
          const chegaram = lastCount.current === null ? 0 : n - lastCount.current
          lastCount.current = n
          setCount(n)
          if (chegaram > 0) {
            toast.info(chegaram === 1 ? 'Novo pedido recebido' : `${chegaram} pedidos novos recebidos`, {
              action: { label: 'Ver', onClick: () => navigateRef.current('/admin/pedidos') },
            })
            // A lista/detalhe abertos recarregam na hora, sem esperar o próximo ciclo
            notifyOrdersChanged()
          }
        })
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
