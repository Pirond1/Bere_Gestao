# Deploy e operação — Berê Gestão

> Guia de produção e manutenção. Para a visão geral do projeto, veja o [README](../README.md).

## Deploy (produção)

Tudo roda numa VPS com o `docker-compose.prod.yml`: MySQL, API, backup e o **Caddy**, que serve o front já compilado e emite/renova sozinho o certificado HTTPS (Let's Encrypt). Só as portas 80 e 443 ficam abertas. O banco e a API não aparecem na internet.

| Endereço | O que é |
|---|---|
| `https://DOMINIO` | Loja e painel (PWA) |
| `https://www.DOMINIO` | Redireciona para o endereço acima |
| `https://api.DOMINIO` | API (Swagger em `/docs`) e webhook do Mercado Pago |

### 1. Domínio e VPS

1. Registre o domínio no [registro.br](https://registro.br). O ideal é no CPF/CNPJ da loja, porque o domínio é dela.
2. Contrate uma VPS com **Ubuntu 24.04**, no mínimo 4 GB de RAM (ex.: Hostinger KVM 1 ou KVM 2), de preferência com datacenter no Brasil.
3. No registro.br, em *DNS*, crie três registros **A** apontando para o IP da VPS: `@` (o próprio domínio), `www` e `api`. A propagação leva de minutos a algumas horas. Confira com `nslookup api.DOMINIO`.

### 2. Preparar o servidor

```bash
ssh root@IP_DA_VPS
apt update && apt upgrade -y
apt install -y git ufw unattended-upgrades       # atualizações de segurança automáticas
curl -fsSL https://get.docker.com | sh            # Docker + Compose
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw enable
```

Recomendado: entrar por chave SSH (`ssh-copy-id`) e desativar o login por senha (`PasswordAuthentication no` em `/etc/ssh/sshd_config`).

### 3. Código e `.env`

```bash
git clone https://github.com/Pirond1/Bere_Gestao.git /opt/bere && cd /opt/bere
cp .env.example .env
openssl rand -hex 32     # rode uma vez para cada senha/chave do .env
nano .env
```

Use senhas e `SECRET_KEY` **novas**, nunca as de desenvolvimento. Os campos do Mercado Pago e do Brevo vêm dos passos 4 e 5.

### 4. E-mail (Brevo)

1. Crie a conta grátis em [brevo.com](https://www.brevo.com) (300 e-mails/dia).
2. *Remetentes, domínios e IPs dedicados › Domínios*: adicione o domínio e crie no DNS do registro.br os registros TXT/CNAME que o Brevo mostrar (código do Brevo, DKIM e DMARC). Sem isso, os e-mails caem no spam.
3. *Remetentes*: cadastre o `SMTP_REMETENTE` (ex.: `nao-responda@DOMINIO`). Ele precisa aparecer como **Verificado**: sem isso o Brevo aceita o envio pelo SMTP mas não entrega (nos logs: "Enviado" seguido de "Erro: sender not valid").
4. *SMTP & API › SMTP*: copie o **login** para `SMTP_USER` e gere uma **chave SMTP** para `SMTP_PASSWORD`.

### 5. Mercado Pago (produção)

1. A conta precisa ter **chave PIX cadastrada** para receber PIX.
2. Em [Suas integrações](https://www.mercadopago.com.br/developers/panel/app), abra a aplicação › *Credenciais de produção* › ative (pede setor e o site: `https://DOMINIO`). Copie o **Access Token** e a **Public Key** para o `.env`.
3. *Webhooks › Configurar notificações › Modo produtivo*: URL `https://api.DOMINIO/pagamentos/webhook`, evento **Order**. Salve e copie a **assinatura secreta** para `MERCADOPAGO_WEBHOOK_SECRET`.
4. Deixe `MERCADOPAGO_SANDBOX=false`.

### 6. Subir

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f       # Ctrl+C sai dos logs
```

A API aplica as migrations sozinha ao subir. O Caddy pede o certificado no primeiro acesso, e para isso o DNS do passo 1 já precisa estar apontando para a VPS. Depois, crie a conta da proprietária:

```bash
docker exec -it bere_api python -m app.scripts.criar_admin
```

### 7. Conferir antes de divulgar

- [ ] `https://DOMINIO` abre com cadeado; `http://` e `www` redirecionam
- [ ] No painel › Configurações: endereço/horário de retirada, contatos, remetente dos e-mails → **Enviar e-mail de teste**
- [ ] Cadastro de cliente recebe o código por e-mail (olhe também o spam)
- [ ] Produtos com foto, agenda e capacidade configurados
- [ ] Pedido real barato pago por PIX → status muda sozinho para *confirmado* (webhook chegou: `docker logs bere_api | grep webhook`) → cancelar o pedido estorna o valor
- [ ] PWA: no celular aparece "Instalar app"
- [ ] Backup: `docker exec bere_backup backup agora` e o card do Dashboard fica verde; ative a cópia no Drive (seção Backup abaixo) copiando o `rclone.conf` para `backup/config/` na VPS

### Atualizar e manter

```bash
cd /opt/bere && git pull
docker compose -f docker-compose.prod.yml up -d --build
```

- **Banco:** sem porta aberta. Para acessar, use `docker exec -it bere_db mysql -u bere_user -p bere_gestao`.
- **Fotos dos produtos:** ficam em `api/app/uploads/` na VPS, fora da imagem, e entram no backup.
- O banco de produção começa **vazio**. Não leve o banco de desenvolvimento: ele tem clientes e pagamentos de teste.

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

1. **Crie um acesso próprio no Google Cloud.** O acesso compartilhado que o rclone usa por padrão está sendo desativado em 2026. Em [console.cloud.google.com](https://console.cloud.google.com), com a conta Google que vai guardar os backups:
   - crie um projeto (ex.: `bere-backup`) e ative a **Google Drive API**;
   - na tela de consentimento OAuth: público **Externo**, escopo só **`drive.file`**, e em *Branding* a página inicial `https://DOMINIO` e a política `https://DOMINIO/privacidade` (**sem logotipo**, porque logo exige verificação do Google);
   - **publique o app** (*Público-alvo › Publicar app*). Em modo de teste, o Google corta o acesso a cada 7 dias;
   - crie uma credencial **ID do cliente OAuth › App para computador** e anote o ID e a chave secreta.
2. No seu computador, instale o rclone (`winget install Rclone.Rclone`) e rode `rclone config`:
   - `n` (novo remote), nome `drive`, tipo `drive`, com o `client_id` e o `client_secret` do passo 1 e `scope` = `drive.file`. Autorize no navegador quando ele abrir. Se aparecer "O Google não verificou este app", use *Avançado › Acessar*.
   - **Recomendado (LGPD):** crie um segundo remote, nome `drive-cripto`, tipo `crypt`, apontando para `drive:bere-backups`, com senhas geradas (`g`). Os arquivos vão criptografados para o Drive. **Guarde as duas senhas fora do servidor:** sem elas, o backup não pode ser lido. Se esquecer de anotar, recupere com `rclone config show drive-cripto` + `rclone reveal <valor>`.
3. Copie o arquivo gerado (`rclone config file` mostra onde ele está) para `backup/config/rclone.conf` no servidor (`scp`, com `chmod 600`). A pasta é ignorada pelo git.
4. No `.env`, coloque `BACKUP_REMOTO=drive-cripto:` (ou `BACKUP_REMOTO=drive:bere-backups`, sem criptografia) e rode `docker compose -f docker-compose.prod.yml up -d backup`.
5. Teste com `docker exec bere_backup backup agora`. O painel passa a mostrar "Cópia guardada fora do servidor".

No Drive, as pastas `diarios/` e `semanais/` seguem a mesma retenção. Os arquivos antigos são apagados pela idade, nunca espelhando a pasta local: se o disco do servidor se perder, as cópias do Drive continuam lá. Para restaurar a partir do Drive, baixe o arquivo para `backups/` e use o `restaurar` normalmente (com criptografia: `rclone copy drive-cripto:diarios/<arquivo> backups/`).
