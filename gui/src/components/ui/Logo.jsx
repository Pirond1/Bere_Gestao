import icon from '../../assets/logo/dona_bere_icone.svg'
import iconDark from '../../assets/logo/dona_bere_icone_escuro.svg'
import fullDark from '../../assets/logo/dona_bere_logo_fundo_escuro.webp'
import fullLight from '../../assets/logo/dona_bere_logo_principal.webp'
import horizontalDark from '../../assets/logo/dona_bere_logo_horizontal_escuro.svg'
import horizontalLight from '../../assets/logo/dona_bere_logo_horizontal.svg'
import { cn } from '../../utils/cn'

const BRAND = 'Dona Berê Doces'

/** Símbolo (losango com estrelas), sem texto. Decorativo por padrão. `onDark` adiciona contorno dourado. */
export function BrandIcon({ onDark = false, className, alt = '' }) {
  return (
    <img
      src={onDark ? iconDark : icon}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      className={cn('w-auto', className)}
    />
  )
}

/** Logo em linha para headers. `onDark` usa a versão com contorno dourado. */
export function LogoHorizontal({ onDark = false, className }) {
  return (
    <img
      src={onDark ? horizontalDark : horizontalLight}
      alt={BRAND}
      width={1600}
      height={400}
      className={cn('w-auto', className)}
    />
  )
}

/** Logo completo com ornamentos. `onDark` troca os ornamentos pretos pelos dourados. */
export function LogoFull({ onDark = false, className }) {
  return (
    <img
      src={onDark ? fullDark : fullLight}
      alt={BRAND}
      width={1000}
      height={744}
      className={cn('w-auto', className)}
    />
  )
}