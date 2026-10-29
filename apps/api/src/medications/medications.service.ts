import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { sql } from 'drizzle-orm';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import * as fs from 'fs';
import * as readline from 'readline';
import * as crypto from 'crypto';

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

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
  nbsp: ' ',
  deg: '°',
  ordm: 'º',
  ordf: 'ª',
  Aacute: 'Á', á: 'á',
  Agrave: 'À', agrave: 'à',
  Acirc: 'Â', acirc: 'â',
  Atilde: 'Ã', atilde: 'ã',
  Eacute: 'É', eacute: 'é',
  Ecirc: 'Ê', ecirc: 'ê',
  Iacute: 'Í', iacute: 'í',
  Oacute: 'Ó', oacute: 'ó',
  Ocirc: 'Ô', ocirc: 'ô',
  Otilde: 'Õ', otilde: 'õ',
  Uacute: 'Ú', uacute: 'ú',
  Uuml: 'Ü', uuml: 'ü',
  Ccedil: 'Ç', ccedil: 'ç',
};

export function decodeHtmlEntities(str?: string | null): string {
  if (!str) return '';
  let decoded = str
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = parseInt(dec, 10);
      return !isNaN(code) ? String.fromCharCode(code) : _;
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = parseInt(hex, 16);
      return !isNaN(code) ? String.fromCharCode(code) : _;
    })
    .replace(/&([a-zA-Z]+);/g, (match, entity) => {
      return NAMED_ENTITIES[entity] ?? match;
    });

  if (decoded.includes('&#') || decoded.includes('&amp;')) {
    decoded = decoded
      .replace(/&#(\d+);/g, (_, dec) => {
        const code = parseInt(dec, 10);
        return !isNaN(code) ? String.fromCharCode(code) : _;
      })
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
        const code = parseInt(hex, 16);
        return !isNaN(code) ? String.fromCharCode(code) : _;
      })
      .replace(/&([a-zA-Z]+);/g, (match, entity) => {
        return NAMED_ENTITIES[entity] ?? match;
      });
  }

  return decoded;
}

@Injectable()
export class MedicationsService {
  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Fast autocomplete search used in forms
   */
  async search(query: string, activeOnly = true, limit = 30) {
    if (!query || query.trim().length < 2) {
      const activeCondition = activeOnly ? sql`WHERE m.is_active = true` : sql``;
      const res = await this.db.execute(sql`
        SELECT 
          m.id,
          m.name,
          m.substance_description as "substanceDescription",
          m.dosage,
          m.substance_with_dosage as "substanceWithDosage",
          m.category,
          m.stripe,
          m.is_active as "isActive",
          m.complement,
          l.corporate_name as "laboratory"
        FROM medications m
        LEFT JOIN medicine_laboratories l ON l.id = m.laboratory_id
        ${activeCondition}
        ORDER BY m.name ASC
        LIMIT ${limit};
      `);
      return res.rows.map(row => ({
        ...row,
        name: decodeHtmlEntities(row.name as string),
        substanceDescription: decodeHtmlEntities(row.substanceDescription as string),
        substanceWithDosage: decodeHtmlEntities(row.substanceWithDosage as string),
        complement: decodeHtmlEntities(row.complement as string),
        laboratory: decodeHtmlEntities(row.laboratory as string),
      }));
    }

    const clean = removeAccents(decodeHtmlEntities(query.trim()));
    const words = clean.split(/\s+/).filter(Boolean);

    const wordConditions = words.map(w => sql`m.search_text ILIKE ${'%' + w + '%'}`);
    const combinedWhere = sql.join(wordConditions, sql` AND `);
    const activeCondition = activeOnly ? sql`AND m.is_active = true` : sql``;
    const prefixMatch = words[0] + '%';

    const res = await this.db.execute(sql`
      SELECT 
        m.id,
        m.name,
        m.substance_description as "substanceDescription",
        m.dosage,
        m.substance_with_dosage as "substanceWithDosage",
        m.category,
        m.stripe,
        m.is_active as "isActive",
        m.complement,
        l.corporate_name as "laboratory"
      FROM medications m
      LEFT JOIN medicine_laboratories l ON l.id = m.laboratory_id
      WHERE (${combinedWhere}) ${activeCondition}
      ORDER BY 
        (m.name ILIKE ${prefixMatch}) DESC,
        m.is_active DESC,
        m.name ASC
      LIMIT ${limit};
    `);

    return res.rows.map(row => ({
      ...row,
      name: decodeHtmlEntities(row.name as string),
      substanceDescription: decodeHtmlEntities(row.substanceDescription as string),
      substanceWithDosage: decodeHtmlEntities(row.substanceWithDosage as string),
      complement: decodeHtmlEntities(row.complement as string),
      laboratory: decodeHtmlEntities(row.laboratory as string),
    }));
  }

