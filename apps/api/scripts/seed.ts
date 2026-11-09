import { Client } from 'pg';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { ensureDatabase } from './ensure-db';

dotenv.config({ path: path.join(__dirname, '../.env') });

const PERMISSIONS = [
  { name: 'admin:access', description: 'Acesso total de administrador' },
  { name: 'users:read', description: 'Visualizar usuários' },
  { name: 'users:write', description: 'Gerenciar usuários' },
  { name: 'health-centers:read', description: 'Visualizar unidades e agentes de saúde' },
  { name: 'health-centers:write', description: 'Gerenciar unidades e agentes de saúde' },
  { name: 'health-agents:read', description: 'Visualizar Agentes de Saúde' },
  { name: 'health-agents:write', description: 'Gerir Agentes de Saúde' },
  { name: 'patients:read', description: 'Visualizar Pacientes' },
  { name: 'patients:write', description: 'Gerenciar Pacientes' },
  { name: 'patients:write_attention', description: 'Gerenciar Nível de Atenção do Paciente' },
  { name: 'doctors:read', description: 'Visualizar Médicos' },
  { name: 'doctors:write', description: 'Gerenciar Médicos' },
  { name: 'specialties:read', description: 'Visualizar Especialidades' },
  { name: 'specialties:write', description: 'Gerenciar Especialidades' },
  { name: 'reports:read', description: 'Visualizar Relatórios e BI' },
  { name: 'schedules:read', description: 'Visualizar agendas e escalas' },
  { name: 'schedules:book', description: 'Agendar vagas e consultas' },
  { name: 'medical-records:read', description: 'Visualizar prontuários médicos' },
  { name: 'medical-records:write', description: 'Gerenciar e registrar prontuários médicos' },
  { name: 'bpa:read', description: 'Visualizar Boletim de Produção Ambulatorial' },
  { name: 'bpa:export', description: 'Exportar arquivos magnéticos do BPA' },
  { name: 'bpa:manage', description: 'Configurar parâmetros e regras do BPA' },
  { name: 'regulation:read', description: 'Visualizar solicitações de regulação' },
  { name: 'regulation:write', description: 'Regular e despachar solicitações' },
];

const DEFAULT_PROFILES = [
  { name: 'Administrador', description: 'Acesso total às configurações do sistema' },
  { name: 'Regulador (Central de Regulação)', description: 'Regulação de solicitações e encaminhamentos' },
  { name: 'Solicitante (UBS)', description: 'Solicitação e acompanhamento de consultas e exames nas UBS' },
  { name: 'Médico', description: 'Atendimento clínico, prontuário eletrônico e prescrições' },
  { name: 'Recepcionista', description: 'Atendimento na recepção, fila de espera, gestão de pacientes e salas' },
  { name: 'Coordenador de Unidade', description: 'Gestão operacional e administrativa da unidade de saúde' },
];

