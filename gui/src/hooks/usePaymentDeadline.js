import { useEffect, useState } from 'react'

import { getPublicSettings } from '../services/settingsService'

/** "30 minutos", "1 hora", "1h30" */
export function formatMinutes(minutos) {
  if (minutos < 60) return `${minutos} minutos`
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  if (resto) return `${horas}h${String(resto).padStart(2, '0')}`
  return horas === 1 ? '1 hora' : `${horas} horas`
}

/**
 * Prazo para pagar o pedido, definido pela loja no painel, já formatado.
 * Enquanto carrega (ou se falhar) devolve um texto genérico para a frase continuar fazendo sentido.
 */
export function usePaymentDeadline() {
  const [minutos, setMinutos] = useState(null)

  useEffect(() => {
    let active = true
    getPublicSettings()
      .then((c) => active && setMinutos(c.prazo_pagamento_minutos))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  return minutos ? formatMinutes(minutos) : 'alguns minutos'
}