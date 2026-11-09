# Docker Compose - Infraestrutura de Bancos de Dados SINPeP

Este diretório contém a configuração e os scripts para executar a camada de banco de dados do **SINPeP** em containers isolados, com **imagens mínimas**, **persistência de dados** e **rede interna dedicada**.

---

## 1. Arquitetura e Componentes

| Serviço | Imagem | Finalidade | Tamanho Aprox. |
| :--- | :--- | :--- | :---: |
| `postgres` | `postgres:16-alpine` | Banco de Dados Relacional Principal do SINPeP | ~95 MB |
| `redis` | `redis:7-alpine` | Cache em memória e filas de background | ~35 MB |

### Destaques de Segurança e Eficiência:
- **Imagens Mínimas Alpine Linux**: Consomem menos de 150MB combinadas, com inicialização ultra-rápida e superfície de vulnerabilidade reduzida.
- **Rede Própria Interna (`sinpep_network`)**: Rede bridge dedicada com resolução DNS interna por nome de serviço (`sinpep_postgres` e `sinpep_redis`).
- **Persistência Garantida**: Volumes nomeados (`sinpep_postgres_data` e `sinpep_redis_data`) que protegem os dados contra reinicializações e recriação de containers.
- **Inicialização Automática de Bases**: O script `docker/postgres/init/01-init-databases.sh` garante a criação automática das bases `sipep_sb`, `regulasb_db` e `sigtap` no primeiro boot.
- **Healthcheck Integrado**: Verificação periódica de saúde dos serviços (`pg_isready` e `redis-cli ping`).

---

## 2. Como Iniciar os Bancos de Dados

Na raiz do projeto, execute:

```bash
# Iniciar em segundo plano (background)
docker compose up -d

# Ou especificando o arquivo dedicado de banco:
docker compose -f docker-compose.db.yml up -d
```

Para verificar o status e a saúde dos containers:

```bash
docker compose ps
```

Para visualizar os logs:

```bash
docker compose logs -f postgres
```

Para parar os serviços mantendo os dados persistidos:

```bash
docker compose down
```

---

## 3. Como Conectar aos Bancos de Dados

### A) Conexão da Máquina Host (Desenvolvimento Local)
Para aplicações rodando diretamente no host (ex: `npm run dev` na API):

```env
DATABASE_URL="postgresql://regulasb_user:regulasb_password@localhost:5432/sipep_sb?schema=public"
REDIS_URL="redis://localhost:6379"
```

### B) Conexão de Outro Container / Docker Compose
Se a API estiver rodando em outro container (ex.: `docker-compose.app.yml`), basta conectar à rede externa:

```yaml
services:
  api:
    image: sinpep-api:latest
    environment:
      DATABASE_URL: "postgresql://regulasb_user:regulasb_password@sinpep_postgres:5432/sipep_sb?schema=public"
      REDIS_URL: "redis://sinpep_redis:6379"
    networks:
      - sinpep_network

networks:
  sinpep_network:
    external: true
```