async function main() {
  await ensureDatabase();

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL não configurada no arquivo .env.');
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    console.log('🚀 Iniciando seed do banco de dados (SINPeP)...');

    // 1. Criar ou atualizar permissões
    console.log('📦 Configurando permissões do sistema...');
    const permissionIds = new Map<string, string>();

    for (const p of PERMISSIONS) {
      const res = await client.query(
        `
        INSERT INTO permissions (id, name, description, created_at, updated_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (name) DO UPDATE 
        SET description = EXCLUDED.description, updated_at = CURRENT_TIMESTAMP
        RETURNING id;
        `,
        [crypto.randomUUID(), p.name, p.description]
      );
      permissionIds.set(p.name, res.rows[0].id);
    }
    console.log(`✅ ${permissionIds.size} permissões configuradas.`);

    // 2. Criar ou atualizar perfis
    console.log('👥 Configurando perfis de acesso padrão...');
    const profileIds = new Map<string, string>();

    for (const prof of DEFAULT_PROFILES) {
      const res = await client.query(
        `
        INSERT INTO profiles (id, name, description, created_at, updated_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (name) DO UPDATE 
        SET description = EXCLUDED.description, updated_at = CURRENT_TIMESTAMP
        RETURNING id;
        `,
        [crypto.randomUUID(), prof.name, prof.description]
      );
      profileIds.set(prof.name, res.rows[0].id);
    }
    console.log(`✅ ${profileIds.size} perfis configurados.`);

    const adminProfileId = profileIds.get('Administrador')!;

    // 3. Vincular todas as permissões ao perfil de Administrador
    console.log('🔐 Vinculando permissões ao perfil Administrador...');
    for (const [_, permId] of permissionIds.entries()) {
      await client.query(
        `
        INSERT INTO profile_permissions (profile_id, permission_id, created_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (profile_id, permission_id) DO NOTHING;
        `,
        [adminProfileId, permId]
      );
    }
    console.log('✅ Permissões vinculadas ao Administrador.');

    // 4. Vincular permissões específicas a perfis comuns (Schedules & Reports & Receptionist)
    const schedulesReadId = permissionIds.get('schedules:read');
    const schedulesBookId = permissionIds.get('schedules:book');
    const reportsReadId = permissionIds.get('reports:read');

    const basicProfiles = [
      profileIds.get('Regulador (Central de Regulação)'),
      profileIds.get('Solicitante (UBS)'),
    ].filter(Boolean) as string[];

    for (const profId of basicProfiles) {
      if (schedulesReadId) {
        await client.query(
          `INSERT INTO profile_permissions (profile_id, permission_id, created_at) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING;`,
          [profId, schedulesReadId]
        );
      }
      if (schedulesBookId) {
        await client.query(
          `INSERT INTO profile_permissions (profile_id, permission_id, created_at) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING;`,
          [profId, schedulesBookId]
        );
      }
    }

    if (reportsReadId) {
      for (const profId of profileIds.values()) {
        await client.query(
          `INSERT INTO profile_permissions (profile_id, permission_id, created_at) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING;`,
          [profId, reportsReadId]
        );
      }
    }

    // 5. Criar / Atualizar Usuário Administrador
    const adminEmail = 'admin@system.com';
    const adminPassword = 'admin';
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const userCheck = await client.query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1;`,
      [adminEmail]
    );

    let adminUserId: string;

    if (userCheck.rows.length > 0) {
      adminUserId = userCheck.rows[0].id;
      await client.query(
        `
        UPDATE users
        SET password_hash = $1,
            profile_id = $2,
            is_active = true,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3;
        `,
        [passwordHash, adminProfileId, adminUserId]
      );
      console.log(`✅ Usuário administrador (${adminEmail}) atualizado.`);
    } else {
      adminUserId = crypto.randomUUID();
      await client.query(
        `
        INSERT INTO users (
          id, email, password_hash, name, is_active, 
          profile_id, created_at, updated_at
        ) VALUES (
          $1, $2, $3, 'Administrador do Sistema', true,
          $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        );
        `,
        [adminUserId, adminEmail, passwordHash, adminProfileId]
      );
      console.log(`✅ Usuário administrador (${adminEmail}) criado.`);
    }

    // 6. Garantir vínculo na tabela user_profiles
    const userProfileCheck = await client.query(
      `SELECT id FROM user_profiles WHERE user_id = $1 AND profile_id = $2 LIMIT 1;`,
      [adminUserId, adminProfileId]
    );

    if (userProfileCheck.rows.length === 0) {
      await client.query(
        `
        INSERT INTO user_profiles (id, user_id, profile_id, is_default, created_at)
        VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP);
        `,
        [crypto.randomUUID(), adminUserId, adminProfileId]
      );
      console.log('✅ Vínculo de perfil em user_profiles criado com sucesso.');
    } else {
      await client.query(
        `UPDATE user_profiles SET is_default = true WHERE id = $1;`,
        [userProfileCheck.rows[0].id]
      );
    }

    console.log('\n🎉 Semeio concluído com sucesso!');
    console.log('----------------------------------------------------');
    console.log('Credenciais de Administrador:');
    console.log(`- E-mail: ${adminEmail}`);
    console.log(`- Senha:  ${adminPassword}`);
    console.log('----------------------------------------------------');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('❌ Erro ao semear o banco de dados:', err);
  process.exit(1);
});
