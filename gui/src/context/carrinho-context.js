import { createContext } from 'react'

export const CarrinhoContext = createContext(null)

// Limite por item só para a interface — encomendas maiores a cliente combina direto com a loja
export const MAX_QUANTITY = 99