import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, sql } from 'drizzle-orm';

@Injectable()
export class Cid10Service {
  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async search(query: string) {
    if (!query || !query.trim()) {
      return this.db.query.cid10.findMany({
        where: eq(schema.cid10.isActive, true),
        limit: 50,
      });
    }

    const cleanQuery = query.trim();
    let formattedQuery = cleanQuery;
    
    // Formata códigos sem ponto (ex: M511 -> M51.1)
    if (/^[a-zA-Z]\d{2}\d+$/.test(cleanQuery)) {
      formattedQuery = `${cleanQuery.slice(0, 3)}.${cleanQuery.slice(3)}`;
    }

    try {
      const res = await this.db.execute(sql`
        SELECT 
          id, 
          code, 
          description, 
          is_active as "isActive", 
          created_at as "createdAt", 
          updated_at as "updatedAt"
        FROM cid10
        WHERE is_active = true
          AND (
            code ILIKE ${'%' + cleanQuery + '%'}
            OR code ILIKE ${'%' + formattedQuery + '%'}
            OR unaccent(description) ILIKE unaccent(${'%' + cleanQuery + '%'})
          )
        ORDER BY 
          CASE 
            WHEN code ILIKE ${cleanQuery + '%'} THEN 1
            WHEN code ILIKE ${formattedQuery + '%'} THEN 2
            WHEN unaccent(description) ILIKE unaccent(${cleanQuery + '%'}) THEN 3
            ELSE 4 
          END,
          code ASC
        LIMIT 50
      `);

      return (res as any)?.rows || (Array.isArray(res) ? res : []);
    } catch {
      // Fallback sem unaccent
      return this.db.query.cid10.findMany({
        where: (table, { or, ilike, and, eq: drizzleEq }) => 
          and(
            drizzleEq(table.isActive, true),
            or(
              ilike(table.code, `%${cleanQuery}%`),
              ilike(table.code, `%${formattedQuery}%`),
              ilike(table.description, `%${cleanQuery}%`)
            )
          ),
        limit: 50,
      });
    }
  }
}
