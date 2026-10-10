import { Link } from 'react-router'

import { Button } from '../components/ui/Button'
import { BrandIcon } from '../components/ui/Logo'

export function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <BrandIcon className="mb-6 h-24 opacity-80" />
      <h1 className="mb-3 text-3xl">Página não encontrada</h1>
      <p className="mb-8 text-muted-foreground">O endereço que você acessou não existe ou foi removido.</p>
      <Button as={Link} to="/">
        Voltar ao início
      </Button>
    </div>
  )
}