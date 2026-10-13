import { formatDateLong, toDateKey } from './date'

/** Link do WhatsApp para um telefone brasileiro, opcionalmente com a mensagem já escrita. */
export function whatsappLink(telefone, texto) {
  const url = `https://wa.me/55${telefone.replace(/\D/g, '')}`
  return texto ? `${url}?text=${encodeURIComponent(texto)}` : url
}

/**
 * Aviso de pedido pronto. Endereço e horário da loja vêm de `configuracoes`
 * e só entram na mensagem quando estão preenchidos.
 */
export function readyOrderMessage(pedido, configuracao) {
  const primeiroNome = pedido.cliente.nome.trim().split(/\s+/)[0]
  const hoje = pedido.data_retirada === toDateKey(new Date())
  const quando = hoje
    ? 'A retirada é hoje.'
    : `A retirada está marcada para ${formatDateLong(pedido.data_retirada).toLowerCase()}.`

  const linhas = [
    `Olá, ${primeiroNome}! Aqui é da Dona Berê Doces.`,
    `Seu pedido nº ${pedido.id} está pronto! ${quando}`,
  ]
  if (configuracao?.endereco_retirada) linhas.push(`Endereço: ${configuracao.endereco_retirada}`)
  if (configuracao?.horario_retirada) linhas.push(`Horário de retirada: ${configuracao.horario_retirada}`)
  linhas.push('Te esperamos!')
  return linhas.join('\n')
}