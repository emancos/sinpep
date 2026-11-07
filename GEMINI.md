# Regras do Workspace SINPeP

Este documento define as diretrizes, padrões e regras mandatórias de desenvolvimento para o ecossistema **SINPeP** (Sistema Integrado de Regulação Municipal e Prontuário Eletrônico).

---

## 1. Regra Mandatória de Versionamento do Sistema

1. **Sincronização Obrigatória dos Pacotes**:
   - A versão oficial do sistema deve sempre ser mantida idêntica em todos os manifestos de pacote do monorepo:
     - `package.json` (raiz do projeto)
     - `apps/web/package.json` (frontend Vite/React)
     - `apps/api/package.json` (backend NestJS)
2. **Proibição de Versão Estática (Hardcoded) no Frontend**:
   - NUNCA fixar a versão como string estática no código JSX/TSX (ex.: `<span>v1.3.2</span>`).
   - A versão exibida no rodapé da barra lateral (`apps/web/src/components/Layout.tsx`), em modais de sobre ou em qualquer ponto da interface DEVE ser importada dinamicamente da constante centralizada:
     ```ts
     import { APP_VERSION } from '../config/version';
     // Uso: v{APP_VERSION}
     ```
   - O Vite injeta automaticamente a versão a partir de `apps/web/package.json` via `'import.meta.env.VITE_APP_VERSION'` no arquivo `apps/web/vite.config.ts`.
3. **Procedimento de Atualização de Versão**:
   - Ao incrementar a versão do sistema (SemVer: `MAJOR.MINOR.PATCH`), atualize simultaneamente os três arquivos `package.json`. O frontend refletirá a alteração de forma automática.

---

## 2. Regra Mandatória de Formatação de Datas (Padrão Brasileiro)

1. **Formato Obrigatório**:
   - Todas as datas exibidas na interface do usuário (tabelas, cards, filtros, detalhes, modais, comprovantes de agendamento e impressões PDF) DEVEM ser formatadas estritamente no padrão brasileiro:
     - **Data Simples**: `dd/mm/yyyy` (ex.: `07/11/2026`).
     - **Data e Hora**: `dd/mm/yyyy às HH:mm` ou `dd/mm/yyyy HH:mm` (ex.: `07/11/2026 às 14:30`).
2. **Proibição de Formatos Não Brasileiros**:
   - NUNCA exibir datas em formato ISO (`YYYY-MM-DD` ou `YYYY-MM-DDTHH:mm:ssZ`) ou formato norte-americano (`MM/DD/YYYY`).
   - NUNCA usar `new Date("YYYY-MM-DD").toLocaleDateString()` diretamente em strings sem hora, pois fusos horários brasileiros (UTC-3) provocam o deslocamento indesejado de 1 dia para trás (ex.: 06/11 torna-se 05/11).
3. **Uso dos Utilitários Centralizados**:
   - Toda formatação de data e documentos pessoais deve utilizar as funções em `apps/web/src/utils/brazilianFormatters.ts`:
     - `formatDateBR(date)`: Converte com segurança strings ISO (`YYYY-MM-DD` ou com hora) e objetos `Date` para `dd/mm/yyyy`.
     - `formatDateTimeBR(date, withAt?)`: Converte para `dd/mm/yyyy às HH:mm`.
     - `formatBirthDate(birthDate)`: Formata a data de nascimento ou exibe `'Não informado'`.
     - `formatBirthDateAndGender(birthDate, gender)`: Retorna `dd/mm/yyyy (Gênero)`.
     - `formatCPF(cpf)`: Formata CPF como `000.000.000-00`, ocultando identificadores temporários.
     - `formatCNS(cns)`: Formata CNS com espaçamentos `000 0000 0000 0000`.

---

## 3. Regra de Execução de SQL com Drizzle ORM no Backend

1. **Extração Correta do Resultado de `db.execute`**:
   - No backend NestJS com Drizzle ORM e o driver do PostgreSQL (`pg`/`node-postgres`), chamadas `this.db.execute(sql\`...\`)` retornam um objeto `QueryResult` onde as linhas resultantes ficam na propriedade `.rows`.
   - NUNCA acesse diretamente `countsResult[0]`, pois o resultado não é um array indexado e retornará `undefined`.
   - Padrão mandatório:
     ```ts
     const rows = (result as any)?.rows || (Array.isArray(result) ? result : []);
     const firstRow = rows[0] || {};
     ```
