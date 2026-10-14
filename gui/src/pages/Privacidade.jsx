import { ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { Card } from '../components/ui/Card'
import { usePaymentDeadline } from '../hooks/usePaymentDeadline'
import { getPublicSettings } from '../services/settingsService'
import { TERMOS_VERSAO } from '../utils/lgpd'

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-foreground/90">{children}</div>
    </section>
  )
}

/** Política de Privacidade e Termos de Uso (LGPD — BG-20). Pública: dá para ler antes de criar a conta. */
export function Privacidade() {
  const prazo = usePaymentDeadline()
  const [contato, setContato] = useState(null)

  useEffect(() => {
    getPublicSettings()
      .then((c) => setContato(c.email_resposta))
      .catch(() => {})
  }, [])

  const canal = contato ? (
    <a href={`mailto:${contato}`} className="font-medium underline">
      {contato}
    </a>
  ) : (
    'os canais de atendimento da loja'
  )

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      <header className="mb-8">
        <p className="mb-2 flex items-center gap-2 text-sm text-gold-dark">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Versão {TERMOS_VERSAO}
        </p>
        <h1 className="mb-2 text-3xl md:text-4xl">Privacidade e Termos de Uso</h1>
        <p className="text-muted-foreground">
          Como a Dona Berê Doces cuida dos seus dados, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), e
          as regras para encomendar pelo site.
        </p>
      </header>

      <Card className="space-y-8 p-5 md:p-8">
        <Section title="1. Quem cuida dos seus dados">
          <p>
            A <strong>Dona Berê Doces</strong>, confeitaria artesanal de Presidente Prudente/SP, é a controladora dos
            dados tratados neste site. Para qualquer assunto sobre seus dados, fale com a gente por {canal}.
          </p>
        </Section>

        <Section title="2. Quais dados coletamos">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Cadastro:</strong> nome, CPF, e-mail, telefone (WhatsApp) e, se você quiser, data de nascimento e
              endereço.
            </li>
            <li>
              <strong>Pedidos:</strong> produtos, quantidades, valores, data de retirada e observações.
            </li>
            <li>
              <strong>Pagamentos:</strong> forma de pagamento, valor e situação. Os dados do cartão são digitados direto
              no Mercado Pago — <strong>a loja não vê nem guarda o número do seu cartão</strong>.
            </li>
            <li>
              <strong>Avaliações:</strong> a nota e o comentário que você deixar depois de retirar um pedido.
            </li>
            <li>
              <strong>Senha:</strong> guardada só de forma criptografada (hash) — nem a loja consegue lê-la.
            </li>
          </ul>
          <p>
            No seu navegador ficam apenas o carrinho, a sessão de acesso e os arquivos do app (para abrir mais rápido).
            Não usamos cookies de propaganda nem de rastreamento.
          </p>
        </Section>

        <Section title="3. Para que usamos">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Criar sua conta, receber, produzir e entregar na retirada os seus pedidos, e processar o pagamento
              (execução do contrato — art. 7º, V).
            </li>
            <li>
              Avisar quando o pedido estiver pronto e falar com você sobre ele, pelo WhatsApp ou e-mail (execução do
              contrato).
            </li>
            <li>Enviar códigos de confirmação de e-mail e de recuperação de senha (segurança da sua conta).</li>
            <li>
              Guardar o registro das vendas exigido pela legislação fiscal (obrigação legal — art. 7º, II).
            </li>
            <li>
              Entender a satisfação dos clientes (avaliações) e melhorar os produtos, em relatórios internos (legítimo
              interesse — art. 7º, IX).
            </li>
          </ul>
          <p>Não vendemos seus dados e não enviamos propaganda sem você pedir.</p>
        </Section>

        <Section title="4. Com quem compartilhamos">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Mercado Pago</strong> — para processar o pagamento (nome, e-mail, CPF e valor).
            </li>
            <li>
              <strong>Serviço de e-mail</strong> — para entregar os códigos e avisos no seu e-mail.
            </li>
            <li>
              <strong>ViaCEP</strong> — recebe só o CEP digitado, para preencher o endereço automaticamente.
            </li>
            <li>
              <strong>Hospedagem do site</strong> — onde o sistema e o banco de dados ficam guardados.
            </li>
          </ul>
        </Section>

        <Section title="5. Por quanto tempo guardamos">
          <p>
            Enquanto sua conta existir. Se você excluir a conta, apagamos nome, CPF, telefone, data de nascimento,
            endereço e e-mail. Os pedidos continuam no histórico da loja <strong>sem identificar você</strong>, porque
            fazem parte da contabilidade. Códigos enviados por e-mail valem por 15 minutos.
          </p>
        </Section>

        <Section title="6. Como protegemos">
          <p>
            Senhas com criptografia (hash), códigos de verificação que não ficam gravados, conexão segura (HTTPS),
            confirmação por e-mail para criar a conta ou trocar o e-mail, e acesso ao painel da loja só para a
            proprietária. Trocar a senha desconecta os outros aparelhos.
          </p>
        </Section>

        <Section title="7. Seus direitos">
          <p>Pela LGPD (art. 18) você pode, a qualquer momento:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Ver e baixar seus dados</strong> — em Minha conta › Privacidade › Baixar meus dados.
            </li>
            <li>
              <strong>Corrigir seus dados</strong> — em Minha conta (nome, telefone, CPF, e-mail, endereço).
            </li>
            <li>
              <strong>Excluir sua conta</strong> — em Minha conta › Privacidade › Excluir minha conta.
            </li>
            <li>Saber com quem seus dados são compartilhados (item 4) e tirar dúvidas por {canal}.</li>
            <li>
              Reclamar na Autoridade Nacional de Proteção de Dados (ANPD), se achar que seus direitos não foram
              respeitados.
            </li>
          </ul>
        </Section>

        <Section title="8. Termos de uso — como funcionam as encomendas">
          <ul className="list-disc space-y-1 pl-5">
            <li>Os pedidos são retirados na loja, na data escolhida. Não fazemos entregas.</li>
            <li>
              Cada dia tem um limite de pedidos; a data escolhida fica reservada enquanto você paga. Sem pagamento em{' '}
              {prazo}, o pedido é cancelado e a data volta a ficar livre.
            </li>
            <li>O pagamento é por PIX ou cartão de crédito à vista, pelo Mercado Pago.</li>
            <li>
              Você pode cancelar pelo site até o pedido entrar em produção; se já estiver pago, o valor é estornado
              automaticamente. Depois disso, fale com a loja.
            </li>
            <li>
              Se a loja precisar cancelar um pedido pago, o valor é estornado e o motivo aparece no seu pedido.
            </li>
            <li>Você é responsável pela veracidade dos dados informados e pelo sigilo da sua senha.</li>
          </ul>
        </Section>

        <Section title="9. Mudanças nesta política">
          <p>
            Se esta política mudar, avisaremos no site e pediremos que você aceite a nova versão no próximo acesso.
          </p>
        </Section>
      </Card>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link to="/" className="underline hover:text-chocolate">
          Voltar para a loja
        </Link>
      </p>
    </div>
  )
}
