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
    // 1. Cria enums se não existirem
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE schedule_slot_type AS ENUM ('PRIMEIRA_VEZ', 'RETORNO', 'RESERVA_REGULADOR');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE schedule_slot_status AS ENUM ('DISPONIVEL', 'AGENDADO', 'CANCELADO', 'BLOQUEADO');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✓ Enums schedule_slot_type e schedule_slot_status verificados.');

    // 2. Cria tabela schedules
    await client.query(`
      CREATE TABLE IF NOT EXISTS schedules (
        id UUID PRIMARY KEY NOT NULL,
        executing_health_center_id UUID NOT NULL REFERENCES health_centers(id) ON UPDATE CASCADE ON DELETE CASCADE,
        procedure_id UUID NOT NULL REFERENCES procedures(id) ON UPDATE CASCADE ON DELETE CASCADE,
        doctor_id UUID NOT NULL REFERENCES doctors(id) ON UPDATE CASCADE ON DELETE CASCADE,
        cbo TEXT NOT NULL,

        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,

        days_of_week TEXT[] NOT NULL,

        first_time_quantity INTEGER NOT NULL DEFAULT 0,
        first_time_minutes INTEGER NOT NULL DEFAULT 0,
        return_quantity INTEGER NOT NULL DEFAULT 0,
        return_minutes INTEGER NOT NULL DEFAULT 0,
        regulator_reserved_quantity INTEGER NOT NULL DEFAULT 0,
        regulator_reserved_minutes INTEGER NOT NULL DEFAULT 0,

        auto_slot_split BOOLEAN NOT NULL DEFAULT false,
        is_local_schedule BOOLEAN NOT NULL DEFAULT false,
        is_active BOOLEAN NOT NULL DEFAULT true,
        notes TEXT,
        blocked_dates TEXT[] DEFAULT ARRAY[]::TEXT[],

        created_by_user_id UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS schedules_executing_center_idx ON schedules (executing_health_center_id);
      CREATE INDEX IF NOT EXISTS schedules_doctor_idx ON schedules (doctor_id);
      CREATE INDEX IF NOT EXISTS schedules_procedure_idx ON schedules (procedure_id);
    `);
    console.log('✓ Tabela schedules e índices prontos.');

    // 3. Cria tabela schedule_slots
    await client.query(`
      CREATE TABLE IF NOT EXISTS schedule_slots (
        id UUID PRIMARY KEY NOT NULL,
        schedule_id UUID NOT NULL REFERENCES schedules(id) ON UPDATE CASCADE ON DELETE CASCADE,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        slot_type schedule_slot_type NOT NULL,
        status schedule_slot_status NOT NULL DEFAULT 'DISPONIVEL',

        regulation_request_id UUID REFERENCES regulation_requests(id) ON UPDATE CASCADE ON DELETE SET NULL,
        patient_id UUID REFERENCES patients(id) ON UPDATE CASCADE ON DELETE SET NULL,
        booked_by_user_id UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
        booked_at TIMESTAMP(3),

        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS schedule_slots_schedule_idx ON schedule_slots (schedule_id);
      CREATE INDEX IF NOT EXISTS schedule_slots_date_idx ON schedule_slots (date);
      CREATE INDEX IF NOT EXISTS schedule_slots_status_idx ON schedule_slots (status);
    `);
    console.log('✓ Tabela schedule_slots e índices prontos.');

    // 4. Criação das novas permissões
    const newPermissions = [
      { name: 'schedules:read', description: 'Visualizar agendas e escalas de atendimento' },
      { name: 'schedules:write', description: 'Criar e editar agendas e escalas de atendimento' },
      { name: 'schedules:delete', description: 'Excluir agendas e cancelar agendamentos' },
      { name: 'schedules:book', description: 'Realizar agendamento de requisição em vaga' },
    ];

    const permIds: Record<string, string> = {};

    for (const p of newPermissions) {
      const existing = await client.query(`SELECT id FROM permissions WHERE name = $1`, [p.name]);
      if (existing.rows.length === 0) {
        const id = randomUUID();
        await client.query(
          `INSERT INTO permissions (id, name, description, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
          [id, p.name, p.description]
        );
        permIds[p.name] = id;
        console.log(`✓ Permissão criada: ${p.name}`);
      } else {
        permIds[p.name] = existing.rows[0].id;
      }
    }

    // 5. Criação do perfil 'Coordenador de Unidade'
    let coordinatorProfileId = '';
    const coordCheck = await client.query(`SELECT id FROM profiles WHERE name = 'Coordenador de Unidade'`);
    if (coordCheck.rows.length === 0) {
      coordinatorProfileId = randomUUID();
      await client.query(
        `INSERT INTO profiles (id, name, description, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
        [coordinatorProfileId, 'Coordenador de Unidade', 'Gestor responsável por escalas, ambulatórios e agendamentos de uma unidade executante']
      );
      console.log('✓ Perfil "Coordenador de Unidade" criado.');
    } else {
      coordinatorProfileId = coordCheck.rows[0].id;
      console.log('ℹ Perfil "Coordenador de Unidade" já existe.');
    }

    // 6. Atribui permissões ao Coordenador de Unidade
    const coordPermissions = [
      'schedules:read',
      'schedules:write',
      'schedules:delete',
      'schedules:book',
      'rooms:read',
      'regulation-operator:read',
      'patients:read',
    ];

    for (const permName of coordPermissions) {
      const pRes = await client.query(`SELECT id FROM permissions WHERE name = $1`, [permName]);
      if (pRes.rows.length > 0) {
        const permId = pRes.rows[0].id;
        const linkCheck = await client.query(
          `SELECT 1 FROM profile_permissions WHERE profile_id = $1 AND permission_id = $2`,
          [coordinatorProfileId, permId]
        );
        if (linkCheck.rows.length === 0) {
          await client.query(
            `INSERT INTO profile_permissions (profile_id, permission_id) VALUES ($1, $2)`,
            [coordinatorProfileId, permId]
          );
        }
      }
    }
    console.log('✓ Permissões atribuídas ao perfil "Coordenador de Unidade".');

    // 7. Garante que o perfil 'Administrador' também receba as novas permissões de schedules
    const adminRes = await client.query(`SELECT id FROM profiles WHERE name = 'Administrador'`);
    if (adminRes.rows.length > 0) {
      const adminId = adminRes.rows[0].id;
      for (const p of newPermissions) {
        const permId = permIds[p.name];
        if (permId) {
          const linkCheck = await client.query(
            `SELECT 1 FROM profile_permissions WHERE profile_id = $1 AND permission_id = $2`,
            [adminId, permId]
          );
          if (linkCheck.rows.length === 0) {
            await client.query(
              `INSERT INTO profile_permissions (profile_id, permission_id) VALUES ($1, $2)`,
              [adminId, permId]
            );
          }
        }
      }
      console.log('✓ Permissões atribuídas ao perfil "Administrador".');
    }

    console.log('🚀 Migração de Agendas e Escalas finalizada com sucesso!');
  } catch (err) {
    console.error('Erro na migração:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
