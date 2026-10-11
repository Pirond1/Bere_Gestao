import { Copy, LoaderCircle, TimerOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { getPayment } from '../services/paymentService'
import { parseApiDateTime } from '../utils/date'
import { PAYMENT_STATUS } from '../utils/paymentStatus'
import { Button } from './ui/Button'

const POLL_MS = 5000

function useSecondsLeft(expiraEm) {
  const deadline = parseApiDateTime(expiraEm).getTime()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  return Math.max(0, Math.floor((deadline - now) / 1000))
}

const formatCountdown = (seconds) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

/**
 * QR Code + "Pix Copia e Cola" de um pagamento pendente.
 * Consulta a API a cada poucos segundos e avisa quando sai de "pendente".
 */
export function PixPayment({ pagamento: initial, onResolved }) {
  const [pagamento, setPagamento] = useState(initial)
  const secondsLeft = useSecondsLeft(pagamento.expira_em)
  const expired = secondsLeft === 0 || pagamento.status === PAYMENT_STATUS.EXPIRADO
  const pending = pagamento.status === PAYMENT_STATUS.PENDENTE

  useEffect(() => {
    if (!pending) {
      onResolved(pagamento)
      return
    }
    const timer = setInterval(async () => {
      try {
        setPagamento(await getPayment(pagamento.id))
      } catch {
        // Falha pontual de rede — tenta de novo no próximo ciclo
      }
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [pending, pagamento, onResolved])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pagamento.qr_code)
      toast.success('Código PIX copiado', { description: 'Cole no app do seu banco, em "Pix Copia e Cola".' })
    } catch {
      toast.error('Não foi possível copiar. Selecione o código e copie manualmente.')
    }
  }

  if (expired) {
    return (
      <div className="py-6 text-center">
        <TimerOff className="mx-auto mb-4 h-12 w-12 text-muted-foreground" aria-hidden="true" />
        <p className="mb-2 text-lg font-medium">O prazo para pagar este PIX acabou</p>
        <p className="mb-6 text-muted-foreground">
          Pedidos não pagos são cancelados e a data volta a ficar disponível. Se ainda quiser os doces, é só
          fazer um novo pedido.
        </p>
        <Button as={Link} to="/vitrine" variant="outline">
          Voltar ao cardápio
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center text-center">
      <p className="mb-1 text-sm text-muted-foreground">Pague em até</p>
      <p className="mb-5 font-serif text-3xl tabular-nums" aria-live="off">
        {formatCountdown(secondsLeft)}
      </p>

      {pagamento.qr_code_base64 ? (
        <img
          src={`data:image/png;base64,${pagamento.qr_code_base64}`}
          alt="QR Code para pagamento via PIX"
          className="mb-5 h-52 w-52 rounded-lg border bg-white p-2 md:h-60 md:w-60"
        />
      ) : (
        pagamento.ticket_url && (
          <a href={pagamento.ticket_url} target="_blank" rel="noreferrer" className="mb-5 underline">
            Abrir QR Code do PIX
          </a>
        )
      )}

      <ol className="mb-5 space-y-1 text-left text-sm text-muted-foreground">
        <li>1. Abra o app do seu banco e escolha pagar com PIX.</li>
        <li>2. Escaneie o QR Code ou use o “Pix Copia e Cola”.</li>
        <li>3. Confirme — esta tela atualiza sozinha.</li>
      </ol>

      <label htmlFor="pix-code" className="sr-only">
        Código Pix Copia e Cola
      </label>
      <input
        id="pix-code"
        readOnly
        value={pagamento.qr_code ?? ''}
        onFocus={(e) => e.target.select()}
        className="mb-3 w-full truncate rounded-lg border-2 bg-muted px-3 py-2 font-mono text-xs"
      />
      <Button variant="gold" size="lg" className="w-full" onClick={copy}>
        <Copy className="h-4 w-4" aria-hidden="true" />
        Copiar código PIX
      </Button>

      <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground" role="status">
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        Aguardando a confirmação do pagamento…
      </p>
    </div>
  )
}