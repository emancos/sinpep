import { Client } from 'pg';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  console.log('Seeding consultation procedures and doctor Monique...');

  // 1. Obter grupo 'CONSULTAS / ATENDIMENTOS / ACOMPANHAMENTOS'
  let groupRes = await c.query("SELECT id FROM procedure_groups WHERE name = 'CONSULTAS / ATENDIMENTOS / ACOMPANHAMENTOS' LIMIT 1");
  let groupId: string;
  if (groupRes.rows.length === 0) {
    groupId = randomUUID();
    await c.query(
      `INSERT INTO procedure_groups (id, name, group_code, is_active, updated_at) VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP)`,
      [groupId, 'CONSULTAS / ATENDIMENTOS / ACOMPANHAMENTOS', '0301']
    );
  } else {
    groupId = groupRes.rows[0].id;
  }

  // 2. Procedimentos de Consulta adicionais
  const consultationProcedures = [
    { code: '0301010072', name: 'CONSULTA EM DERMATOLOGIA' },
    { code: '0301010072', name: 'CONSULTA EM UROLOGIA' },
    { code: '0301010072', name: 'CONSULTA EM REUMATOLOGIA' },
    { code: '0301010072', name: 'CONSULTA EM ORTOPEDIA' },
    { code: '0301010072', name: 'CONSULTA EM GINECOLOGIA' },
    { code: '0301010072', name: 'CONSULTA EM PEDIATRIA' },
    { code: '0301010072', name: 'CONSULTA EM OFTALMOLOGIA' },
    { code: '0301010072', name: 'CONSULTA EM ENDOCRINOLOGIA' },
    { code: '0301010072', name: 'CONSULTA EM GASTROENTEROLOGIA' },
    { code: '0301010072', name: 'CONSULTA EM PSIQUIATRIA' },
    { code: '0301010072', name: 'CONSULTA EM OTORRINOLARINGOLOGIA' },
  ];

  for (const proc of consultationProcedures) {
    const existing = await c.query('SELECT id FROM procedures WHERE name = $1', [proc.name]);
    if (existing.rows.length === 0) {
      await c.query(
        `INSERT INTO procedures (
          id, code, name, procedure_group_id, gender_allowed, max_age, min_age,
          requires_regulation, max_returns, request_interval_days, consumption_type,
          sigtap_value, regulator_respects_quota, is_active, updated_at
        ) VALUES (
          $1, $2, $3, $4, 'AMBOS', 130, 0,
          true, 1, 30, 'POR_PACIENTE',
          '0.00', true, true, CURRENT_TIMESTAMP
        )`,
        [randomUUID(), proc.code, proc.name, groupId]
      );
      console.log(`✓ Procedimento criado: ${proc.name}`);
    }
  }

  // 3. Obter unidade 'POLICLINICA ROBERVAL MEDEIROS DE ARAUJO'
  const hcRes = await c.query("SELECT id FROM health_centers WHERE cnes = '2606712' LIMIT 1");
  const policlinicaId = hcRes.rows[0]?.id;

  // 4. Obter perfil 'Médico'
  const profRes = await c.query("SELECT id FROM profiles WHERE name = 'Médico' LIMIT 1");
  const doctorProfileId = profRes.rows[0]?.id;

  // 5. Obter especialidade 'MEDICO DERMATOLOGISTA' (CBO 225135)
  const dermRes = await c.query("SELECT id FROM specialties WHERE cbo = '225135' LIMIT 1");
  const dermSpecId = dermRes.rows[0]?.id;

  // 6. Cadastrar Dra. Monique de Oliveira Valdek se não existir
  if (policlinicaId && doctorProfileId && dermSpecId) {
    const checkMonique = await c.query("SELECT id FROM users WHERE name ILIKE '%MONIQUE DE OLIVEIRA VALDEK%'");
    if (checkMonique.rows.length === 0) {
      const userId = randomUUID();
      const doctorId = randomUUID();

      await c.query(
        `INSERT INTO users (id, name, email, password_hash, is_active, profile_id, health_center_id, updated_at)
         VALUES ($1, $2, $3, $4, true, $5, $6, CURRENT_TIMESTAMP)`,
        [
          userId,
          'MONIQUE DE OLIVEIRA VALDEK',
          'monique.valdek@sinpep.com.br',
          '$2b$10$wNqV5b.v7o8zW8D1eB7R3O5F5v1b0E3K5L7M9N1P3Q5R7S9T1U3V5', // dummy hash
          doctorProfileId,
          policlinicaId,
        ]
      );

      await c.query(
        `INSERT INTO doctors (id, user_id, crm, crm_state, attendance_type, is_active, updated_at)
         VALUES ($1, $2, $3, $4, 'AMBOS', true, CURRENT_TIMESTAMP)`,
        [doctorId, userId, '12345', 'PB']
      );

      await c.query(
        `INSERT INTO doctor_specialties (doctor_id, specialty_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [doctorId, dermSpecId]
      );

      console.log('✓ Dra. MONIQUE DE OLIVEIRA VALDEK cadastrada com sucesso na Policlínica Roberval Medeiros!');
    }
  }

  console.log('Seed de consultas e médicos executado com sucesso.');
  await c.end();
}

run();
