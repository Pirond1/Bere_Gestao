import { Heart, Star } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { createReview } from '../services/reviewService'
import { cn } from '../utils/cn'
import { getErrorMessage } from '../utils/errors'
import { Alert } from './ui/Alert'
import { Button } from './ui/Button'
import { Card } from './ui/Card'

const MAX_COMMENT = 1000
const SCORES = Array.from({ length: 11 }, (_, i) => i)

// A pergunta do comentário acompanha a nota — detratores dizem o que melhorar, promotores o que gostaram
function commentPrompt(nota) {
  if (nota <= 6) return 'O que podemos melhorar?'
  if (nota <= 8) return 'O que faltou para ser nota 10?'
  return 'O que você mais gostou?'
}

/** Avaliação já enviada — o cliente só avalia uma vez. */
function SentReview({ avaliacao }) {
  return (
    <Card className="flex gap-4 p-5 md:p-6">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold/15 font-serif text-xl text-gold-dark lining-nums">
        {avaliacao.nota}
      </span>
      <div className="min-w-0">
        <h2 className="mb-1 text-xl">Sua avaliação</h2>
        {avaliacao.comentario ? (
          <p className="whitespace-pre-line text-muted-foreground">“{avaliacao.comentario}”</p>
        ) : (
          <p className="text-muted-foreground">Você deu nota {avaliacao.nota} para este pedido.</p>
        )}
        <p className="mt-2 flex items-center gap-1.5 text-sm text-gold-dark">
          <Heart className="h-4 w-4" aria-hidden="true" />
          Obrigada pelo carinho!
        </p>
      </div>
    </Card>
  )
}

/** Pesquisa NPS do pedido retirado (RF_S02): nota de 0 a 10 + comentário opcional. */
export function OrderReview({ pedidoId, avaliacao, onReviewed }) {
  const [nota, setNota] = useState(null)
  const [comentario, setComentario] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (avaliacao) return <SentReview avaliacao={avaliacao} />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await createReview(pedidoId, { nota, comentario: comentario.trim() || null })
      toast.success('Avaliação enviada!', { description: 'Sua opinião ajuda a Dona Berê a caprichar ainda mais.' })
      onReviewed()
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível enviar sua avaliação. Tente novamente.'))
      setSubmitting(false)
    }
  }

  return (
    <Card as="form" onSubmit={handleSubmit} className="border-2 border-gold/40 bg-gold/5 p-5 md:p-6">
      <div className="mb-1 flex items-center gap-2">
        <Star className="h-5 w-5 text-gold-dark" aria-hidden="true" />
        <h2 className="text-xl">Como foi seu pedido?</h2>
      </div>

      <fieldset>
        <legend className="mb-4 text-muted-foreground">
          De 0 a 10, o quanto você recomendaria a Dona Berê Doces para um amigo ou familiar?
        </legend>

        {/* Escala neutra: todas as notas com a mesma cor para não induzir a resposta */}
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-11">
          {SCORES.map((score) => (
            <label key={score} className="cursor-pointer">
              <input
                type="radio"
                name="nota"
                value={score}
                checked={nota === score}
                onChange={() => setNota(score)}
                className="peer sr-only"
              />
              <span
                className={cn(
                  'flex h-11 items-center justify-center rounded-lg border-2 font-medium tabular-nums transition-colors',
                  'peer-focus-visible:ring-2 peer-focus-visible:ring-chocolate peer-focus-visible:ring-offset-2',
                  // cn não resolve conflito de classes: o fundo precisa ser um ou outro
                  nota === score
                    ? 'border-chocolate bg-chocolate text-vanilla'
                    : 'bg-white hover:border-chocolate/40 hover:bg-chocolate/5',
                )}
              >
                {score}
              </span>
            </label>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>0 · Nada provável</span>
          <span>10 · Muito provável</span>
        </div>
      </fieldset>

      {nota !== null && (
        <div className="mt-6">
          <label htmlFor="comentario" className="mb-1.5 block font-medium">
            {commentPrompt(nota)} <span className="font-normal text-muted-foreground">(opcional)</span>
          </label>
          <textarea
            id="comentario"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            maxLength={MAX_COMMENT}
            rows={3}
            className="w-full resize-none rounded-lg border-2 bg-white p-3 placeholder:text-muted-foreground/60 focus:border-gold focus:outline-none"
          />
          <p className="mt-1 text-right text-xs text-muted-foreground tabular-nums">
            {comentario.length}/{MAX_COMMENT}
          </p>
        </div>
      )}

      {error && <Alert className="mt-4">{error}</Alert>}

      <Button type="submit" variant="gold" className="mt-4 w-full sm:w-auto" disabled={nota === null} loading={submitting}>
        Enviar avaliação
      </Button>
    </Card>
  )
}