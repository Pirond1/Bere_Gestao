# Berê Gestão

> Plataforma de e-commerce e gestão para a confeitaria artesanal **Dona Berê Doces**, em produção.
> TCC de Sistemas de Informação · Gustavo Pirondi · Presidente Prudente, 2026

🌐 **No ar:** [donaberedoces.com.br](https://donaberedoces.com.br)

<!-- Prints: coloque as imagens em docs/prints/ e descomente a tabela abaixo.
| Vitrine (celular) | Checkout | Dashboard |
|---|---|---|
| ![Vitrine](docs/prints/vitrine.png) | ![Checkout](docs/prints/checkout.png) | ![Dashboard](docs/prints/dashboard.png) |
-->

---

## Sobre o projeto

O **Berê Gestão** substitui a agenda física e o atendimento manual da confeitaria. O cliente faz o pedido e paga pelo celular, e a proprietária controla a produção e as vendas por um painel:

- **Vitrine digital** com catálogo de produtos
- **Agendamento por capacidade produtiva**: cada dia aceita um número limitado de pedidos, com dias bloqueáveis (folgas e feriados), e cancelar um pedido devolve a vaga
- **Checkout automatizado** com PIX e cartão (Mercado Pago), com confirmação de pagamento por webhook
- **Painel administrativo** com dashboard de vendas e relatório NPS

O sistema é um PWA (*Progressive Web App*) mobile-first, com a identidade visual da marca.

---

## Destaques técnicos

- **Em produção** numa VPS com Docker Compose e Caddy (HTTPS automático). Só as portas 80 e 443 ficam expostas; banco e API não aparecem na internet.
- **Pagamentos reais** via Mercado Pago: PIX e cartão, webhook com validação de assinatura e estorno ao cancelar.
- **Backup automático** diário e semanal, com retenção configurável, restauração assistida e cópia criptografada fora do servidor (rclone + Google Drive).
- **LGPD**: senhas em bcrypt, dados pessoais fora do git e backups criptografados.
- **42 testes automatizados** (pytest) cobrindo agenda, pagamento, relatórios, segurança e backup.
- **Migrações versionadas** com Alembic e autenticação JWT com rotas protegidas por perfil.

---

## Como foi desenvolvido

O projeto foi construído usando IA (Claude Code) como ferramenta central de desenvolvimento, com um processo definido para manter controle sobre o que era gerado:

- **Contexto do projeto versionado** no [`CLAUDE.md`](CLAUDE.md): stack, entidades, convenções de código e de banco, restrições (LGPD, capacidade produtiva) e o que está fora do escopo.
- **Requisitos como fonte da verdade**: a ERS (`docs/`) define as regras de negócio, e a IA consulta a ERS ou pergunta em vez de inventar regra.
- **Trabalho em tarefas pequenas** (cards `BG-N`), feitas de forma incremental e explicadas etapa por etapa.
- **Revisão humana em todo passo**: cada entrega volta como resumo para revisão antes do commit, e as migrations geradas automaticamente são conferidas antes de aplicar.
- **Testes automatizados** validando as regras críticas (agenda, pagamento, segurança).

---

## Stack tecnológica

| Camada | Tecnologia |
|---|---|
| Backend | Python 3.12 + FastAPI |
| Frontend | React + Vite (PWA) |
| Banco de dados | MySQL (SQLAlchemy + Alembic) |
| Autenticação | JWT |
| Pagamento | Mercado Pago API |
| E-mail | Brevo (SMTP) |
| Hospedagem | VPS com Docker Compose + Caddy (HTTPS automático) |

---

## Requisitos funcionais implementados

| ID | Função | Perfil |
|---|---|---|
| RF_B01 | Gerenciar Cliente (CRUD + validação CPF/CEP) | Administrador |
| RF_B02 | Gerenciar Produtos (CRUD + vitrine digital) | Administrador / Cliente |
| RF_F01 | Realizar Pedido / Agendamento | Cliente |
| RF_F02 | Processar Pagamento (PIX e Cartão) | Cliente |
| RF_S01 | Dashboard de Vendas | Administrador |
| RF_S02 | Relatório NPS | Administrador |

---

## Perfis de acesso

| Perfil | Acesso |
|---|---|
| **Cliente** | Vitrine, pedido, pagamento e avaliação NPS |
| **Administrador** | Tudo acima + painel de gestão completo |

---

## Requisitos adiados (fora do escopo v1.0)

- Módulo de controle de estoque de insumos
- Integração com APIs de entrega
- Suporte a múltiplas unidades / franquias

---

## Estrutura do repositório

```
Bere_Gestao/
├── api/                  # Backend FastAPI
│   ├── app/
│   │   ├── core/         # Configurações, segurança (JWT), dependências
│   │   ├── db/           # Engine, sessão e migrations (Alembic)
│   │   ├── models/       # Modelos SQLAlchemy (cliente, produto, pedido, avaliacao)
│   │   ├── schemas/      # Schemas Pydantic (validação de entrada/saída)
│   │   ├── routers/      # Endpoints (clientes, produtos, pedidos, pagamentos, relatorios)
│   │   ├── services/     # Lógica de negócio (agendamento, pagamento, nps, dashboard)
│   │   └── main.py       # Entrypoint da aplicação
│   ├── tests/
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── gui/                  # Frontend React (PWA)
│   ├── public/           # manifest.json, ícones PWA
│   └── src/
│       ├── assets/       # Logos e fontes da marca
│       ├── components/   # Componentes reutilizáveis (ui/, layout/)
│       ├── pages/
│       │   ├── cliente/  # Vitrine, Pedido, Pagamento, Avaliacao
│       │   └── admin/    # Dashboard, Pedidos, Produtos, Clientes, RelatorioNPS
│       ├── services/     # Chamadas à API (axios)
│       ├── context/      # AuthContext, CarrinhoContext
│       ├── hooks/        # useAuth, useCarrinho
│       ├── routes/       # React Router (rotas protegidas por perfil)
│       └── utils/        # Formatadores, validadores (CPF, CEP)
│
├── docs/                 # ERS, diagramas e protótipos
└── README.md
```

---

## Como rodar localmente

### 1. Clone o repositório

```bash
git clone https://github.com/Pirond1/Bere_Gestao.git
cd Bere_Gestao
```

### 2. Configure e suba a API

```bash
cd api

# Crie e ative o ambiente virtual
python -m venv venv
source venv/bin/activate      # Linux/macOS
venv\Scripts\activate         # Windows

# Instale as dependências
pip install -r requirements.txt

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais (veja a seção Variáveis de Ambiente)

# Rode as migrations
alembic upgrade head

# Inicie o servidor
uvicorn app.main:app --reload
```

A API estará disponível em `http://localhost:8000`.  
Documentação interativa: `http://localhost:8000/docs`

### 3. Configure e suba o GUI

```bash
# Em outro terminal, a partir da raiz do projeto
cd gui

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Defina VITE_API_URL=http://localhost:8000

# Inicie o servidor de desenvolvimento
npm run dev
```

O frontend estará disponível em `http://localhost:5173`.

---

## Variáveis de ambiente

### `api/.env`

```env
# Banco de dados
DATABASE_URL=mysql+pymysql://usuario:senha@localhost:3306/bere_gestao

# Segurança
SECRET_KEY=sua_chave_secreta_aqui
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=seu_token_de_sandbox
```

### `gui/.env`

```env
VITE_API_URL=http://localhost:8000
```

---

## Deploy e backup

O passo a passo de produção (domínio, VPS, e-mail, Mercado Pago, HTTPS) e a configuração de backup estão em **[docs/DEPLOY.md](docs/DEPLOY.md)**.

---

## Conformidade

Este sistema foi desenvolvido em conformidade com a **LGPD** (Lei Geral de Proteção de Dados — Lei nº 13.709/2018) no que diz respeito ao armazenamento e tratamento dos dados pessoais dos clientes cadastrados.

---

## Autor

**Gustavo Pirondi** · [LinkedIn](https://www.linkedin.com/in/gustavopirondi/) · [GitHub](https://github.com/Pirond1)
Sistemas de Informação · Centro Universitário Toledo Prudente · 2026
