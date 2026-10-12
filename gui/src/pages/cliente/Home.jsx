import { ArrowRight, CalendarCheck, Cake, CakeSlice, Candy, Cookie, Gift, HeartHandshake, QrCode } from 'lucide-react'
import { Link } from 'react-router'

import { ProductCard, ProductCardSkeleton } from '../../components/ProductCard'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { LogoFull } from '../../components/ui/Logo'
import { useAsync } from '../../hooks/useAsync'
import { listCategories, listProducts } from '../../services/productService'

const categoryIcons = [Cake, CakeSlice, Candy, Cookie, Gift]
const PREVIEW_COUNT = 4

const steps = [
  { icon: Cake, title: 'Escolha', text: 'Navegue pelo cardápio e monte seu pedido.' },
  { icon: CalendarCheck, title: 'Agende', text: 'Escolha o dia da retirada entre as datas disponíveis.' },
  { icon: QrCode, title: 'Pague', text: 'Pagamento online por PIX ou cartão, sem complicação.' },
  { icon: HeartHandshake, title: 'Retire', text: 'Seu pedido fica pronto, feito à mão, no dia combinado.' },
]

export function Home() {
  const categories = useAsync(listCategories)
  const products = useAsync(listProducts)

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-chocolate text-vanilla">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(circle at 20% 20%, rgb(196 170 65 / 0.35), transparent 45%), radial-gradient(circle at 85% 80%, rgb(224 120 86 / 0.3), transparent 50%)',
          }}
          aria-hidden="true"
        />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 py-20 text-center md:py-28">
          <h1 className="mb-6">
            <LogoFull onDark className="h-52 md:h-72" />
          </h1>
          <p className="mb-3 font-serif text-xl text-vanilla/90 md:text-2xl">Confeitaria Artesanal</p>
          <p className="mb-10 max-w-xl text-vanilla/75 md:text-lg">
            Bolos, tortas e doces feitos à mão. Encomende online e retire no dia que preferir.
          </p>
          <Button as={Link} to="/vitrine" variant="gold" size="lg">
            Ver cardápio
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
      </section>

      {/* Categorias */}
      {categories.data?.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-14 md:py-20">
          <h2 className="mb-10 text-center text-3xl md:text-4xl">Nossas especialidades</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
            {categories.data.map((category, index) => {
              const Icon = categoryIcons[index % categoryIcons.length]
              return (
                <Card
                  key={category.id}
                  as={Link}
                  to={`/vitrine?categoria=${category.id}`}
                  className="border-2 p-5 text-center transition-all hover:-translate-y-0.5 hover:border-gold hover:shadow-xl md:p-8"
                >
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gold/10 md:h-16 md:w-16">
                    <Icon className="h-7 w-7 text-gold-dark md:h-8 md:w-8" aria-hidden="true" />
                  </div>
                  <h3 className="mb-1 text-lg md:text-xl">{category.nome}</h3>
                  {category.descricao && (
                    <p className="hidden text-sm text-muted-foreground sm:block">{category.descricao}</p>
                  )}
                </Card>
              )
            })}
          </div>
        </section>
      )}

      {/* Prévia do cardápio */}
      <section className="bg-muted/50 py-14 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-10 text-center text-3xl md:text-4xl">Do nosso cardápio</h2>

          {products.error ? (
            <p className="text-center text-muted-foreground">{products.error}</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {products.loading
                ? Array.from({ length: PREVIEW_COUNT }, (_, i) => <ProductCardSkeleton key={i} />)
                : products.data.slice(0, PREVIEW_COUNT).map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
            </div>
          )}

          {products.data?.length === 0 && (
            <p className="text-center text-muted-foreground">Em breve novidades por aqui!</p>
          )}

          <div className="mt-10 text-center">
            <Button as={Link} to="/vitrine" variant="outline">
              Ver cardápio completo
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <h2 className="mb-3 text-center text-3xl md:text-4xl">Como funciona</h2>
        <p className="mx-auto mb-10 max-w-xl text-center text-muted-foreground">
          Sem esperar resposta no WhatsApp: você vê as datas livres e garante seu pedido na hora.
        </p>
        <ol className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ icon: Icon, title, text }, index) => (
            <li key={title} className="flex gap-4 lg:flex-col lg:items-center lg:text-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-chocolate text-gold">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h3 className="mb-1 text-lg">
                  <span className="text-gold-dark">{index + 1}.</span> {title}
                </h3>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}