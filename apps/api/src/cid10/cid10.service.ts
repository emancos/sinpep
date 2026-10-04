import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { ilike, or, eq } from 'drizzle-orm';

@Injectable()
export class Cid10Service {
  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async search(query: string) {
    if (!query) {
      return this.db.query.cid10.findMany({
        where: eq(schema.cid10.isActive, true),
        limit: 50,
      });
    }

    const cleanQuery = query.trim();
    let formattedQuery = cleanQuery;
    
    // If it's a CID code without dot (e.g., M511), format it to M51.1
    if (/^[a-zA-Z]\d{2}\d+$/.test(cleanQuery)) {
      formattedQuery = `${cleanQuery.slice(0, 3)}.${cleanQuery.slice(3)}`;
    }

    return this.db.query.cid10.findMany({
      where: (table, { or, ilike, and, eq }) => 
        and(
          eq(table.isActive, true),
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
