import { CardPayment } from '@mercadopago/sdk-react'
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { ensureMercadoPago } from '../services/mercadoPago'
import { Alert } from './ui/Alert'

// Fora do componente: o Brick é recriado sempre que estes objetos mudam de referência,
// o que apagaria o que o cliente já digitou.
const CUSTOMIZATION = {
  paymentMethods: {
    // Decisão do projeto: somente crédito, à vista
    types: { included: ['credit_card'] },
    minInstallments: 1,
    maxInstallments: 1,
  },
  visual: {
    texts: { formSubmit: 'Pagar' },
    style: {
      theme: 'default',
      customVariables: {
        baseColor: '#3e2723',
        borderRadiusMedium: '0.75rem',
        borderRadiusLarge: '0.75rem',
      },
    },
  },
}

/**
 * Card Payment Brick do Mercado Pago. Os dados do cartão ficam em iframes do
 * Mercado Pago e só o token chega ao nosso backend (LGPD / PCI).
 */
export function CardPaymentForm({ amount, email, onSubmit }) {
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const configured = ensureMercadoPago()

  const initialization = useMemo(
    () => ({ amount: Number(amount), ...(email ? { payer: { email } } : {}) }),
    [amount, email],
  )

  // O callback muda a cada render do pai; o ref mantém a referência passada ao Brick estável
  const submitRef = useRef(onSubmit)
  useLayoutEffect(() => {
    submitRef.current = onSubmit
  })
  const handleSubmit = useCallback((cardData) => submitRef.current(cardData), [])
  const handleReady = useCallback(() => setReady(true), [])
  const handleError = useCallback((error) => {
    console.error('Card Payment Brick:', error)
    // Erros de validação do formulário o próprio Brick mostra; só tratamos falha ao carregar
    if (error?.type === 'critical') setLoadError(true)
  }, [])

  if (!configured || loadError) {
    return (
      <Alert>
        O pagamento com cartão está indisponível no momento. Tente pagar com PIX ou volte mais tarde.
      </Alert>
    )
  }

  return (
    <div className="min-h-64">
      {!ready && <div className="h-80 animate-pulse rounded-lg bg-muted" aria-label="Carregando formulário do cartão" />}
      <CardPayment
        initialization={initialization}
        customization={CUSTOMIZATION}
        locale="pt-BR"
        onSubmit={handleSubmit}
        onReady={handleReady}
        onError={handleError}
      />
    </div>
  )
}