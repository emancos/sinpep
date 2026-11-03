import { Client } from 'pg';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();
  console.log('Migrating schedules for type, procedure_group_id, and enabled_procedure_ids...');

  try {
    // 1. Torna procedure_id opcional
    await client.query(`
      ALTER TABLE schedules ALTER COLUMN procedure_id DROP NOT NULL;
    `);

    // 2. Adiciona colunas schedule_type, procedure_group_id e enabled_procedure_ids
    await client.query(`
      ALTER TABLE schedules ADD COLUMN IF NOT EXISTS schedule_type TEXT NOT NULL DEFAULT 'CONSULTA';
      ALTER TABLE schedules ADD COLUMN IF NOT EXISTS procedure_group_id UUID REFERENCES procedure_groups(id) ON UPDATE CASCADE ON DELETE SET NULL;
      ALTER TABLE schedules ADD COLUMN IF NOT EXISTS enabled_procedure_ids TEXT[] DEFAULT ARRAY[]::TEXT[];
      CREATE INDEX IF NOT EXISTS schedules_procedure_group_idx ON schedules (procedure_group_id);
    `);

    console.log('✓ Migration executed successfully!');
  } finally {
    await client.end();
  }
}

run();
