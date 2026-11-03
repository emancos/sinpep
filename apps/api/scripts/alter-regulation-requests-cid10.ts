import { Client } from 'pg';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();
  console.log('Connecting to database and inspecting columns of regulation_requests...');

  try {
    const res = await client.query(`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'regulation_requests'
      ORDER BY ordinal_position;
    `);

    console.log('Columns in regulation_requests:');
    for (const row of res.rows) {
      console.log(` - ${row.column_name}: ${row.data_type} (max_length: ${row.character_maximum_length})`);
    }

    console.log('\nAltering column cid10 to TEXT...');
    await client.query(`
      ALTER TABLE regulation_requests ALTER COLUMN cid10 TYPE TEXT;
    `);
    console.log('✓ Successfully altered cid10 to TEXT!');

    // Check if there are any other tables with cid10 as varchar(20)
    const cidCols = await client.query(`
      SELECT table_name, column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE column_name ILIKE '%cid%' AND table_schema = 'public';
    `);

    console.log('\nOther CID columns in public schema:');
    for (const row of cidCols.rows) {
      console.log(` - ${row.table_name}.${row.column_name}: ${row.data_type} (max_length: ${row.character_maximum_length})`);
      if (row.character_maximum_length && row.character_maximum_length < 100) {
        console.log(`   -> Expanding ${row.table_name}.${row.column_name} to TEXT...`);
        await client.query(`ALTER TABLE "${row.table_name}" ALTER COLUMN "${row.column_name}" TYPE TEXT;`);
        console.log(`   ✓ Expanded!`);
      }
    }

  } catch (err) {
    console.error('Error during execution:', err);
  } finally {
    await client.end();
  }
}

run();
