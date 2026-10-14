# CLAUDE.md

> Contexto do projeto **Berê Gestão** para o Claude Code.
> Leia este arquivo antes de começar qualquer tarefa.

---

## Sobre o projeto

**Berê Gestão** é o TCC do curso de Sistemas de Informação (Presidente Prudente, 2026).
É uma plataforma de e-commerce e gestão para a confeitaria artesanal **Dona Berê Doces**, substituindo a agenda física e o atendimento manual da dona da loja.

O sistema atende dois perfis:
- **Cliente** — vitrine, pedido, pagamento e avaliação NPS
- **Administrador** — tudo acima + dashboard, gestão de pedidos, produtos e clientes

A documentação completa de requisitos está em `docs/ERS.docx` (consulte sempre que precisar entender o "porquê" de um requisito).

---

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Python 3.12 + FastAPI |
| Frontend | React + Vite (PWA mobile-first) |
| Banco | MySQL 8 (SQLAlchemy + Alembic) |
| Auth | JWT (python-jose + passlib) |
| Pagamento | Mercado Pago (será integrado depois) |
| Dev | Docker Compose (api + db) |

---

## Estrutura

```
Berê_Gestão/
├── docker-compose.yml
├── .env                    # variáveis sensíveis (NÃO commitar)
├── api/                    # FastAPI
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py         # entrypoint
│       ├── core/           # config, security, dependencies
│       ├── db/             # session, base, migrations (Alembic)
│       ├── models/         # SQLAlchemy
│       ├── schemas/        # Pydantic
│       ├── routers/        # endpoints
│       └── services/       # lógica de negócio
└── gui/                    # React PWA
    └── src/
        ├── pages/cliente/  # Vitrine, Pedido, Pagamento, Avaliacao
        └── pages/admin/    # Dashboard, Pedidos, Produtos, Clientes, RelatorioNPS
```

---

## Entidades do banco (a partir da ERS)

- **Cliente** — CPF, nome, e-mail, telefone, endereço (CEP, rua, número, complemento, bairro, cidade, UF), senha (hash). LGPD aplicável.
- **Administrador** — login, senha (hash). Perfil com acesso total.
- **Produto** — nome, descrição, preço, categoria, foto, disponibilidade.
- **Pedido** — cliente, agenda (data de retirada), status, data do pedido, valor total, observações. A forma de pagamento fica na entidade Pagamento (BG-5), conforme o diagrama ER.
- **ItemPedido** — pedido, produto, quantidade, preço unitário no momento do pedido, subtotal.
- **Avaliacao** — pedido, nota NPS (0-10), comentário, data. Uma por pedido, só após a entrega.
- **Agenda** — data, capacidade máxima, pedidos registrados, bloqueada. Controla a capacidade produtiva do dia (RF_F01).
- **StatusPedido** — tabela de lookup com seed: `aguardando_pagamento`, `confirmado`, `em_producao`, `pronto`, `entregue`, `cancelado`.
- **Configuracao** — tabela de linha única com os parâmetros que a proprietária edita pelo painel (capacidade produtiva padrão e antecedência mínima).

---

## Convenções de modelagem (SQLAlchemy + Alembic)

- Nomes de **tabelas em snake_case e plural** (`clientes`, `pedidos`, `itens_pedido`).
- Nomes de **classes em PascalCase e singular** (`Cliente`, `Pedido`, `ItemPedido`).
- Toda tabela tem: `id` (PK, autoincremento), `created_at`, `updated_at`.
- Senhas sempre em **hash bcrypt** — nunca em texto puro.
- Status de pedido como **tabela de lookup** (`status_pedido`) com migration de seed, seguindo o diagrama ER e o padrão de `tipos_usuario`. As descrições ficam como constantes em `services/status_pedido_service.py` — nunca string solta no código.
- Use `relationship` e `back_populates` corretamente nos relacionamentos.
- Migrations descritivas em PT-BR: `alembic revision --autogenerate -m "cria tabela clientes"`.

### Workflow de migrations (dentro do Docker)

```bash
# Inicializar Alembic (apenas uma vez)
docker exec -it bere_api alembic init app/db/migrations

# A cada novo model ou alteração
docker exec -it bere_api alembic revision --autogenerate -m "descricao"

# Aplicar
docker exec -it bere_api alembic upgrade head

# Reverter última migration (se precisar)
docker exec -it bere_api alembic downgrade -1
```

> **Importante:** sempre revisar a migration gerada antes de aplicar — o `--autogenerate` nem sempre acerta tudo.

---

## Convenções do frontend (React + Vite)

