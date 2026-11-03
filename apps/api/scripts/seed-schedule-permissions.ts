import { Client } from 'pg';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  try {
    const perms = await client.query(
      `SELECT id, name FROM permissions WHERE name IN ('schedules:read', 'schedules:book')`
    );
    const profiles = await client.query(
      `SELECT id, name FROM profiles WHERE name IN ('Regulador (Central de Regulação)', 'Solicitante (UBS)')`
    );

    for (const prof of profiles.rows) {
      for (const p of perms.rows) {
        await client.query(
          `INSERT INTO profile_permissions (profile_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [prof.id, p.id]
        );
      }
      console.log(`Granted schedules:read, schedules:book to ${prof.name}`);
    }

    console.log('Done!');
  } finally {
    await client.end();
  }
}

run();
