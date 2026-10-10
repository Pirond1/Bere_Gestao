import { Card } from '../ui/Card'
import { BrandIcon } from '../ui/Logo'

// Moldura comum das telas de login e cadastro
export function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-4 py-10 md:py-16">
      <div className="mb-8 flex flex-col items-center text-center">
        <BrandIcon className="mb-5 h-20" />
        <h1 className="mb-2 text-3xl md:text-4xl">{title}</h1>
        {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
      </div>

      <Card className="border-2 border-gold/20 p-6 md:p-8">{children}</Card>

      {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
    </div>
  )
}