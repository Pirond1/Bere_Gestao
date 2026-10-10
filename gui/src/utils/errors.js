/**
 * Converte o erro do axios em uma mensagem amigável.
 * A FastAPI devolve `detail` como string (HTTPException) ou lista (validação 422 do Pydantic).
 */
export function getErrorMessage(error, fallback = 'Algo deu errado. Tente novamente.') {
  if (!error.response) {
    return 'Não foi possível conectar ao servidor. Verifique sua internet.'
  }

  const { detail } = error.response.data ?? {}
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length > 0) {
    return detail[0].msg.replace(/^Value error, /, '')
  }
  return fallback
}