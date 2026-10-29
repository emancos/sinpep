import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  console.log('--- Iniciando correção de codificação / entidades HTML nos Medicamentos ---');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Conectado ao PostgreSQL.');

    // 1. Criar função de decodificação no PostgreSQL
    console.log('1. Criando função decode_html_entities...');
    await client.query(`
      CREATE OR REPLACE FUNCTION decode_html_entities(input text) RETURNS text AS $$
      DECLARE
        res text := input;
        m text;
      BEGIN
        IF res IS NULL THEN
          RETURN NULL;
        END IF;
        
        -- Entidades decimais &#193; etc
        FOR m IN SELECT DISTINCT (regexp_matches(res, '&#([0-9]{2,4});', 'g'))[1] LOOP
          BEGIN
            res := replace(res, '&#' || m || ';', chr(m::integer));
          EXCEPTION WHEN OTHERS THEN
            -- Se falhar conversão de algum caractere, mantém
          END;
        END LOOP;
        
        -- Entidades hexadecimais &#x...;
        FOR m IN SELECT DISTINCT (regexp_matches(res, '&#x([0-9a-fA-F]{2,4});', 'g'))[1] LOOP
          BEGIN
            res := replace(res, '&#x' || m || ';', chr(('x' || m)::bit(16)::integer));
          EXCEPTION WHEN OTHERS THEN
          END;
        END LOOP;
        
        -- Entidades comumente encontradas
        res := replace(res, '&amp;', '&');
        res := replace(res, '&quot;', '"');
        res := replace(res, '&apos;', '''');
        res := replace(res, '&lt;', '<');
        res := replace(res, '&gt;', '>');
        res := replace(res, '&nbsp;', ' ');
        res := replace(res, '&deg;', '°');
        res := replace(res, '&ordm;', 'º');
        res := replace(res, '&ordf;', 'ª');
        
        RETURN res;
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
    `);

    // 2. Corrigir Laboratórios
    console.log('2. Atualizando medicine_laboratories...');
    const labRes = await client.query(`
      UPDATE medicine_laboratories 
      SET corporate_name = decode_html_entities(corporate_name),
          updated_at = CURRENT_TIMESTAMP
      WHERE corporate_name LIKE '%&%';
    `);
    console.log(`Laboratórios atualizados: ${labRes.rowCount}`);

    // 3. Corrigir Princípios Ativos
    console.log('3. Atualizando medicine_substances...');
    const subRes = await client.query(`
      UPDATE medicine_substances 
      SET name = decode_html_entities(name),
          updated_at = CURRENT_TIMESTAMP
      WHERE name LIKE '%&%';
    `);
    console.log(`Substâncias atualizadas: ${subRes.rowCount}`);

    // 4. Corrigir Medicamentos e recalcular search_text
    console.log('4. Atualizando medications (isso pode levar alguns segundos)...');
    const medRes = await client.query(`
      UPDATE medications 
      SET 
        name = decode_html_entities(name),
        substance_description = decode_html_entities(substance_description),
        substance_with_dosage = decode_html_entities(substance_with_dosage),
        complement = decode_html_entities(complement),
        category = decode_html_entities(category),
        search_text = unaccent(lower(
          decode_html_entities(name) || ' ' || 
          COALESCE(decode_html_entities(substance_description), '') || ' ' || 
          COALESCE(dosage, '') || ' ' || 
          COALESCE(decode_html_entities(complement), '')
        )),
        updated_at = CURRENT_TIMESTAMP
      WHERE 
        name LIKE '%&%' 
        OR substance_description LIKE '%&%' 
        OR substance_with_dosage LIKE '%&%'
        OR complement LIKE '%&%' 
        OR category LIKE '%&%'
        OR search_text LIKE '%&%';
    `);
    console.log(`Medicamentos atualizados: ${medRes.rowCount}`);

    // Teste de validação
    const sample = await client.query(`
      SELECT name, substance_description, dosage, complement 
      FROM medications 
      WHERE name ILIKE '%AGUA BORICADA%' 
      LIMIT 5;
    `);
    console.log('Validação da amostra (ÁGUA BORICADA):', sample.rows);

    console.log('✅ Correção de codificação e acentuação concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro na correção de entidades:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();

