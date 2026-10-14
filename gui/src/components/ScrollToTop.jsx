import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router'

// O navegador também tenta restaurar a rolagem ao voltar/recarregar — a regra aqui é sempre o topo
if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'

/**
 * Toda troca de página abre no topo (inclusive no "Voltar").
 * Só o caminho conta: filtros na URL (?categoria=, ?aba=) não mexem na rolagem.
 */
export function ScrollToTop() {
  const { pathname } = useLocation()

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])

  return null
}
