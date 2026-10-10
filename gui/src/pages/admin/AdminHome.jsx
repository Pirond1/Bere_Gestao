import { CalendarDays, ClipboardList, Package, Star, Users } from 'lucide-react'

import { Card } from '../../components/ui/Card'

// Módulos previstos na ERS — cada um vira uma página nas próximas tarefas
const modules = [
  { icon: ClipboardList, title: 'Pedidos', text: 'Acompanhe e atualize o status das encomendas.' },
  { icon: CalendarDays, title: 'Agenda', text: 'Defina a capacidade de produção e bloqueie datas.' },
  { icon: Package, title: 'Produtos', text: 'Cadastre itens, preços, fotos e disponibilidade.' },
  { icon: Users, title: 'Clientes', text: 'Consulte o cadastro das clientes.' },
  { icon: Star, title: 'Vendas e NPS', text: 'Dashboard de vendas e satisfação.' },
]

export function AdminHome() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="mb-2 text-3xl">Olá! 👋</h1>
        <p className="text-muted-foreground">Este é o painel de gestão da Dona Berê Doces.</p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map(({ icon: Icon, title, text }) => (
          <Card key={title} className="p-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-gold/15">
              <Icon className="h-5 w-5 text-gold-dark" aria-hidden="true" />
            </div>
            <h2 className="mb-1 text-xl">{title}</h2>
            <p className="mb-3 text-sm text-muted-foreground">{text}</p>
            <span className="text-xs font-medium uppercase tracking-wider text-terracotta">Em breve</span>
          </Card>
        ))}
      </div>
    </div>
  )
}