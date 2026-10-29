import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { sql } from 'drizzle-orm';

function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

@Injectable()
export class MedicationsService {
  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

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
      return res.rows;
    }

    const clean = removeAccents(query.trim());
    const words = clean.split(/\s+/).filter(Boolean);

    // Build conditions for each word
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

    return res.rows;
  }

  async findById(id: string) {
    const res = await this.db.execute(sql`
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
        l.corporate_name as "laboratory",
        l.cnpj as "laboratoryCnpj"
      FROM medications m
      LEFT JOIN medicine_laboratories l ON l.id = m.laboratory_id
      WHERE m.id = ${id}
      LIMIT 1;
    `);

    return res.rows[0] || null;
  }
}
