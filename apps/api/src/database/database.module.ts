import { Global, Module } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as dbSchema from './index';
import * as dotenv from 'dotenv';
import { DatabaseMigrationService } from './database-migration.service';
dotenv.config();

import { DATABASE_CONNECTION } from './database.constants';
export { DATABASE_CONNECTION } from './database.constants';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_CONNECTION,
      useFactory: async () => {
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
        });
        return drizzle(pool, { schema: dbSchema });
      },
    },
    DatabaseMigrationService,
  ],
  exports: [DATABASE_CONNECTION, DatabaseMigrationService],
})
export class DatabaseModule {}