- Componentes reutilizáveis em `components/ui/` e `components/layout/`.
- Páginas separadas por perfil: `pages/cliente/` e `pages/admin/`.
- Estado global via Context API (`AuthContext`, `CarrinhoContext`).
- Chamadas à API centralizadas em `services/` via Axios.
- Rotas protegidas por perfil em `routes/`.
- Mobile-first — PWA, pensar em telas pequenas primeiro.
- Paleta da marca: tons de marrom e dourado.

---

## Convenções de código

Mantenha leve, mas siga:

### Nomenclatura
- **Código (variáveis, funções, classes, arquivos):** inglês
- **Comentários e docstrings:** PT-BR
- **Mensagens de erro/usuário (raise HTTPException, validações):** PT-BR
- **Banco (tabelas, colunas):** PT-BR snake_case (`data_pedido`, `valor_total`)

### Python
- Use type hints sempre que possível.
- Pydantic para validação — modelos de entrada (`...Create`), saída (`...Read`) e atualização (`...Update`) separados.
- Lógica de negócio em `services/`, não em `routers/`.

### Git
- Commits em PT-BR, padrão simples: `tipo: descrição`
- Tipos comuns: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`
- Exemplo: `feat: cria model Cliente com validacao de CPF`

---

## Como rodar

```powershell
# Subir tudo
docker-compose up

# Rebuild (após mudar requirements.txt)
docker-compose up --build

# Derrubar
docker-compose down

# Reset total do banco (cuidado!)
docker-compose down -v

# Testes automatizados (SQLite em memória — não toca no banco real)
docker exec bere_api pytest
```

- **API:** http://localhost:8000
- **Docs Swagger:** http://localhost:8000/docs
- **MySQL:** localhost:3306 (user: `bere_user`, db: `bere_gestao`)
- **Mailpit (e-mails de desenvolvimento):** http://localhost:8025 — recebe todos os e-mails enviados pela API (códigos de cadastro, recuperação de senha). Em produção, configurar `SMTP_*` no `.env`.

---

## Requisitos funcionais (referência rápida)

| ID | Função | Perfil |
|---|---|---|
| RF_B01 | Gerenciar Cliente (CRUD + validação CPF/CEP) | Admin |
| RF_B02 | Gerenciar Produtos + vitrine | Admin / Cliente |
| RF_F01 | Realizar Pedido / Agendamento | Cliente |
| RF_F02 | Processar Pagamento (PIX e Cartão) | Cliente |
| RF_S01 | Dashboard de Vendas | Admin |
| RF_S02 | Relatório NPS | Admin |

---

## Restrições importantes

- **LGPD** — dados pessoais de clientes (CPF, endereço, telefone) precisam ser tratados com cuidado. Senhas sempre hashed.
- **Capacidade produtiva** — o agendamento (RF_F01) respeita a quantidade de **pedidos por dia**, controlada em `services/agendamento_service.py`. Dias não cadastrados usam a capacidade padrão da tabela `configuracoes`; o admin pode sobrescrever a capacidade de uma data ou bloqueá-la (folga/feriado). Cancelar um pedido devolve a vaga.
- **Mobile-first** — o frontend é PWA, então pensar em telas pequenas primeiro.

---

## Fora do escopo (v1.0)

Não implementar agora — está fora do escopo do TCC:
- Controle de estoque de insumos
- Integração com APIs de entrega
- Múltiplas unidades / franquias

---

## Como me ajudar (Claude Code)

1. **Antes de criar arquivos novos**, confira a estrutura acima.
2. **Antes de inventar regra de negócio**, pergunte ou consulte `docs/ERS.docx`.
3. **Quando criar um model**, lembre de gerar a migration logo em seguida.
4. **Após mudar `requirements.txt`**, avise que é preciso `docker-compose up --build`.
5. **Não commitar** arquivos sensíveis (`.env`, logs, `.idea/`).
6. **Em caso de dúvida**, prefira perguntar a assumir.

---

## Fluxo de tarefas (convenção do projeto)

Quando o usuário pedir um conjunto de funcionalidades (ex: "cria os CRUDs básicos"):

1. **Registrar a tarefa em `TASKS.md`** com ID sequencial no formato `BG-N` e descrição resumida.
2. **Trabalhar incrementalmente**, explicando cada etapa.
3. **Ao concluir**, trazer um resumo do que foi feito para o usuário fazer o commit — nunca sugerir o commit diretamente.
4. **Marcar a tarefa como concluída** atualizando o status em `TASKS.md`.

> `TASKS.md` está no `.gitignore` — persiste localmente mas não é commitado. Ao iniciar uma sessão, leia `TASKS.md` para verificar se há tarefas em andamento.