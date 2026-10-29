import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const RECEPTIONIST_PERMISSIONS = [
  'patients:read',
  'patients:write',
  'rooms:read',
  'rooms:write',
  'health-centers:read',
  'health-agents:read',
  'doctors:read',
  'specialties:read',
  'procedures:read',
];

async function main() {
  console.log('--- Configurando Perfil Recepcionista e Regras de Acesso Padrão ---');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Conectado ao PostgreSQL.');

    // 1. Criar ou obter perfil Recepcionista
    const profileRes = await client.query(`
      SELECT id, name FROM profiles WHERE name = 'Recepcionista' LIMIT 1;
    `);

    let receptionistProfileId: string;
    if (profileRes.rows.length === 0) {
      console.log('Criando perfil "Recepcionista"...');
      const insertProfileRes = await client.query(`
        INSERT INTO profiles (id, name, description, created_at, updated_at)
        VALUES (
          gen_random_uuid(),
          'Recepcionista',
          'Atendimento na recepção, fila de espera, gestão de pacientes e salas',
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        RETURNING id, name;
      `);
      receptionistProfileId = insertProfileRes.rows[0].id;
      console.log(`Perfil "Recepcionista" criado com ID: ${receptionistProfileId}`);
    } else {
      receptionistProfileId = profileRes.rows[0].id;
      console.log(`Perfil "Recepcionista" já existe com ID: ${receptionistProfileId}`);
      // Atualiza descrição caso necessário
      await client.query(`
        UPDATE profiles 
        SET description = 'Atendimento na recepção, fila de espera, gestão de pacientes e salas',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1;
      `, [receptionistProfileId]);
    }

    // 2. Garantir que as permissões padrão existam no banco
    const permsRes = await client.query(`
      SELECT id, name FROM permissions WHERE name = ANY($1::text[]);
    `, [RECEPTIONIST_PERMISSIONS]);

    const foundPerms = permsRes.rows;
    console.log(`Permissões encontradas para o perfil (${foundPerms.length}/${RECEPTIONIST_PERMISSIONS.length}):`);
    for (const p of foundPerms) {
      console.log(`  - ${p.name} (${p.id})`);
    }

    if (foundPerms.length < RECEPTIONIST_PERMISSIONS.length) {
      const foundNames = new Set(foundPerms.map(p => p.name));
      const missing = RECEPTIONIST_PERMISSIONS.filter(name => !foundNames.has(name));
      console.warn(`Atenção: Permissões não encontradas no banco: ${missing.join(', ')}`);
    }

    // 3. Vincular permissões ao perfil Recepcionista
    let linkedCount = 0;
    for (const perm of foundPerms) {
      const checkRes = await client.query(`
        SELECT 1 FROM profile_permissions 
        WHERE profile_id = $1 AND permission_id = $2;
      `, [receptionistProfileId, perm.id]);

      if (checkRes.rows.length === 0) {
        await client.query(`
          INSERT INTO profile_permissions (profile_id, permission_id, created_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP);
        `, [receptionistProfileId, perm.id]);
        linkedCount++;
        console.log(`  + Permissão vinculada: ${perm.name}`);
      } else {
        console.log(`  = Permissão já vinculada: ${perm.name}`);
      }
    }

    console.log(`\nNovas permissões vinculadas ao perfil Recepcionista: ${linkedCount}`);

    // 4. Exibir resumo atualizado de todos os perfis e suas permissões
    const summary = await client.query(`
      SELECT pr.name as profile, count(pe.id) as permissions_count
      FROM profiles pr
      LEFT JOIN profile_permissions pp ON pp.profile_id = pr.id
      LEFT JOIN permissions pe ON pe.id = pp.permission_id
      GROUP BY pr.name
      ORDER BY pr.name;
    `);
    console.log('\nResumo dos Perfis no Sistema:');
    console.table(summary.rows);

    console.log('✅ Configuração do perfil Recepcionista concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao configurar perfil Recepcionista:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