  /**
   * Paginated listing for administrative management table
   */
  async findAll(query: PaginationQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    // Search filter
    if (query.search && query.search.trim()) {
      const clean = removeAccents(decodeHtmlEntities(query.search.trim()));
      const words = clean.split(/\s+/).filter(Boolean);
      if (words.length > 0) {
        const wordConditions = words.map(w => sql`m.search_text ILIKE ${'%' + w + '%'}`);
        conditions.push(sql`(${sql.join(wordConditions, sql` AND `)})`);
      }
    }

    // Status / includeInactive filter
    if (query.status === 'ativo') {
      conditions.push(sql`m.is_active = true`);
    } else if (query.status === 'inativo') {
      conditions.push(sql`m.is_active = false`);
    } else if (String(query.includeInactive) === 'true') {
      // Include all (active + inactive)
    } else {
      // Default: active only
      conditions.push(sql`m.is_active = true`);
    }

    const whereClause = conditions.length > 0
      ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
      : sql``;

    // Sorting
    const sortField = query.sortBy || 'name';
    const isDesc = query.sortOrder === 'desc';

    let orderByClause = isDesc ? sql`m.name DESC` : sql`m.name ASC`;
    if (sortField === 'category') {
      orderByClause = isDesc ? sql`m.category DESC, m.name ASC` : sql`m.category ASC, m.name ASC`;
    } else if (sortField === 'status' || sortField === 'isActive') {
      orderByClause = isDesc ? sql`m.is_active DESC, m.name ASC` : sql`m.is_active ASC, m.name ASC`;
    } else if (sortField === 'createdAt') {
      orderByClause = isDesc ? sql`m.created_at DESC` : sql`m.created_at ASC`;
    } else if (sortField === 'substance' || sortField === 'substanceDescription') {
      orderByClause = isDesc ? sql`m.substance_description DESC, m.name ASC` : sql`m.substance_description ASC, m.name ASC`;
    } else if (sortField === 'laboratory') {
      orderByClause = isDesc ? sql`l.corporate_name DESC, m.name ASC` : sql`l.corporate_name ASC, m.name ASC`;
    } else if (sortField === 'registrationNumber') {
      orderByClause = isDesc ? sql`m.registration_number DESC, m.name ASC` : sql`m.registration_number ASC, m.name ASC`;
    }

    // Execute count and paginated items in parallel
    const [countResult, dataResult] = await Promise.all([
      this.db.execute(sql`
        SELECT COUNT(*) as total
        FROM medications m
        ${whereClause};
      `),
      this.db.execute(sql`
        SELECT 
          m.id,
          m.name,
          m.process_number as "processNumber",
          m.registration_number as "registrationNumber",
          m.category,
          m.reference_medicine as "referenceMedicine",
          m.stripe,
          m.status,
          m.is_active as "isActive",
          m.substance_description as "substanceDescription",
          m.dosage,
          m.substance_with_dosage as "substanceWithDosage",
          m.complement,
          m.atc_code as "atcCode",
          m.created_at as "createdAt",
          m.updated_at as "updatedAt",
          l.corporate_name as "laboratory",
          l.cnpj as "laboratoryCnpj"
        FROM medications m
        LEFT JOIN medicine_laboratories l ON l.id = m.laboratory_id
        ${whereClause}
        ORDER BY ${orderByClause}
        LIMIT ${limit} OFFSET ${offset};
      `),
    ]);

    const total = parseInt(String(countResult.rows[0]?.total || 0), 10);

    const sanitizedData = dataResult.rows.map(row => ({
      ...row,
      name: decodeHtmlEntities(row.name as string),
      substanceDescription: decodeHtmlEntities(row.substanceDescription as string),
      substanceWithDosage: decodeHtmlEntities(row.substanceWithDosage as string),
      complement: decodeHtmlEntities(row.complement as string),
      laboratory: decodeHtmlEntities(row.laboratory as string),
    }));

    return {
      data: sanitizedData,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Aggregated dashboard metrics for the administration view
   */
  async getStats() {
    const res = await this.db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive,
        COUNT(CASE WHEN dosage IS NOT NULL THEN 1 END) as "withDosage",
        (SELECT COUNT(*) FROM medicine_laboratories) as laboratories,
        (SELECT COUNT(*) FROM medicine_substances) as substances
      FROM medications;
    `);

    const row = res.rows[0] as any;
    return {
      total: parseInt(row?.total || '0', 10),
      active: parseInt(row?.active || '0', 10),
      inactive: parseInt(row?.inactive || '0', 10),
      withDosage: parseInt(row?.withDosage || '0', 10),
      laboratories: parseInt(row?.laboratories || '0', 10),
      substances: parseInt(row?.substances || '0', 10),
    };
  }

  async findById(id: string): Promise<any> {
    const res = await this.db.execute(sql`
      SELECT 
        m.id,
        m.name,
        m.process_number as "processNumber",
        m.registration_number as "registrationNumber",
        m.laboratory_id as "laboratoryId",
        m.category,
        m.reference_medicine as "referenceMedicine",
        m.stripe,
        m.status,
        m.is_active as "isActive",
        m.substance_description as "substanceDescription",
        m.dosage,
        m.substance_with_dosage as "substanceWithDosage",
        m.complement,
        m.atc_code as "atcCode",
        m.created_at as "createdAt",
        m.updated_at as "updatedAt",
        l.corporate_name as "laboratory",
        l.cnpj as "laboratoryCnpj"
      FROM medications m
      LEFT JOIN medicine_laboratories l ON l.id = m.laboratory_id
      WHERE m.id = ${id}
      LIMIT 1;
    `);

    const med = res.rows[0] as any;
    if (!med) throw new NotFoundException('Medicamento não encontrado.');
    return {
      ...med,
      name: decodeHtmlEntities(med.name),
      substanceDescription: decodeHtmlEntities(med.substanceDescription),
      substanceWithDosage: decodeHtmlEntities(med.substanceWithDosage),
      complement: decodeHtmlEntities(med.complement),
      laboratory: decodeHtmlEntities(med.laboratory),
    };
  }

  async create(dto: CreateMedicationDto) {
    let labId = dto.laboratoryId || null;

    if (!labId && dto.laboratoryName) {
      // Find or create laboratory
      const cnpj = dto.laboratoryCnpj || '00000000000000';
      const existingLab = await this.db.execute(sql`
        SELECT id FROM medicine_laboratories WHERE cnpj = ${cnpj} LIMIT 1;
      `);

      if (existingLab.rows.length > 0) {
        labId = existingLab.rows[0].id as string;
      } else {
        const newLabId = crypto.randomUUID();
        await this.db.execute(sql`
          INSERT INTO medicine_laboratories (id, cnpj, corporate_name)
          VALUES (${newLabId}, ${cnpj}, ${decodeHtmlEntities(dto.laboratoryName)});
        `);
        labId = newLabId;
      }
    }

    const isActive = dto.isActive !== undefined ? dto.isActive : dto.status?.toLowerCase() !== 'inativo';
    const status = isActive ? 'Ativo' : 'Inativo';

    const decodedName = decodeHtmlEntities(dto.name);
    const decodedSubstance = dto.substanceDescription ? decodeHtmlEntities(dto.substanceDescription) : null;
    const decodedComplement = dto.complement ? decodeHtmlEntities(dto.complement) : null;

    let substanceWithDosage = decodedSubstance || null;
    if (decodedSubstance) {
      if (dto.dosage) {
        substanceWithDosage = `${decodedSubstance} ${dto.dosage}`;
      } else if (decodedComplement) {
        substanceWithDosage = `${decodedSubstance} (${decodedComplement})`;
      }
    }

    const searchParts = [
      decodedName,
      substanceWithDosage,
      dto.dosage,
      decodedComplement,
      dto.referenceMedicine,
      dto.laboratoryName ? decodeHtmlEntities(dto.laboratoryName) : null,
    ].filter(Boolean).join(' ');

    const searchText = removeAccents(searchParts);
    const id = crypto.randomUUID();

    await this.db.execute(sql`
      INSERT INTO medications (
        id, name, process_number, registration_number, laboratory_id,
        category, reference_medicine, stripe, status, is_active,
        substance_description, dosage, substance_with_dosage, complement,
        atc_code, search_text
      ) VALUES (
        ${id}, ${decodedName}, ${dto.processNumber || null}, ${dto.registrationNumber || null}, ${labId},
        ${dto.category ? decodeHtmlEntities(dto.category) : null}, ${dto.referenceMedicine || null}, ${dto.stripe || null}, ${status}, ${isActive},
        ${decodedSubstance}, ${dto.dosage || null}, ${substanceWithDosage}, ${decodedComplement},
        ${dto.atcCode || null}, ${searchText}
      );
    `);

    return this.findById(id);
  }

  async update(id: string, dto: UpdateMedicationDto) {
    const current = await this.findById(id);

    const name = dto.name !== undefined ? decodeHtmlEntities(dto.name) : current.name;
    const processNumber = dto.processNumber !== undefined ? dto.processNumber : current.processNumber;
    const registrationNumber = dto.registrationNumber !== undefined ? dto.registrationNumber : current.registrationNumber;
    const laboratoryId = dto.laboratoryId !== undefined ? dto.laboratoryId : current.laboratoryId;
    const category = dto.category !== undefined ? decodeHtmlEntities(dto.category) : current.category;
    const referenceMedicine = dto.referenceMedicine !== undefined ? dto.referenceMedicine : current.referenceMedicine;
    const stripe = dto.stripe !== undefined ? dto.stripe : current.stripe;
    const isActive = dto.isActive !== undefined ? dto.isActive : current.isActive;
    const status = isActive ? 'Ativo' : 'Inativo';
    const substanceDescription = dto.substanceDescription !== undefined ? (dto.substanceDescription ? decodeHtmlEntities(dto.substanceDescription) : null) : current.substanceDescription;
    const dosage = dto.dosage !== undefined ? dto.dosage : current.dosage;
    const complement = dto.complement !== undefined ? (dto.complement ? decodeHtmlEntities(dto.complement) : null) : current.complement;
    const atcCode = dto.atcCode !== undefined ? dto.atcCode : current.atcCode;

    let substanceWithDosage = substanceDescription;
    if (substanceDescription) {
      if (dosage) {
        substanceWithDosage = `${substanceDescription} ${dosage}`;
      } else if (complement) {
        substanceWithDosage = `${substanceDescription} (${complement})`;
      }
    }

    const searchParts = [
      name,
      substanceWithDosage,
      dosage,
      complement,
      referenceMedicine,
      current.laboratory,
    ].filter(Boolean).join(' ');

    const searchText = removeAccents(searchParts);

    await this.db.execute(sql`
      UPDATE medications
      SET 
        name = ${name},
        process_number = ${processNumber},
        registration_number = ${registrationNumber},
        laboratory_id = ${laboratoryId},
        category = ${category},
        reference_medicine = ${referenceMedicine},
        stripe = ${stripe},
        status = ${status},
        is_active = ${isActive},
        substance_description = ${substanceDescription},
        dosage = ${dosage},
        substance_with_dosage = ${substanceWithDosage},
        complement = ${complement},
        atc_code = ${atcCode},
        search_text = ${searchText},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id};
    `);

    return this.findById(id);
  }

  async toggleActive(id: string) {
    const current = await this.findById(id);
    const newActive = !current.isActive;
    const newStatus = newActive ? 'Ativo' : 'Inativo';

    await this.db.execute(sql`
      UPDATE medications
      SET 
        is_active = ${newActive},
        status = ${newStatus},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id};
    `);

    return { id, isActive: newActive, status: newStatus };
  }

  async delete(id: string) {
    await this.findById(id);
    await this.db.execute(sql`DELETE FROM medications WHERE id = ${id};`);
    return { success: true, id };
  }

  /**
   * Process and import CSV file stream with normalization and chunking
   */
  async importCsvFile(filePath: string) {
    if (!fs.existsSync(filePath)) {
      throw new BadRequestException(`Arquivo não encontrado: ${filePath}`);
    }

    const startTime = Date.now();

    // 1. First pass: Collect laboratories and substances
    const labMapByCnpj = new Map<string, string>();
    const substanceMapByName = new Map<string, string | null>();

    const stream1 = fs.createReadStream(filePath, { encoding: 'latin1' });
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
        const labName = decodeHtmlEntities((f[2] || '').trim());
        const subs = decodeHtmlEntities((f[40] || '').trim());
        const subCode = (f[30] || '').trim();

        if (cnpj && labName && !labMapByCnpj.has(cnpj)) {
          labMapByCnpj.set(cnpj, labName);
        }

        if (subs) {
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

    // Insert/upsert laboratories
    const labIdMap = new Map<string, string>();
    const existingLabs = await this.db.execute(sql`SELECT id, cnpj FROM medicine_laboratories;`);
    for (const r of existingLabs.rows) {
      labIdMap.set(String(r.cnpj), String(r.id));
    }

    const newLabs = Array.from(labMapByCnpj.entries()).filter(([cnpj]) => !labIdMap.has(cnpj));
    if (newLabs.length > 0) {
      const chunkSize = 500;
      for (let i = 0; i < newLabs.length; i += chunkSize) {
        const chunk = newLabs.slice(i, i + chunkSize);
        for (const [cnpj, name] of chunk) {
          const id = crypto.randomUUID();
          await this.db.execute(sql`
            INSERT INTO medicine_laboratories (id, cnpj, corporate_name)
            VALUES (${id}, ${cnpj}, ${name})
            ON CONFLICT (cnpj) DO UPDATE SET corporate_name = EXCLUDED.corporate_name;
          `);
          labIdMap.set(cnpj, id);
        }
      }
    }

    // Insert/upsert substances
    const substanceIdMap = new Map<string, string>();
    const existingSubs = await this.db.execute(sql`SELECT id, name FROM medicine_substances;`);
    for (const r of existingSubs.rows) {
      substanceIdMap.set(String(r.name), String(r.id));
    }

    const newSubs = Array.from(substanceMapByName.entries()).filter(([name]) => !substanceIdMap.has(name));
    if (newSubs.length > 0) {
      const chunkSize = 500;
      for (let i = 0; i < newSubs.length; i += chunkSize) {
        const chunk = newSubs.slice(i, i + chunkSize);
        for (const [name, code] of chunk) {
          const id = crypto.randomUUID();
          await this.db.execute(sql`
            INSERT INTO medicine_substances (id, name, code)
            VALUES (${id}, ${name}, ${code})
            ON CONFLICT (name) DO UPDATE SET code = COALESCE(EXCLUDED.code, medicine_substances.code);
          `);
          substanceIdMap.set(name, id);
        }
      }
    }

    // 2. Second pass: stream insert medications in batches
    await this.db.execute(sql`TRUNCATE TABLE medication_substances, medications CASCADE;`);

    const stream2 = fs.createReadStream(filePath, { encoding: 'latin1' });
    const rl2 = readline.createInterface({ input: stream2, crlfDelay: Infinity });

    headers = null;
    multilineBuffer = '';
    inQuotes = false;

    let totalProcessed = 0;
    let totalWithDosage = 0;
    let totalActive = 0;

    const BATCH_SIZE = 1000;
    let batchMeds: any[] = [];
    let batchJunctions: any[] = [];

    const flushBatch = async () => {
      if (batchMeds.length === 0) return;

      const medValues: any[] = [];
      const medPlaceholders: string[] = [];
      let pIdx = 1;

      for (const m of batchMeds) {
        medValues.push(
          m.id, m.name, m.processNumber, m.registrationNumber, m.laboratoryId,
          m.category, m.referenceMedicine, m.stripe, m.status, m.isActive,
          m.substanceDescription, m.dosage, m.substanceWithDosage, m.complement,
          m.atcCode, m.searchText
        );
        medPlaceholders.push(`(
          $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++},
          $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++},
          $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}
        )`);
      }

      await this.db.execute(sql.raw(`
        INSERT INTO medications (
          id, name, process_number, registration_number, laboratory_id,
          category, reference_medicine, stripe, status, is_active,
          substance_description, dosage, substance_with_dosage, complement,
          atc_code, search_text
        ) VALUES ${medPlaceholders.join(', ')};
      `));

      if (batchJunctions.length > 0) {
        const juncPlaceholders: string[] = [];
        let jIdx = 1;
        const juncValues: any[] = [];
        for (const j of batchJunctions) {
          juncValues.push(j.medicationId, j.substanceId, j.dosage);
          juncPlaceholders.push(`($${jIdx++}, $${jIdx++}, $${jIdx++})`);
        }
        await this.db.execute(sql.raw(`
          INSERT INTO medication_substances (medication_id, substance_id, dosage)
          VALUES ${juncPlaceholders.join(', ')}
          ON CONFLICT DO NOTHING;
        `));
      }

      totalProcessed += batchMeds.length;
      batchMeds = [];
      batchJunctions = [];
    };

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
        const name = decodeHtmlEntities((f[6] || '').trim());
        if (!name) {
          multilineBuffer = '';
          continue;
        }

        const processNumber = (f[0] || '').trim() || null;
        const labName = decodeHtmlEntities((f[2] || '').trim());
        const cnpj = (f[5] || '').trim();
        const registrationNumber = (f[8] || '').trim() || null;
        const category = (f[16] || '').trim() ? decodeHtmlEntities((f[16] || '').trim()) : null;
        const referenceMedicine = (f[17] || '').trim() ? decodeHtmlEntities((f[17] || '').trim()) : null;
        const notifiedProduct = decodeHtmlEntities((f[20] || '').trim());
        const stripe = (f[34] || '').trim() ? decodeHtmlEntities((f[34] || '').trim()) : null;
        const complement = (f[37] || '').trim() ? decodeHtmlEntities((f[37] || '').trim()) : null;
        const substanceDescription = (f[40] || '').trim() ? decodeHtmlEntities((f[40] || '').trim()) : null;
        const status = (f[41] || '').trim() || 'Ativo';
        const atcCode = (f[29] || '').trim() || null;

        const medId = crypto.randomUUID();
        const laboratoryId = cnpj ? (labIdMap.get(cnpj) || null) : null;
        const isActive = status.toLowerCase() === 'ativo';
        if (isActive) totalActive++;

        const matchComp = complement ? complement.match(dosageRegex) : null;
        const matchProd = name.match(dosageRegex);
        const matchNotif = notifiedProduct ? notifiedProduct.match(dosageRegex) : null;
        const matchRef = referenceMedicine ? referenceMedicine.match(dosageRegex) : null;

        const dosage = matchComp ? matchComp[1] : (matchProd ? matchProd[1] : (matchNotif ? matchNotif[1] : (matchRef ? matchRef[1] : null)));
        if (dosage) totalWithDosage++;

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
          searchText,
        });

        if (substanceDescription) {
          const parts = substanceDescription.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
          for (const p of parts) {
            const subId = substanceIdMap.get(p);
            if (subId) {
              batchJunctions.push({ medicationId: medId, substanceId: subId, dosage });
            }
          }
        }

        if (batchMeds.length >= BATCH_SIZE) {
          await flushBatch();
        }
        multilineBuffer = '';
      }
    }

    if (batchMeds.length > 0) {
      await flushBatch();
    }

    const durationMs = Date.now() - startTime;

    return {
      success: true,
      totalProcessed,
      totalActive,
      totalWithDosage,
      durationMs,
      laboratoriesCount: labIdMap.size,
      substancesCount: substanceIdMap.size,
    };
  }

  async syncLocalCsv() {
    const defaultPath = 'd:\\Projetos\\sinpep\\scratch\\DADOS_ABERTOS_MEDICAMENTOS.csv';
    return this.importCsvFile(defaultPath);
  }
}
