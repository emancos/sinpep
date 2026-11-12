import { Client } from 'pg';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config({ path: path.join(__dirname, '../.env') });

export interface AgentData {
  name: string;
  phoneRaw: string;
  phoneFormatted: string;
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

export const HEALTH_UNITS_DATA: UnitData[] = [
  {
    name: 'PSF RITA FERNANDES DE LIMA',
    searchKeywords: ['RITA', 'FERNANDES'],
    neighborhood: 'BAIRRO LOTEAMENTO PORTAL',
    nurse: 'JOSEFA SOARES DE SOUSA',
    agents: [
      { name: 'IZENEIDE CLEMENTEINO ASSIS', phoneRaw: '99832-0538', phoneFormatted: formatPhone('99832-0538'), microArea: '22' },
      { name: 'RAIMUNDO MARCIO S. MAIA (MARCINHO)', phoneRaw: '99915-1219', phoneFormatted: formatPhone('99915-1219'), microArea: '58' },
      { name: 'JOSICLEIDE DANTAS DE ARAUJO (CLEIDE)', phoneRaw: '99621-9069', phoneFormatted: formatPhone('99621-9069'), microArea: '23' },
      { name: 'FRANCINALDO MOURA DA COSTA', phoneRaw: '99996-4099', phoneFormatted: formatPhone('99996-4099'), microArea: '51' },
      { name: 'RYDAN', phoneRaw: '99639-4322', phoneFormatted: formatPhone('99639-4322'), microArea: '59' },
    ],
  },
  {
    name: 'PSF BENEDITO PEDRO DA SILVA',
    searchKeywords: ['BENEDITO', 'PEDRO'],
    neighborhood: 'BAIRRO SÃO BERNARDO 1',
    nurse: 'LUCICARLA S. DA S. MENDES',
    agents: [
      { name: 'AGLAIZE DOS SANTOS CAVALCANTE GUEDES', phoneRaw: '99994-4448', phoneFormatted: formatPhone('99994-4448'), microArea: '56' },
      { name: 'MARA CRISTINA TEIXEIRA DA SILVA', phoneRaw: '99928-4788', phoneFormatted: formatPhone('99928-4788'), microArea: '31' },
      { name: 'DINAIR CARNEIRO DOS SANTOS', phoneRaw: '99988-4899', phoneFormatted: formatPhone('99988-4899'), microArea: '29' },
      { name: 'DILENE ALVES FERNANDES', phoneRaw: '99686-9429', phoneFormatted: formatPhone('99686-9429'), microArea: '50' },
      { name: 'MARIA ANA DE ANDRADE', phoneRaw: '99619-8988', phoneFormatted: formatPhone('99619-8988'), microArea: '26' },
      { name: 'RAFAEL JEFFERSON DOS SANTOS PEREIRA', phoneRaw: '99900-9391', phoneFormatted: formatPhone('99900-9391'), microArea: '74' },
    ],
  },
  {
    name: 'PSF FRANCISCO JUNQUEIRA DOS SANTOS',
    searchKeywords: ['FRANCISCO', 'JUNQUEIRA'],
    neighborhood: 'COMUNIDADE BARRA DE CIMA',
    nurse: 'NADILZA ALVES DE OLIVEIRA',
    agents: [
      { name: 'JACKES JOSÉ DOS SANTOS', phoneRaw: '99968-4830', phoneFormatted: formatPhone('99968-4830'), microArea: '60' },
      { name: 'ALINE SALES DANTAS', phoneRaw: '99947-7923', phoneFormatted: formatPhone('99947-7923'), microArea: '20' },
      { name: 'EMMANUEL (SUBS. JOSENILDA)', phoneRaw: '99681-8616', phoneFormatted: formatPhone('99681-8616'), microArea: '01' },
      { name: 'JOSELITA CARLOS SILVA DOS SANTOS', phoneRaw: '99975-4582', phoneFormatted: formatPhone('99975-4582'), microArea: '02' },
    ],
  },
  {
    name: 'PSF DR. JOSE MAIA DA CRUZ',
    searchKeywords: ['MAIA', 'CRUZ'],
    neighborhood: 'BAIRRO CENTRO',
    nurse: 'JANAINA SOARES DE ARAUJO',
    agents: [
      { name: 'PETRÔNIO ALMEIDA DE SOUSA', phoneRaw: '99920-2975', phoneFormatted: formatPhone('99920-2975'), microArea: '62' },
      { name: 'FRANCILMA MARIA DOS S. ALVES (CILMA)', phoneRaw: '99926-5637', phoneFormatted: formatPhone('99926-5637'), microArea: '38' },
      { name: 'PATRICIA OLIVEIRA DA SILVA', phoneRaw: '98725-7784', phoneFormatted: formatPhone('98725-7784'), microArea: '34' },
      { name: 'EUNICE MARQUES DOS SANTOS SILVA', phoneRaw: '99607-3185', phoneFormatted: formatPhone('99607-3185'), microArea: '37' },
      { name: 'JOSE CARLOS MONTEIRO DOS SANTOS', phoneRaw: '99658-6322', phoneFormatted: formatPhone('99658-6322'), microArea: '33' },
    ],
  },
  {
    name: 'PSF JOSE BORGES DA SILVA',
    searchKeywords: ['BORGES'],
    neighborhood: 'BAIRRO HERCULANO',
    nurse: 'RITA DE CÁSSIA PATRICIO.',
    agents: [
      { name: 'ERINALDO RODRIGUES DA SILVA', phoneRaw: '99603-5549', phoneFormatted: formatPhone('99603-5549'), microArea: '48' },
      { name: 'GERLANDI BATISTA A. CAMPOS (JANDA)', phoneRaw: '99629-7095', phoneFormatted: formatPhone('99629-7095'), microArea: '64' },
      { name: 'ADAILTON RODRIGUES BEZERRA', phoneRaw: '99654-3256', phoneFormatted: formatPhone('99654-3256'), microArea: '47' },
      { name: 'ADEILTO VIEIRA DA COSTA', phoneRaw: '99670-0818', phoneFormatted: formatPhone('99670-0818'), microArea: '41' },
      { name: 'CLEDIANE MEDEIROS D. DE ARAUJO', phoneRaw: '99809-2150', phoneFormatted: formatPhone('99809-2150'), microArea: '52' },
      { name: 'KALIANE MARIA DA SILVA', phoneRaw: '99601-8476', phoneFormatted: formatPhone('99601-8476'), microArea: '42' },
    ],
  },
  {
    name: 'PSF SEVERINO PEDRO DE SOUSA',
    searchKeywords: ['SEVERINO', 'PEDRO'],
    neighborhood: 'BAIRRO SÃO BENTINHO 1° / ANCORA (JENIPAPO DOS LUCIOS)',
    nurse: 'THIAGO DOS SANTOS OLIVEIRA',
    agents: [
      { name: 'JESSICA FERREIRA DAS ILVA', phoneRaw: '99695-9598', phoneFormatted: formatPhone('99695-9598'), microArea: '10' },
      { name: 'MARIA DO SOCORRO DA SILVA HENRIQUE', phoneRaw: '99869-7643', phoneFormatted: formatPhone('99869-7643'), microArea: '44' },
      { name: 'CREUZIFRAN BEZERRA GOMES DA SILVA (KEL)', phoneRaw: '99654-9057', phoneFormatted: formatPhone('99654-9057'), microArea: '66' },
      { name: 'JOSÉ ONETO DE ANDRADE', phoneRaw: '99632-9540', phoneFormatted: formatPhone('99632-9540'), microArea: '13' },
      { name: 'MARIA JOELMA LUCIO DA SILVA', phoneRaw: '99964-7347', phoneFormatted: formatPhone('99964-7347'), microArea: '08' },
      { name: 'EDIMUNDO DE OLIVEIRA SILVA (CONT)', phoneRaw: '99988-4819', phoneFormatted: formatPhone('99988-4819'), microArea: '07' },
      { name: 'MARLEIDE CAVALCANTE DE FRANÇA', phoneRaw: '99807-6983', phoneFormatted: formatPhone('99807-6983'), microArea: '68' },
      { name: 'FAGNER FELIX DA SILVA', phoneRaw: '98201-4326', phoneFormatted: formatPhone('98201-4326'), microArea: '14' },
    ],
  },
  {
    name: 'PSF EULAMPIO CANDIDO DA SILVA',
    searchKeywords: ['EULAMPIO'],
    neighborhood: 'BAIRRO CENTRO',
    nurse: 'THEREZA EDITE.',
    agents: [
      { name: 'FRANCISCA MARTA S. ALMEIDA', phoneRaw: '99685-9306', phoneFormatted: formatPhone('99685-9306'), microArea: '61' },
      { name: 'GABRIELLE SANTANA FLORES', phoneRaw: '99600-6678', phoneFormatted: formatPhone('99600-6678'), microArea: '53' },
      { name: 'ANDERSON ALVES DA SILVA', phoneRaw: '99680-7920', phoneFormatted: formatPhone('99680-7920'), microArea: '75' },
      { name: 'RAMIRES JULIANA DE LIMA ARAUJO', phoneRaw: '99919-2422', phoneFormatted: formatPhone('99919-2422'), microArea: '69' },
      { name: 'DELMARI BEZERRA GOMES (DELMA)', phoneRaw: '99996-8162', phoneFormatted: formatPhone('99996-8162'), microArea: '36' },
    ],
  },
  {
    name: 'PSF ANTONIO VIEIRA DOS SANTOS',
    searchKeywords: ['ANTONIO', 'VIEIRA'],
    neighborhood: 'BAIRRO DÃO SILVEIRA',
    nurse: 'DANIELE NOGUEIRA ALVES',
    agents: [
      { name: 'SEBASTIÃO MOURA DE ASSIS (BASTOS)', phoneRaw: '99910-4567', phoneFormatted: formatPhone('99910-4567'), microArea: '63' },
      { name: 'MARIA DE LOURDES LUCIO (LOURDINHA)', phoneRaw: '99905-0190', phoneFormatted: formatPhone('99905-0190'), microArea: '24' },
      { name: 'LAÉDNA VIEIRA DANTAS DE ALMEIDA', phoneRaw: '99608-2832', phoneFormatted: formatPhone('99608-2832'), microArea: '32' },
      { name: 'IVONÉLIA DOS SANTOS ALVES', phoneRaw: '99963-9627', phoneFormatted: formatPhone('99963-9627'), microArea: '09' },
      { name: 'JOYCIEL DA SILVA FURTUNATO', phoneRaw: '99993-1217', phoneFormatted: formatPhone('99993-1217'), microArea: '71' },
    ],
  },
  {
    name: 'PSF MARIA EUNICE DE SOUSA',
    searchKeywords: ['EUNICE'],
    neighborhood: 'BAIRRO RUA DO RIO',
    nurse: 'GILDARIA MARTIN SOUSA',
    agents: [
      { name: 'MARIA DE LOURDES SOUSA', phoneRaw: '99932-4688', phoneFormatted: formatPhone('99932-4688'), microArea: '40' },
      { name: 'ANA MARIA FREITAS DA SILVA', phoneRaw: '98142-0983', phoneFormatted: formatPhone('98142-0983'), microArea: '65' },
      { name: 'RITA REJANE MEDEIROS DO NASCIMENTO', phoneRaw: '99967-2588', phoneFormatted: formatPhone('99967-2588'), microArea: '39' },
      { name: 'FLAMARION ROGERS DE MACEDO', phoneRaw: '99618-3150', phoneFormatted: formatPhone('99618-3150'), microArea: '46' },
      { name: 'CÍCERO TAVARES DA SILVA SEGUNDO (LICO)', phoneRaw: '99928-9958', phoneFormatted: formatPhone('99928-9958'), microArea: '35' },
    ],
  },
  {
    name: 'PSF BERNARDO VIEIRA DOS SANTOS FILHOS',
    searchKeywords: ['BERNARDO', 'VIEIRA'],
    neighborhood: 'BAIRRO SÃO BERNARDO 2',
    nurse: 'IAMA CRISTINA B. DUTRA',
    agents: [
      { name: 'MARIA APARECIDA DA ROCHA DE ALMEIDA', phoneRaw: '99915-9268', phoneFormatted: formatPhone('99915-9268'), microArea: '57' },
      { name: 'LARISSA MURIELY DOS SANTOS GOMES', phoneRaw: '99825-2860', phoneFormatted: formatPhone('99825-2860'), microArea: '55' },
      { name: 'LAÉCIO CABRAL DA CUNHA', phoneRaw: '99986-9594', phoneFormatted: formatPhone('99986-9594'), microArea: '27' },
      { name: 'ANDERSON DA SILVA MARIZ', phoneRaw: '99639-9418', phoneFormatted: formatPhone('99639-9418'), microArea: '28' },
      { name: 'ANDERSON ALVES DO NASCIMENTO', phoneRaw: '99802-5226', phoneFormatted: formatPhone('99802-5226'), microArea: '30' },
      { name: 'MARCOS SILVIO DANTAS DE ARAUJO', phoneRaw: '99911-1182', phoneFormatted: formatPhone('99911-1182'), microArea: '73' },
    ],
  },
  {
    name: 'PSF JOSE MIGUEL DE ARAUJO',
    searchKeywords: ['MIGUEL'],
    neighborhood: 'COMUNIDADE XIQUE-XIQUE / ANCORA (VARZEA GRANDE) FRANCIMAR MEDEIROS DE ARAUJO',
    nurse: 'KATARINA ALVES DE ARAUJO',
    agents: [
      { name: 'GILBERTO FARIAS DA SILVA (GIL)', phoneRaw: '99608-2128', phoneFormatted: formatPhone('99608-2128'), microArea: '45' },
      { name: 'DIJANETE MEDEIROS DE ARAUJO', phoneRaw: '99984-5179', phoneFormatted: formatPhone('99984-5179'), microArea: '03' },
      { name: 'MARILEUZA CLEMENTINO DA SILVA', phoneRaw: '99924-1255', phoneFormatted: formatPhone('99924-1255'), microArea: '04' },
      { name: 'SANDEILMA RODRIGUES DE LIMA', phoneRaw: '99664-1477', phoneFormatted: formatPhone('99664-1477'), microArea: '05' },
    ],
  },
  {
    name: 'PSF MANOEL CICERO DANTAS',
    searchKeywords: ['MANOEL', 'CICERO', 'CÍCERO'],
    neighborhood: 'COMUNIDADE SÃO BENTINHO 2 / ANCORA (SARAIVA)',
    nurse: 'MARIA SILVA RODRIGUES',
    agents: [
      { name: 'JANAILTON DINIZ DA SILVA', phoneRaw: '99869-5053', phoneFormatted: formatPhone('99869-5053'), microArea: '70' },
      { name: 'WELLIGTON (SUBS. GENILSON)', phoneRaw: '99862-0616', phoneFormatted: formatPhone('99862-0616'), microArea: '12' },
      { name: 'WELLIGTON', phoneRaw: '99862-0616', phoneFormatted: formatPhone('99862-0616'), microArea: '06' },
      { name: 'JOSENILDO (SUBS. MARIA GOMES)', phoneRaw: '99687-1412', phoneFormatted: formatPhone('99687-1412'), microArea: '43' },
      { name: 'ANTONIO FERNANDES LIMA', phoneRaw: '99655-7633', phoneFormatted: formatPhone('99655-7633'), microArea: '72' },
      { name: 'IZONEIDE AMBROSINA DA SILVA', phoneRaw: '99853-9687', phoneFormatted: formatPhone('99853-9687'), microArea: '11' },
      { name: 'ANGELA FARIAS VIDAL', phoneRaw: '99633-7257', phoneFormatted: formatPhone('99633-7257'), microArea: '49' },
    ],
  },
  {
    name: 'PSF JARDILINA DOS SANTOS',
    searchKeywords: ['JARDILINA'],
    neighborhood: 'BAIRRO BELARMINIO LUCIO',
    nurse: 'ZAYHAMA ZARLLY LIMA',
    agents: [
      { name: 'SERGIO MURILO PEREIRA DA COSTA', phoneRaw: '9994-8869', phoneFormatted: formatPhone('9994-8869'), microArea: '77' },
      { name: 'JOSÉ DOS SANTOS (ZÉ DA SAÚDE)', phoneRaw: '99993-3916', phoneFormatted: formatPhone('99993-3916'), microArea: '25' },
      { name: 'SEBASTIÃO ALBINO DOS SANTOS (BASTIÃO)', phoneRaw: '99666-4299', phoneFormatted: formatPhone('99666-4299'), microArea: '76' },
      { name: 'DALIANE DE ARAUJO GOMES', phoneRaw: '98205-6424', phoneFormatted: formatPhone('98205-6424'), microArea: '21' },
      { name: 'FRANCISCA DE CÁSSIA P. MORAIS (CÁSSIA)', phoneRaw: '99907-0231', phoneFormatted: formatPhone('99907-0231'), microArea: '54' },
    ],
  },
  {
    name: 'PSF JOAO CRUZ NETO',
    searchKeywords: ['JOAO', 'JOÃO', 'CRUZ', 'NETO'],
    neighborhood: 'COMUNIDADE SÃO JOSÉ',
    nurse: 'JESSICA MAYARA ALMEIDA SILVA',
    agents: [
      { name: 'SILVIO RODRIGUES FILHO', phoneRaw: '99986-9611', phoneFormatted: formatPhone('99986-9611'), microArea: '19' },
      { name: 'RITA CUNHA PEREIRA', phoneRaw: '99655-5541', phoneFormatted: formatPhone('99655-5541'), microArea: '18' },
      { name: 'ERCÍLIA ISABEL NETA', phoneRaw: '99632-8739', phoneFormatted: formatPhone('99632-8739'), microArea: '78' },
      { name: 'MARIA SANDRA ALVES DE ARAUJO', phoneRaw: '99603-4988', phoneFormatted: formatPhone('99603-4988'), microArea: '79' },
      { name: 'FRANCILMA (SUBS. JEFFERSON)', phoneRaw: '99926-5637', phoneFormatted: formatPhone('99926-5637'), microArea: '80' },
    ],
  },
  {
    name: 'PSF JOSINEIDE ALMEIDA DA SILVA',
    searchKeywords: ['JOSINEIDE'],
    neighborhood: 'COMUNIDADE SÃO BENTO DE BAIXO',
    nurse: 'ANA SANTANA JUNQUEIRA SANTOS',
    agents: [
      { name: 'JOÃO ALVES DA CRUZ (JOAZINHO)', phoneRaw: '99977-8787', phoneFormatted: formatPhone('99977-8787'), microArea: '16' },
      { name: 'IARA LIANDRO DA SILVA', phoneRaw: '99849-4158', phoneFormatted: formatPhone('99849-4158'), microArea: '15' },
      { name: 'AUCICLEIDE MARIA FERREIRA DA SILVA', phoneRaw: '99818-7147', phoneFormatted: formatPhone('99818-7147'), microArea: '17' },
      { name: 'MARTA JOSIENE SALES DE MEDEIROS', phoneRaw: '99936-7839', phoneFormatted: formatPhone('99936-7839'), microArea: '67' },
    ],
  },
];

export async function runSeed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL não configurada no arquivo .env.');
  }

  const client = new Client({ connectionString });
  await client.connect();

  console.log('🚀 Iniciando Seed dos Agentes de Saúde (ACS) e Unidades de Saúde...');

  try {
    // Buscar unidades existentes no banco
    const existingCentersRes = await client.query('SELECT id, name, cnes, nurse_name FROM health_centers');
    const existingCenters = existingCentersRes.rows;

    let unitsCreated = 0;
    let unitsUpdated = 0;
    let agentsCreated = 0;
    let agentsUpdated = 0;

    for (const unit of HEALTH_UNITS_DATA) {
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

        if (existingAgentRes.rows.length > 0) {
          const existingAgent = existingAgentRes.rows[0];
          await client.query(
            `UPDATE health_agents 
             SET phone = $1, micro_area = $2, is_active = true, updated_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [agent.phoneFormatted, agent.microArea, existingAgent.id]
          );
          console.log(`   🔄 ACS atualizado: ${agent.name} | ${agent.phoneFormatted} | MA: ${agent.microArea}`);
          agentsUpdated++;
        } else {
          const agentId = randomUUID();
          await client.query(
            `INSERT INTO health_agents (
              id, name, phone, micro_area, health_center_id, is_active, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [agentId, agent.name, agent.phoneFormatted, agent.microArea, healthCenterId]
          );
          console.log(`   ✨ ACS inserido: ${agent.name} | ${agent.phoneFormatted} | MA: ${agent.microArea}`);
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

