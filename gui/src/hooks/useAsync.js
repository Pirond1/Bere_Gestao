import { useCallback, useEffect, useRef, useState } from 'react'

import { getErrorMessage } from '../utils/errors'

/**
 * Executa uma busca ao montar o componente e expõe { data, loading, error, reload, refresh }.
 * `fn` deve ser estável (função importada ou useCallback).
 * `refresh` busca de novo em segundo plano: não liga o `loading` e, se falhar, mantém os dados atuais.
 */
export function useAsync(fn) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const [attempt, setAttempt] = useState(0)
  const silentRef = useRef(false)

  useEffect(() => {
    let active = true
    // Consome a marca: só a busca pedida pelo `refresh` é silenciosa (troca de filtro não é)
    const silent = silentRef.current
    silentRef.current = false

    fn()
      .then((data) => active && setState({ data, loading: false, error: null }))
      .catch((error) => {
        if (!active) return
        setState((prev) =>
          silent && prev.data ? prev : { data: null, loading: false, error: getErrorMessage(error) },
        )
      })

    return () => {
      active = false
    }
  }, [fn, attempt])

  const reload = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    setAttempt((n) => n + 1)
  }, [])

  const refresh = useCallback(() => {
    silentRef.current = true
    setAttempt((n) => n + 1)
  }, [])

  return { ...state, reload, refresh }
}