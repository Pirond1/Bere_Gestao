import { Clock, CreditCard, Lock, Mail, MapPin, Store } from 'lucide-react'
import { SiFacebook, SiInstagram, SiMercadopago, SiPix, SiTiktok, SiWhatsapp } from 'react-icons/si'
import { Link } from 'react-router'

import { useAsync } from '../../hooks/useAsync'
import { useAuth } from '../../hooks/useAuth'
import { listCategories } from '../../services/productService'
import { getPublicSettings } from '../../services/settingsService'
import { maskCnpj, maskPhone } from '../../utils/format'
import { whatsappLink } from '../../utils/whatsapp'
import { LogoHorizontal } from '../ui/Logo'

const linkClass = 'text-sm text-vanilla/80 transition-colors hover:text-gold'

function Column({ title, children }) {
  return (
    <div>
      <h2 className="mb-3 font-sans text-sm font-semibold text-vanilla">{title}</h2>
      <ul className="space-y-2.5">{children}</ul>
    </div>
  )
}

function Badge({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-vanilla/10 px-2.5 py-1.5 text-xs font-medium text-vanilla/90">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {children}
    </span>
  )
}

/**
 * Rodapé da loja (BG-21). Contato, redes e CNPJ vêm de Admin › Configurações —
 * o que estiver vazio não aparece. As categorias são as reais do cardápio.
 */
export function Footer() {
  const { isAuthenticated, isAdmin } = useAuth()
  // Sem resposta da API o rodapé continua, só sem os dados da loja
  const { data: loja } = useAsync(getPublicSettings)
  const { data: categorias } = useAsync(listCategories)

  const redes = [
    loja?.instagram && { icon: SiInstagram, label: 'Instagram', handle: `@${loja.instagram}`, href: `https://www.instagram.com/${loja.instagram}` },
    loja?.tiktok && { icon: SiTiktok, label: 'TikTok', handle: `@${loja.tiktok}`, href: `https://www.tiktok.com/@${loja.tiktok}` },
    loja?.facebook && { icon: SiFacebook, label: 'Facebook', handle: loja.facebook, href: `https://www.facebook.com/${loja.facebook}` },
  ].filter(Boolean)

  return (
    <footer className="mt-16 bg-chocolate text-vanilla">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-4 py-12 md:grid-cols-4">
        {/* Marca e contato */}
        <div className="col-span-2 md:col-span-1">
          <Link to="/" aria-label="Dona Berê Doces — início" className="mb-5 inline-block">
            <LogoHorizontal onDark className="h-12" />
          </Link>
          <h2 className="mb-3 font-sans text-sm font-semibold">Fale com a gente</h2>
          <ul className="space-y-2 text-sm text-vanilla/80">
            {loja?.horario_retirada && (
              <li className="flex gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
                Retirada {loja.horario_retirada}
              </li>
            )}
            {loja?.endereco_retirada && (
              <li className="flex gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
                {loja.endereco_retirada}
              </li>
            )}
            {loja?.whatsapp_loja && (
              <li>
                <a
                  href={whatsappLink(loja.whatsapp_loja)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex gap-2 underline-offset-4 hover:text-gold hover:underline"
                >
                  <SiWhatsapp className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
                  {maskPhone(loja.whatsapp_loja)}
                </a>
              </li>
            )}
            {loja?.email_resposta && (
              <li>
                <a
                  href={`mailto:${loja.email_resposta}`}
                  className="flex gap-2 break-all underline-offset-4 hover:text-gold hover:underline"
                >
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
                  {loja.email_resposta}
                </a>
              </li>
            )}
          </ul>
        </div>

        <Column title="Cardápio">
          <li>
            <Link to="/vitrine" className={linkClass}>
              Todos os doces
            </Link>
          </li>
          {categorias?.map((c) => (
            <li key={c.id}>
              <Link to={`/vitrine?categoria=${c.id}`} className={linkClass}>
                {c.nome}
              </Link>
            </li>
          ))}
        </Column>

        <Column title="Ajuda">
          {isAuthenticated && !isAdmin && (
            <>
              <li>
                <Link to="/pedidos" className={linkClass}>
                  Meus pedidos
                </Link>
              </li>
              <li>
                <Link to="/conta" className={linkClass}>
                  Minha conta
                </Link>
              </li>
            </>
          )}
          {!isAuthenticated && (
            <li>
              <Link to="/cadastro" className={linkClass}>
                Criar conta
              </Link>
            </li>
          )}
          <li>
            <Link to="/privacidade" className={linkClass}>
              Privacidade e Termos de Uso
            </Link>
          </li>
        </Column>

        {redes.length > 0 && (
          <Column title="Siga a Dona Berê">
            {redes.map(({ icon: Icon, label, handle, href }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${label}: ${handle}`}
                  className={`flex items-center gap-2 ${linkClass}`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{handle}</span>
                </a>
              </li>
            ))}
          </Column>
        )}
      </div>

      {/* Selos: como pagar, como receber e segurança */}
      <div className="mx-auto max-w-6xl border-t border-vanilla/15 px-4 py-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <Badge icon={SiPix}>PIX</Badge>
            <Badge icon={CreditCard}>Cartão de crédito</Badge>
            <Badge icon={SiMercadopago}>Mercado Pago</Badge>
            <Badge icon={Store}>Retirada na loja</Badge>
            <Badge icon={Lock}>Conexão segura</Badge>
          </div>
          {loja?.cnpj && <p className="text-xs text-vanilla/70">CNPJ {maskCnpj(loja.cnpj)}</p>}
        </div>
      </div>

      <div className="border-t border-vanilla/15 px-4 py-5 text-center">
        <Link to="/privacidade" className="mb-2 inline-block text-xs text-vanilla/80 hover:text-gold">
          Privacidade e Termos de Uso
        </Link>
        <p className="text-xs text-vanilla/60">
          © {new Date().getFullYear()} Dona Berê Doces · Confeitaria artesanal · Todos os direitos reservados
        </p>
      </div>
    </footer>
  )
}
