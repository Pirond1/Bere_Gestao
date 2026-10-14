# Berê Gestão

> Plataforma de e-commerce e gestão para a confeitaria artesanal **Dona Berê Doces**.  
> TCC — Sistemas de Informação | Gustavo Pirondi | Presidente Prudente · 2026

---

## Sobre o projeto

O **Berê Gestão** substitui a agenda física e o atendimento manual da confeitaria, oferecendo:

- **Vitrine digital** com catálogo de produtos
- **Agendamento inteligente** baseado na capacidade produtiva
- **Checkout automatizado** com pagamento via PIX e Cartão (Mercado Pago)
- **Painel administrativo** com dashboard de vendas e relatório NPS

O sistema é um PWA (*Progressive Web App*) com foco em dispositivos móveis, seguindo a identidade visual da marca (paleta marrom e dourada).

---

## Stack tecnológica

| Camada | Tecnologia |
|---|---|
| Backend | Python 3.12 + FastAPI |
| Frontend | React + Vite (PWA) |
| Banco de dados | MySQL (SQLAlchemy + Alembic) |
| Autenticação | JWT |
| Pagamento | Mercado Pago API |
| Hospedagem | AWS / Vercel |

---

## Estrutura do repositório

```
Berê_Gestão/
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

## Pré-requisitos

- **Python** 3.12+
- **Node.js** 20+
- **MySQL** 8.0+
- Conta no **Mercado Pago** (para obter as credenciais de sandbox)

---

## Como rodar localmente

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/bere-gestao.git
cd bere-gestao
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

## Backup

O container `bere_backup` sobe junto com o `docker-compose up` e faz, **todo dia às 03:00** (horário de Brasília), um backup do banco e das fotos dos produtos num único arquivo `.tar.gz`, na pasta `backups/` (fora do git, porque tem dados pessoais de clientes). Na primeira subida ele já faz um backup na hora. O painel admin mostra quando foi o último backup na Visão geral.

- **Retenção:** últimos 7 backups diários (`backups/diarios/`) e 4 semanais, feitos aos domingos (`backups/semanais/`).
- **Backup manual:** `docker exec bere_backup backup agora`
- **Restaurar:** `docker exec -it bere_backup restaurar diarios/bere_2026-10-14_0300.tar.gz`. **Substitui todo o banco e as fotos**, por isso pede que você digite `RESTAURAR` para confirmar. Sem argumento, lista os backups disponíveis.
- **Logs:** `docker logs bere_backup`

Variáveis opcionais no `.env`: `BACKUP_HORARIO` (padrão `03:00`), `BACKUP_DIAS` (padrão `7`), `BACKUP_SEMANAS` (padrão `4`) e `BACKUP_REMOTO` (ver abaixo).

### Cópia fora do servidor (Google Drive)

Se o backup ficar só no servidor, perder a VPS significa perder o backup junto. Com o [rclone](https://rclone.org), cada backup também é enviado para o Drive:

1. No seu computador, instale o rclone (`winget install Rclone.Rclone`) e rode `rclone config`:
   - `n` (novo remote), nome `drive`, tipo `drive` (Google Drive). Nas perguntas seguintes, aceite os padrões e autorize no navegador quando ele abrir.
   - **Recomendado (LGPD):** crie um segundo remote, nome `drive-cripto`, tipo `crypt`, apontando para `drive:bere-backups` e com uma senha forte. Os arquivos vão criptografados para o Drive. **Guarde essa senha fora do servidor:** sem ela, o backup não pode ser lido.
2. Copie o arquivo gerado (`rclone config file` mostra onde ele está) para `backup/config/rclone.conf`. A pasta é ignorada pelo git.
3. No `.env`, coloque `BACKUP_REMOTO=drive-cripto:` (ou `BACKUP_REMOTO=drive:bere-backups`, sem criptografia) e rode `docker-compose up -d backup`.
4. Teste com `docker exec bere_backup backup agora`. O painel passa a mostrar "Cópia guardada fora do servidor".

No Drive, as pastas `diarios/` e `semanais/` seguem a mesma retenção. Os arquivos antigos são apagados pela idade, nunca espelhando a pasta local: se o disco do servidor se perder, as cópias do Drive continuam lá. Para restaurar a partir do Drive, baixe o arquivo para `backups/` e use o `restaurar` normalmente (com criptografia: `rclone copy drive-cripto:diarios/<arquivo> backups/`).

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

## Conformidade

Este sistema foi desenvolvido em conformidade com a **LGPD** (Lei Geral de Proteção de Dados — Lei nº 13.709/2018) no que diz respeito ao armazenamento e tratamento dos dados pessoais dos clientes cadastrados.

---

## Autor

**Gustavo Pirondi**  
Curso de Sistemas de Informação  
Presidente Prudente · 2026