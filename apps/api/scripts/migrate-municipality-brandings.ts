import { Client } from 'pg';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();
  console.log('Connected to PostgreSQL database.');

  try {
    // 1. Cria a tabela municipality_brandings
    await client.query(`
      CREATE TABLE IF NOT EXISTS municipality_brandings (
        id UUID PRIMARY KEY NOT NULL,
        slug TEXT NOT NULL,
        name TEXT NOT NULL,
        full_name TEXT NOT NULL,
        department TEXT NOT NULL,
        network_name TEXT NOT NULL DEFAULT 'Rede de Atenção à Saúde',
        system_title TEXT NOT NULL DEFAULT 'SINPeP',
        system_subtitle TEXT NOT NULL,
        description TEXT,
        badge_text TEXT NOT NULL DEFAULT 'Gestão Clínica e Assistencial',
        coat_of_arms_url TEXT NOT NULL,
        logo_url TEXT,
        primary_gradient_start TEXT NOT NULL DEFAULT '#003366',
        primary_gradient_end TEXT NOT NULL DEFAULT '#001c3a',
        footer_text TEXT DEFAULT 'Acesso restrito a profissionais autorizados • Uso Institucional',
        support_contact TEXT,
        is_default BOOLEAN NOT NULL DEFAULT false,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE UNIQUE INDEX IF NOT EXISTS municipality_brandings_slug_key ON municipality_brandings (slug);
    `);
    console.log('✓ municipality_brandings table and index created or verified.');

    // 2. Insere seed do registro padrão caso não exista
    const defaultCheck = await client.query(`SELECT id FROM municipality_brandings WHERE slug = 'padrao'`);
    if (defaultCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO municipality_brandings (
          id, slug, name, full_name, department, network_name,
          system_title, system_subtitle, description, badge_text,
          coat_of_arms_url, is_default, is_active, updated_at
        ) VALUES (
          $1, 'padrao', 'Padrão', 'Unidade de Saúde', 'Rede de Atenção à Saúde', 'Rede de Atenção à Saúde',
          'SINPeP', 'Sistema Integrado de Prontuário Eletrônico do Paciente',
          'Sistema Integrado de Prontuário Eletrônico do Paciente para suporte ao atendimento ambulatorial e fluxos assistenciais.',
          'Gestão Clínica e Assistencial', '/brasao.png', true, true, CURRENT_TIMESTAMP
        )
      `, [randomUUID()]);
      console.log('✓ Default branding (slug: padrao) created.');
    } else {
      console.log('ℹ Default branding already exists.');
    }

    // 3. Insere seed do município exemplo (Palmares) caso não exista
    const palmaresCheck = await client.query(`SELECT id FROM municipality_brandings WHERE slug = 'palmares'`);
    if (palmaresCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO municipality_brandings (
          id, slug, name, full_name, department, network_name,
          system_title, system_subtitle, description, badge_text,
          coat_of_arms_url, footer_text, is_default, is_active, updated_at
        ) VALUES (
          $1, 'palmares', 'Palmares', 'Prefeitura Municipal de Palmares', 'Secretaria Municipal de Saúde', 'Rede Municipal de Atenção à Saúde',
          'SINPeP Palmares', 'Sistema Integrado de Saúde & Prontuário Eletrônico',
          'Plataforma de gestão integrada da rede de atenção primária, especializada e regulação municipal de Palmares.',
          'Governo Municipal de Palmares', '/brasao.png',
          'Prefeitura Municipal de Palmares • Secretaria de Saúde', false, true, CURRENT_TIMESTAMP
        )
      `, [randomUUID()]);
      console.log('✓ Palmares branding (slug: palmares) created.');
    } else {
      console.log('ℹ Palmares branding already exists.');
    }

    console.log('🚀 Migration completed successfully!');
  } catch (err) {
    console.error('Error during migration:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
