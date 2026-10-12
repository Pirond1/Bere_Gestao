import { useCallback, useEffect, useState } from 'react'

import { getErrorMessage } from '../utils/errors'

/**
 * Executa uma busca ao montar o componente e expõe { data, loading, error, reload }.
 * `fn` deve ser estável (função importada ou useCallback).
 */
export function useAsync(fn) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true

    fn()
      .then((data) => active && setState({ data, loading: false, error: null }))
      .catch((error) => active && setState({ data: null, loading: false, error: getErrorMessage(error) }))

    return () => {
      active = false
    }
  }, [fn, attempt])

  const reload = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    setAttempt((n) => n + 1)
  }, [])

  return { ...state, reload }
}