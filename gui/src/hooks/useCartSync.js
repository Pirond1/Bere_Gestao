import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { useCarrinho } from './useCarrinho'

/**
 * Ao abrir carrinho/checkout, confere preços e disponibilidade com a API
 * e avisa a cliente se algo mudou desde que o item foi adicionado.
 */
export function useCartSync() {
  const { syncWithServer } = useCarrinho()
  const [syncing, setSyncing] = useState(true)
  const started = useRef(false)

  useEffect(() => {
    // StrictMode roda efeitos duas vezes em dev — evita avisos duplicados
    if (started.current) return
    started.current = true

    syncWithServer()
      .then(({ removed, repriced }) => {
        if (removed.length > 0) {
          toast.warning('Item fora do cardápio', {
            description: `${removed.join(', ')} não está mais disponível e saiu do carrinho.`,
          })
        }
        if (repriced.length > 0) {
          toast.info('Preço atualizado', { description: `O valor de ${repriced.join(', ')} mudou.` })
        }
      })
      .finally(() => setSyncing(false))
  }, [syncWithServer])

  return syncing
}