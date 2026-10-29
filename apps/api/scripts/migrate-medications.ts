import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function runMigration() {
  console.log('--- Aplicando migração de tabelas de Medicamentos e Extensões Trigram ---');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Conectado ao PostgreSQL com sucesso.');

    // 1. Extensions
    console.log('1. Habilitando extensões pg_trgm e unaccent...');
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await client.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
    await client.query(`CREATE EXTENSION IF NOT EXISTS unaccent;`);

    // 2. Laboratories
    console.log('2. Criando tabela medicine_laboratories...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "medicine_laboratories" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "cnpj" text NOT NULL,
        "corporate_name" text NOT NULL,
        "created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "medicine_laboratories_cnpj_key" ON "medicine_laboratories" ("cnpj");
      CREATE INDEX IF NOT EXISTS "medicine_laboratories_name_idx" ON "medicine_laboratories" ("corporate_name");
    `);

    // 3. Substances
    console.log('3. Criando tabela medicine_substances...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "medicine_substances" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "name" text NOT NULL,
        "code" text,
        "created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "medicine_substances_name_key" ON "medicine_substances" ("name");
      CREATE INDEX IF NOT EXISTS "medicine_substances_code_idx" ON "medicine_substances" ("code");
    `);

    // 4. Medications
    console.log('4. Criando tabela medications e índices GIN...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "medications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "name" text NOT NULL,
        "process_number" text,
        "registration_number" text,
        "laboratory_id" uuid REFERENCES "medicine_laboratories"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "category" text,
        "reference_medicine" text,
        "stripe" text,
        "status" text DEFAULT 'Ativo' NOT NULL,
        "is_active" boolean DEFAULT true NOT NULL,
        "substance_description" text,
        "dosage" text,
        "substance_with_dosage" text,
        "complement" text,
        "atc_code" text,
        "search_text" text,
        "created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
      CREATE INDEX IF NOT EXISTS "medications_name_idx" ON "medications" ("name");
      CREATE INDEX IF NOT EXISTS "medications_is_active_idx" ON "medications" ("is_active");
      CREATE INDEX IF NOT EXISTS "medications_lab_id_idx" ON "medications" ("laboratory_id");
      CREATE INDEX IF NOT EXISTS "medications_reg_num_idx" ON "medications" ("registration_number");
      CREATE INDEX IF NOT EXISTS "medications_search_trgm_idx" ON "medications" USING gin ("search_text" gin_trgm_ops);
    `);

    // 5. Junction table
    console.log('5. Criando tabela associativa medication_substances...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "medication_substances" (
        "medication_id" uuid NOT NULL REFERENCES "medications"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "substance_id" uuid NOT NULL REFERENCES "medicine_substances"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "dosage" text,
        CONSTRAINT "medication_substances_pkey" PRIMARY KEY("medication_id", "substance_id")
      );
      CREATE INDEX IF NOT EXISTS "medication_substances_substance_id_idx" ON "medication_substances" ("substance_id");
    `);

    console.log('✅ Migração de tabelas e índices concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();

