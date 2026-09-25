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

    return this.db.query.cid10.findMany({
      where: (table, { or, ilike, and, eq }) => 
        and(
          eq(table.isActive, true),
          or(
            ilike(table.code, `%${query}%`),
            ilike(table.description, `%${query}%`)
          )
        ),
      limit: 50,
    });
  }
}
