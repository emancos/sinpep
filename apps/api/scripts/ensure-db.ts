import { Client } from 'pg';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

export async function ensureDatabase() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn('DATABASE_URL não configurada no .env');
    return;
  }

  // Parseia a URL de conexão
  let targetDb = 'sinpep_sb';
  try {
    const match = dbUrl.match(/\/([^/?]+)(\?|$)/);
    if (match && match[1]) {
      targetDb = match[1];
    }
  } catch {
    // fallback
  }

  const maintenanceDbs = ['postgres', 'template1', 'sipep_sb', 'sinpep_sb'];
  let connected = false;
  let client: Client | null = null;

  for (const mDb of maintenanceDbs) {
    try {
      const connStr = dbUrl.replace(/\/([^/?]+)(\?|$)/, `/${mDb}$2`);
      client = new Client({ connectionString: connStr });
      await client.connect();
      connected = true;
      break;
    } catch {
      if (client) {
        try { await client.end(); } catch {}
      }
    }
  }

  if (!connected || !client) {
    // Se não conseguiu conectar aos bancos de manutenção, deixa o comando principal tentar
    return;
  }

  try {
    const databasesToCheck = Array.from(new Set([targetDb, 'sinpep_sb', 'sipep_sb']));
    for (const dbName of databasesToCheck) {
      const checkRes = await client.query(
        `SELECT 1 FROM pg_database WHERE datname = $1;`,
        [dbName]
      );
      if (checkRes.rows.length === 0) {
        console.log(`🔨 Criando base de dados "${dbName}"...`);
        await client.query(`CREATE DATABASE "${dbName}";`);
        console.log(`✅ Base de dados "${dbName}" criada com sucesso.`);
      }
    }
  } catch (err: any) {
    console.warn('Nota na verificação de banco:', err.message);
  } finally {
    try { await client.end(); } catch {}
  }
}

if (require.main === module) {
  ensureDatabase().then(() => {
    process.exit(0);
  }).catch((e) => {
    console.warn(e);
    process.exit(0);
  });
}
