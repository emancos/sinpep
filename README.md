# Projeto Base (Boilerplate)

Um projeto base limpo, focado em fornecer uma infraestrutura sólida de Autenticação e Gestão de Usuários (RBAC) para o desenvolvimento de novas aplicações.
Esta base utiliza uma arquitetura **Monorepo** gerenciada pelo Turborepo, dividida entre uma API em NestJS e um Frontend Web em React.

## ✨ Features Incluídas

- **Arquitetura Monorepo:** Configurado com `Turborepo` para fácil orquestração e compartilhamento de scripts entre projetos.
- **Backend (API):**
  - **NestJS:** Framework progressivo para Node.js.
  - **Prisma ORM:** Integração pronta para bancos PostgreSQL, simplificando as migrations e acesso a dados.
  - **Autenticação Segura:** Autenticação via JWT (JSON Web Token) configurada nativamente.
  - **Gestão de Perfis e Permissões (RBAC):** Sistema completo para criar diferentes níveis de acesso (Admin, etc) vinculando usuários aos seus respectivos perfis e permissões granulares no banco de dados.
  - **Recuperação de Senha:** Envio automático de e-mail integrado e geração de token seguro para redefinição de senhas.
- **Frontend (Web):**
  - **React + Vite:** Configuração moderna para tempo de build otimizado e HMR (Hot Module Replacement) instantâneo.
  - **Tailwind CSS:** Para estilização utilitária e design system responsivo e moderno.
  - **Gerenciamento de Estado:** Configurado com `Zustand` para gerenciar a sessão do usuário conectado (`useAuthStore`).
  - **Roteamento Protegido:** Rotas privadas do React Router que bloqueiam usuários sem as permissões adequadas e sem login.
  - **Design Dinâmico:** Estrutura de Layout e Login premium (com dark mode implementado).

---

## 🚀 Como Iniciar o Projeto

### 1. Requisitos Prévios
- [Node.js](https://nodejs.org/en/) (v18 ou superior recomendado).
- [PostgreSQL](https://www.postgresql.org/) instalado e rodando na sua máquina ou em nuvem.

### 2. Instalação de Dependências
Na raiz do **Projeto Base**, execute o comando abaixo para instalar todas as dependências dos repositórios:

```bash
npm install
```

### 3. Configuração de Ambiente (.env)
Você precisará configurar as variáveis de ambiente na API e na Web. Foram deixados arquivos de ambiente prontos, mas você deve revisá-los.

**Para a API (`apps/api/.env`):**
Crie ou edite o `.env` definindo sua string de conexão com o banco e segredos.
```env
# Database connection string (Altere user, password e database conforme seu local)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/base_db?schema=public"

# App Settings
APP_NAME="Sistema Base"
PORT=3333

# JWT
JWT_SECRET="sua-chave-secreta-muito-segura"

# Frontend
FRONTEND_URL="http://localhost:5173"
```

**Para a WEB (`apps/web/.env`):**
```env
VITE_API_URL=http://localhost:3333
VITE_APP_NAME="Sistema Base"
```

### 4. Configuração do Banco de Dados (Prisma)
Com as variáveis de ambiente prontas, entre na pasta da API e sincronize seu esquema Prisma com o PostgreSQL:

```bash
cd apps/api
npx prisma db push
```
*(Nota: O `db push` criará as tabelas. Em ambientes de produção, prefira gerar e rodar migrations com `npx prisma migrate dev`).*

Para alimentar o banco com os dados básicos de funcionamento (Permissões de Admin, Perfil e Usuário base), execute a seed:
```bash
npx prisma db seed
```
**Credenciais de Acesso padrão após a seed:**
- **Email:** `admin@system.com`
- **Senha:** `123456`

Volte para a pasta raiz do projeto após finalizar:
```bash
cd ../..
```

### 5. Executando o Projeto
Para iniciar simultaneamente a API NestJS e o painel Frontend do React em modo desenvolvimento, rode na raiz do monorepo:

```bash
npm run dev
```

Acesse o sistema no seu navegador: **[http://localhost:5173](http://localhost:5173)**

---

## 📂 Estrutura de Pastas

```text
Projeto base/
├── apps/
│   ├── api/            # Backend (NestJS + Prisma)
│   └── web/            # Frontend (React + Vite + Tailwind)
├── package.json        # Dependências compartilhadas (Workspace)
└── turbo.json          # Orquestração do Monorepo
```
