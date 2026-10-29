import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function parseCSVLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ';' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur);
  return result;
}

const dosageRegex = /\b(\d+(?:[.,]\d+)?\s*(?:mg(?:\/ml|\/g)?|mcg(?:\/ml)?|g(?:\/env)?|ui(?:\/ml)?|ml|%))\b/i;

async function main() {
  const csvPath = 'd:\\Projetos\\sinpep\\scratch\\DADOS_ABERTOS_MEDICAMENTOS.csv';
  if (!fs.existsSync(csvPath)) {
    console.error(`Arquivo não encontrado: ${csvPath}`);
    process.exit(1);
  }

  console.log('--- Iniciando Carga e Normalização de Medicamentos ANVISA ---');
  console.log(`Lendo arquivo: ${csvPath}`);

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();
  console.log('Conectado ao PostgreSQL.');

  // Passo 1: Leitura das Dimensões (Laboratórios e Substâncias)
  console.log('Passo 1/3: Mapeando laboratórios e princípios ativos únicos...');
  const labMapByCnpj = new Map<string, string>(); // cnpj -> corporateName
  const substanceMapByName = new Map<string, string | null>(); // name -> code

  const stream1 = fs.createReadStream(csvPath, { encoding: 'latin1' });
  const rl1 = readline.createInterface({ input: stream1, crlfDelay: Infinity });

  let headers: string[] | null = null;
  let multilineBuffer = '';
  let inQuotes = false;

  for await (const line of rl1) {
    if (!headers) {
      headers = parseCSVLine(line).map(h => h.trim());
      continue;
    }

    if (inQuotes) {
      multilineBuffer += '\n' + line;
    } else {
      multilineBuffer = line;
    }

    let quoteCount = 0;
    for (let i = 0; i < multilineBuffer.length; i++) {
      if (multilineBuffer[i] === '"') quoteCount++;
    }
    inQuotes = quoteCount % 2 !== 0;

    if (!inQuotes) {
      const f = parseCSVLine(multilineBuffer);
      const cnpj = (f[5] || '').trim();
      const labName = (f[2] || '').trim();
      const subs = (f[40] || '').trim();
      const subCode = (f[30] || '').trim();

      if (cnpj && labName) {
        if (!labMapByCnpj.has(cnpj)) {
          labMapByCnpj.set(cnpj, labName);
        }
      }

      if (subs) {
        // Substance can be a comma-separated list
        const parts = subs.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        for (const p of parts) {
          if (!substanceMapByName.has(p)) {
            substanceMapByName.set(p, subCode || null);
          }
        }
      }

      multilineBuffer = '';
    }
  }

  console.log(`Encontrados ${labMapByCnpj.size} laboratórios únicos e ${substanceMapByName.size} substâncias únicas.`);

  // Inserção de Laboratórios
  console.log('Inserindo laboratórios no banco de dados...');
  const labIdMap = new Map<string, string>(); // cnpj -> id
  const existingLabs = await client.query('SELECT id, cnpj FROM medicine_laboratories;');
  for (const row of existingLabs.rows) {
    labIdMap.set(row.cnpj, row.id);
  }

  const newLabs = Array.from(labMapByCnpj.entries()).filter(([cnpj]) => !labIdMap.has(cnpj));
  if (newLabs.length > 0) {
    const chunkSize = 500;
    for (let i = 0; i < newLabs.length; i += chunkSize) {
      const chunk = newLabs.slice(i, i + chunkSize);
      const values: any[] = [];
      const placeholders: string[] = [];
      let pIdx = 1;

      for (const [cnpj, name] of chunk) {
        const id = crypto.randomUUID();
        values.push(id, cnpj, name);
        placeholders.push(`($${pIdx++}, $${pIdx++}, $${pIdx++})`);
        labIdMap.set(cnpj, id);
      }

      await client.query(`
        INSERT INTO medicine_laboratories (id, cnpj, corporate_name)
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (cnpj) DO UPDATE SET corporate_name = EXCLUDED.corporate_name;
      `, values);
    }
  }
  console.log(`Total de ${labIdMap.size} laboratórios prontos em cache.`);

  // Inserção de Substâncias
  console.log('Inserindo substâncias no banco de dados...');
  const substanceIdMap = new Map<string, string>(); // name -> id
  const existingSubs = await client.query('SELECT id, name FROM medicine_substances;');
  for (const row of existingSubs.rows) {
    substanceIdMap.set(row.name, row.id);
  }

  const newSubs = Array.from(substanceMapByName.entries()).filter(([name]) => !substanceIdMap.has(name));
  if (newSubs.length > 0) {
    const chunkSize = 500;
    for (let i = 0; i < newSubs.length; i += chunkSize) {
      const chunk = newSubs.slice(i, i + chunkSize);
      const values: any[] = [];
      const placeholders: string[] = [];
      let pIdx = 1;

      for (const [name, code] of chunk) {
        const id = crypto.randomUUID();
        values.push(id, name, code);
        placeholders.push(`($${pIdx++}, $${pIdx++}, $${pIdx++})`);
        substanceIdMap.set(name, id);
      }

      await client.query(`
        INSERT INTO medicine_substances (id, name, code)
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (name) DO UPDATE SET code = COALESCE(EXCLUDED.code, medicine_substances.code);
      `, values);
    }
  }
  console.log(`Total de ${substanceIdMap.size} substâncias prontas em cache.`);

  // Passo 2: Carga dos Medicamentos
  console.log('Passo 2/3: Inserindo medicamentos da ANVISA com busca e dosagens...');
  
  // Limpar dados anteriores para carga limpa e consistente
  console.log('Limpando tabela medications e associações anteriores...');
  await client.query('TRUNCATE TABLE medication_substances, medications CASCADE;');

  const stream2 = fs.createReadStream(csvPath, { encoding: 'latin1' });
  const rl2 = readline.createInterface({ input: stream2, crlfDelay: Infinity });

  headers = null;
  multilineBuffer = '';
  inQuotes = false;

  let totalProcessed = 0;
  const BATCH_SIZE = 1000;
  let batchMeds: any[] = [];
  let batchJunctions: any[] = [];

  async function flushBatch() {
    if (batchMeds.length === 0) return;

    // Inserir medications
    const medValues: any[] = [];
    const medPlaceholders: string[] = [];
    let pIdx = 1;

    for (const m of batchMeds) {
      medValues.push(
        m.id,
        m.name,
        m.processNumber,
        m.registrationNumber,
        m.laboratoryId,
        m.category,
        m.referenceMedicine,
        m.stripe,
        m.status,
        m.isActive,
        m.substanceDescription,
        m.dosage,
        m.substanceWithDosage,
        m.complement,
        m.atcCode,
        m.searchText
      );

      medPlaceholders.push(`(
        $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, 
        $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, 
        $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}
      )`);
    }

    await client.query(`
      INSERT INTO medications (
        id, name, process_number, registration_number, laboratory_id,
        category, reference_medicine, stripe, status, is_active,
        substance_description, dosage, substance_with_dosage, complement,
        atc_code, search_text
      ) VALUES ${medPlaceholders.join(', ')};
    `, medValues);

    // Inserir junction medication_substances
    if (batchJunctions.length > 0) {
      const juncValues: any[] = [];
      const juncPlaceholders: string[] = [];
      let jIdx = 1;

      for (const j of batchJunctions) {
        juncValues.push(j.medicationId, j.substanceId, j.dosage);
        juncPlaceholders.push(`($${jIdx++}, $${jIdx++}, $${jIdx++})`);
      }

      await client.query(`
        INSERT INTO medication_substances (medication_id, substance_id, dosage)
        VALUES ${juncPlaceholders.join(', ')}
        ON CONFLICT DO NOTHING;
      `, juncValues);
    }

    totalProcessed += batchMeds.length;
    batchMeds = [];
    batchJunctions = [];

    if (totalProcessed % 25000 === 0) {
      console.log(`Processados e inseridos ${totalProcessed.toLocaleString('pt-BR')} medicamentos...`);
    }
  }

  for await (const line of rl2) {
    if (!headers) {
      headers = parseCSVLine(line).map(h => h.trim());
      continue;
    }

    if (inQuotes) {
      multilineBuffer += '\n' + line;
    } else {
      multilineBuffer = line;
    }

    let quoteCount = 0;
    for (let i = 0; i < multilineBuffer.length; i++) {
      if (multilineBuffer[i] === '"') quoteCount++;
    }
    inQuotes = quoteCount % 2 !== 0;

    if (!inQuotes) {
      const f = parseCSVLine(multilineBuffer);
      const processNumber = (f[0] || '').trim() || null;
      const labName = (f[2] || '').trim();
      const cnpj = (f[5] || '').trim();
      const name = (f[6] || '').trim();
      const registrationNumber = (f[8] || '').trim() || null;
      const category = (f[16] || '').trim() || null;
      const referenceMedicine = (f[17] || '').trim() || null;
      const notifiedProduct = (f[20] || '').trim();
      const stripe = (f[34] || '').trim() || null;
      const complement = (f[37] || '').trim() || null;
      const substanceDescription = (f[40] || '').trim() || null;
      const status = (f[41] || '').trim() || 'Ativo';
      const atcCode = (f[29] || '').trim() || null;

      if (!name) {
        multilineBuffer = '';
        continue;
      }

      const medId = crypto.randomUUID();
      const laboratoryId = cnpj ? (labIdMap.get(cnpj) || null) : null;
      const isActive = status.toLowerCase() === 'ativo';

      // Extração de dosagem
      const matchComp = complement ? complement.match(dosageRegex) : null;
      const matchProd = name.match(dosageRegex);
      const matchNotif = notifiedProduct ? notifiedProduct.match(dosageRegex) : null;
      const matchRef = referenceMedicine ? referenceMedicine.match(dosageRegex) : null;

      const dosage = matchComp ? matchComp[1] : (matchProd ? matchProd[1] : (matchNotif ? matchNotif[1] : (matchRef ? matchRef[1] : null)));

      // Formatação da substância com dosagem (comentário aprovado pelo usuário)
      let substanceWithDosage: string | null = null;
      if (substanceDescription) {
        if (dosage) {
          substanceWithDosage = `${substanceDescription} ${dosage}`;
        } else if (complement && complement.length <= 40) {
          substanceWithDosage = `${substanceDescription} (${complement})`;
        } else {
          substanceWithDosage = substanceDescription;
        }
      }

      // Campo de busca normalizado sem acentos
      const searchParts = [
        name,
        substanceWithDosage || substanceDescription || '',
        dosage || '',
        complement || '',
        referenceMedicine || '',
        labName || ''
      ].filter(Boolean).join(' ');

      const searchText = removeAccents(searchParts);

      batchMeds.push({
        id: medId,
        name,
        processNumber,
        registrationNumber,
        laboratoryId,
        category,
        referenceMedicine,
        stripe,
        status,
        isActive,
        substanceDescription,
        dosage,
        substanceWithDosage,
        complement,
        atcCode,
        searchText
      });

      // Relacionar com substâncias únicas
      if (substanceDescription) {
        const parts = substanceDescription.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        for (const p of parts) {
          const subId = substanceIdMap.get(p);
          if (subId) {
            batchJunctions.push({
              medicationId: medId,
              substanceId: subId,
              dosage
            });
          }
        }
      }

      if (batchMeds.length >= BATCH_SIZE) {
        await flushBatch();
      }

      multilineBuffer = '';
    }
  }

  // Despejar último lote
  if (batchMeds.length > 0) {
    await flushBatch();
  }

  console.log(`\nPasso 3/3: Concluído! Total de ${totalProcessed.toLocaleString('pt-BR')} medicamentos importados com sucesso.`);
  
  // Contagens finais no banco
  const countRes = await client.query('SELECT COUNT(*) FROM medications;');
  const activeCountRes = await client.query('SELECT COUNT(*) FROM medications WHERE is_active = true;');
  const withDosageRes = await client.query('SELECT COUNT(*) FROM medications WHERE dosage IS NOT NULL;');

  console.log('--- RESUMO DA CARGA NO BANCO DE DADOS ---');
  console.log(`Total em medications: ${countRes.rows[0].count}`);
  console.log(`Medicamentos ativos: ${activeCountRes.rows[0].count}`);
  console.log(`Medicamentos com dosagem identificada: ${withDosageRes.rows[0].count}`);

  await client.end();
}

main().catch(err => {
  console.error('Erro na carga:', err);
  process.exit(1);
});

