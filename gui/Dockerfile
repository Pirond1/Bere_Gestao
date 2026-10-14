# Produção (BG-24): compila o React e entrega pelo Caddy, que também faz o HTTPS
# Usado pelo docker-compose.prod.yml — em desenvolvimento o front roda com `npm run dev`

# Etapa 1 — build do Vite (Vite 8 pede Node 20.19+ / 22.12+)
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY . .

# Valores vêm do docker-compose.prod.yml; variáveis de ambiente têm prioridade sobre arquivos .env no Vite
ARG VITE_API_URL
ARG VITE_MP_PUBLIC_KEY
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_MP_PUBLIC_KEY=$VITE_MP_PUBLIC_KEY
RUN npm run build

# Etapa 2 — só os arquivos estáticos + Caddy
FROM caddy:2.10-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv