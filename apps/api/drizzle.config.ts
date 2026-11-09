import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Carrega as variáveis do .env da API mesmo quando executado a partir da raiz do monorepo
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config(); // fallback

const schemaPath = path.join(__dirname, 'src/database/schema.ts').replace(/\\/g, '/');
const outPath = path.join(__dirname, 'drizzle').replace(/\\/g, '/');

export default defineConfig({
  schema: schemaPath,
  out: outPath,
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
