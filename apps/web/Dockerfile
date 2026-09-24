FROM node:24-alpine AS builder

WORKDIR /app

RUN npm install -g turbo

COPY package*.json ./
COPY turbo.json ./
COPY apps/api ./apps/api/
COPY apps/web ./apps/web/

RUN npm ci --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000 || npm ci --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

# Variável de build obrigatória para o Vite compilar a URL certa da API
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build do frontend
RUN turbo run build --filter=web

# Estágio de Produção com Nginx
FROM nginx:alpine AS runner

# Remove a configuração padrão do Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copia nossa configuração para React Router
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copia a pasta de build do Vite para o diretório padrão do Nginx
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
