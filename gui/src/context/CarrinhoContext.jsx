import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { getProduct } from '../services/productService'
import { CarrinhoContext, MAX_QUANTITY } from './carrinho-context'

const STORAGE_KEY = 'bere-carrinho'

function readStoredItems() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return Array.isArray(stored) ? stored : []
  } catch {
    return []
  }
}

/** Guarda só o necessário para exibir o carrinho — o preço final é sempre calculado pela API. */
function toCartItem(product, quantidade) {
  return {
    produtoId: product.id,
    nome: product.nome,
    preco: product.preco,
    foto: product.foto,
    categoria: product.categoria?.nome ?? null,
    quantidade,
  }
}

const clamp = (n) => Math.min(Math.max(n, 1), MAX_QUANTITY)

export function CarrinhoProvider({ children }) {
  const [items, setItems] = useState(readStoredItems)
  const itemsRef = useRef(items)

  useEffect(() => {
    itemsRef.current = items
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // Sem storage (navegação privada): o carrinho vale só nesta aba
    }
  }, [items])

  const addItem = useCallback((product, quantidade = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.produtoId === product.id)
      if (existing) {
        return prev.map((i) =>
          i.produtoId === product.id ? toCartItem(product, clamp(i.quantidade + quantidade)) : i,
        )
      }
      return [...prev, toCartItem(product, clamp(quantidade))]
    })
  }, [])

  const removeItem = useCallback((produtoId) => {
    setItems((prev) => prev.filter((i) => i.produtoId !== produtoId))
  }, [])

  const updateQuantity = useCallback(
    (produtoId, quantidade) => {
      if (quantidade <= 0) return removeItem(produtoId)
      setItems((prev) => prev.map((i) => (i.produtoId === produtoId ? { ...i, quantidade: clamp(quantidade) } : i)))
    },
    [removeItem],
  )

  const clear = useCallback(() => setItems([]), [])

  /**
   * Confere os itens com a API: atualiza nome/preço/foto e remove o que saiu do cardápio.
   * Devolve o que mudou para a tela avisar a cliente.
   */
  const syncWithServer = useCallback(async () => {
    const current = itemsRef.current
    if (current.length === 0) return { removed: [], repriced: [] }

    const results = await Promise.allSettled(current.map((i) => getProduct(i.produtoId)))
    const removedIds = new Set()
    const removed = []
    const repriced = []
    const fresh = {}

    results.forEach((result, index) => {
      const item = current[index]
      if (result.status === 'fulfilled') {
        fresh[item.produtoId] = result.value
        if (Number(result.value.preco) !== Number(item.preco)) repriced.push(result.value.nome)
      } else if (result.reason?.response?.status === 404) {
        removedIds.add(item.produtoId)
        removed.push(item.nome)
      }
      // Outros erros (rede): mantém o item como está, a API valida de novo ao fechar o pedido
    })

    setItems((prev) =>
      prev
        .filter((i) => !removedIds.has(i.produtoId))
        .map((i) => (fresh[i.produtoId] ? toCartItem(fresh[i.produtoId], i.quantidade) : i)),
    )
    return { removed, repriced }
  }, [])

  const value = useMemo(() => {
    const itemCount = items.reduce((sum, i) => sum + i.quantidade, 0)
    const total = items.reduce((sum, i) => sum + Number(i.preco) * i.quantidade, 0)
    return { items, itemCount, total, addItem, removeItem, updateQuantity, clear, syncWithServer }
  }, [items, addItem, removeItem, updateQuantity, clear, syncWithServer])

  return <CarrinhoContext.Provider value={value}>{children}</CarrinhoContext.Provider>
}