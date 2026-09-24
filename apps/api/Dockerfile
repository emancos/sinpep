FROM node:24-alpine AS builder

WORKDIR /app

# Instala turbo globalmente
RUN npm install -g turbo

# Copia arquivos base do monorepo
COPY package*.json ./
COPY turbo.json ./

# Copia todo o código fonte
COPY apps/api ./apps/api/
COPY apps/web ./apps/web/

# Instala dependências com retries resilientes a falhas de rede (ECONNRESET)
RUN npm ci --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000 || npm ci --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

# Gera o cliente Prisma (necessário antes do build)
WORKDIR /app/apps/api
RUN npx prisma generate

# Volta para a raiz e faz o build usando turbo
WORKDIR /app
RUN turbo run build --filter=api

# Estágio de Produção
FROM node:24-alpine AS runner

WORKDIR /app

# Copia package.json raiz (se necessário para monorepo workspaces) e node_modules de produção
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Copia os arquivos da API
COPY --from=builder /app/apps/api/package*.json ./apps/api/
COPY --from=builder /app/apps/api/tsconfig*.json ./apps/api/
COPY --from=builder /app/apps/api/prisma.config.ts ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

WORKDIR /app/apps/api

# A porta 3000 não estará exposta externamente, será roteada via Nginx.
EXPOSE 3000

# Comando para rodar a aplicação em produção, sincronizando o banco antes de iniciar
CMD ["sh", "-c", "npx prisma db push && npm run start:prod"]
