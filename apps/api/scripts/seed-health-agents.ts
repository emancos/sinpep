import { Client } from 'pg';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config({ path: path.join(__dirname, '../.env') });

export interface AgentData {
  name: string;
  phoneRaw: string;
  phoneFormatted?: string;
  microArea: string;
}

export interface UnitData {
  name: string;
  searchKeywords: string[];
  neighborhood: string;
  nurse: string;
  agents: AgentData[];
}

export function formatPhone(raw: string): string {
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 8) {
    digits = '839' + digits;
  } else if (digits.length === 9) {
    digits = '83' + digits;
  } else if (digits.length === 10) {
    digits = digits.slice(0, 2) + '9' + digits.slice(2);
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  return raw;
}

/**
 * Carrega a lista de unidades e agentes comunitários de saúde:
 * 1. Prioriza o arquivo local não comitado 'seed-health-agents.local.json' (dados reais mantidos na máquina local).
 * 2. Em sua ausência (CI/homologação/repositório público), utiliza o arquivo modelo 'seed-health-agents.example.json' (dados anônimos).
 */
export function loadHealthUnitsData(): UnitData[] {
  const localFile = path.join(__dirname, 'seed-health-agents.local.json');
  const exampleFile = path.join(__dirname, 'seed-health-agents.example.json');

  let filePath = exampleFile;
  if (fs.existsSync(localFile)) {
    filePath = localFile;
    console.log(`🔒 [LGPD] Carregando dados de Agentes de Saúde locais de: ${path.basename(localFile)}`);
  } else if (fs.existsSync(exampleFile)) {
    filePath = exampleFile;
    console.log(`ℹ️ [LGPD] Carregando dados modelo anônimos de: ${path.basename(exampleFile)}`);
  } else {
    console.warn('⚠️ Nenhum arquivo de dados de agentes de saúde encontrado (.local.json ou .example.json).');
    return [];
  }

  try {
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    const parsed: UnitData[] = JSON.parse(rawContent);

    return parsed.map((unit) => ({
      ...unit,
      agents: unit.agents.map((ag) => ({
        ...ag,
        phoneFormatted: ag.phoneFormatted || formatPhone(ag.phoneRaw),
      })),
    }));
  } catch (err: any) {
    console.error(`❌ Erro ao ler arquivo de agentes de saúde (${filePath}):`, err.message);
    return [];
  }
}

export const HEALTH_UNITS_DATA: UnitData[] = loadHealthUnitsData();

export async function runSeed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL não configurada no arquivo .env.');
  }

  const client = new Client({ connectionString });
  await client.connect();

  console.log('🚀 Iniciando Seed dos Agentes de Saúde (ACS) e Unidades de Saúde...');

  try {
    const unitsData = loadHealthUnitsData();
    if (unitsData.length === 0) {
      console.warn('Nenhum dado de unidade ou agente para processar.');
      return;
    }

    // Buscar unidades existentes no banco
    const existingCentersRes = await client.query('SELECT id, name, cnes, nurse_name FROM health_centers');
    const existingCenters = existingCentersRes.rows;

    let unitsCreated = 0;
    let unitsUpdated = 0;
    let agentsCreated = 0;
    let agentsUpdated = 0;

    for (const unit of unitsData) {
      // 1. Tentar encontrar a unidade existente
      let matchedCenter = existingCenters.find((hc) => {
        const hcUpper = hc.name.toUpperCase();
        return unit.searchKeywords.every((kw) => hcUpper.includes(kw.toUpperCase()));
      });

      let healthCenterId: string;

      if (matchedCenter) {
        healthCenterId = matchedCenter.id;
        console.log(`\n🏥 Unidade encontrada: "${matchedCenter.name}" (ID: ${healthCenterId})`);

        // Atualizar enfermeira responsável se ainda não preenchida
        if (unit.nurse && !matchedCenter.nurse_name) {
          await client.query(
            `UPDATE health_centers SET nurse_name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [unit.nurse, healthCenterId]
          );
          console.log(`   ↳ Enfermeira(o) atualizada(o): ${unit.nurse}`);
          unitsUpdated++;
        }
      } else {
        // Criar a unidade caso não exista
        healthCenterId = randomUUID();
        const placeholderCnes = `99${Math.floor(10000 + Math.random() * 90000)}`;
        await client.query(
          `INSERT INTO health_centers (
            id, name, cnes, no_bairro, address, nurse_name,
            st_solicitante, is_active, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [healthCenterId, unit.name, placeholderCnes, unit.neighborhood, unit.neighborhood, unit.nurse]
        );
        console.log(`\n🏥 Unidade criada: "${unit.name}" (ID: ${healthCenterId})`);
        unitsCreated++;
      }

      // 2. Inserir ou atualizar os Agentes de Saúde
      for (const agent of unit.agents) {
        const existingAgentRes = await client.query(
          `SELECT id, name, phone, micro_area FROM health_agents 
           WHERE UPPER(name) = UPPER($1) AND health_center_id = $2`,
          [agent.name, healthCenterId]
        );

        const phoneFormatted = agent.phoneFormatted || formatPhone(agent.phoneRaw);

        if (existingAgentRes.rows.length > 0) {
          const existingAgent = existingAgentRes.rows[0];
          await client.query(
            `UPDATE health_agents 
             SET phone = $1, micro_area = $2, is_active = true, updated_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [phoneFormatted, agent.microArea, existingAgent.id]
          );
          console.log(`   🔄 ACS atualizado: ${agent.name} | ${phoneFormatted} | MA: ${agent.microArea}`);
          agentsUpdated++;
        } else {
          const agentId = randomUUID();
          await client.query(
            `INSERT INTO health_agents (
              id, name, phone, micro_area, health_center_id, is_active, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [agentId, agent.name, phoneFormatted, agent.microArea, healthCenterId]
          );
          console.log(`   ✨ ACS inserido: ${agent.name} | ${phoneFormatted} | MA: ${agent.microArea}`);
          agentsCreated++;
        }
      }
    }

    console.log('\n=========================================');
    console.log('🎉 Seed de Agentes de Saúde finalizado com sucesso!');
    console.log(`🏥 Unidades criadas: ${unitsCreated} | Unidades atualizadas: ${unitsUpdated}`);
    console.log(`👥 Agentes inseridos: ${agentsCreated} | Agentes atualizados: ${agentsUpdated}`);
    console.log('=========================================\n');
  } catch (error) {
    console.error('❌ Erro durante a execução do seed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Se executado diretamente via CLI
if (require.main === module) {
  runSeed().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
