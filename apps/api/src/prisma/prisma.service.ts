import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import postgres from '@prisma/orm-postgres/runtime';
import type { Contract } from '../../generated/prisma8/contract.js';

// Usar require() para evitar o erro do import assertions com CommonJS
import * as path from 'path';
const contractJson = require(path.join(process.cwd(), 'generated/prisma8/contract.json'));

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  public db: ReturnType<typeof postgres<Contract>>;

  constructor() {
    this.db = postgres<Contract>({ 
      url: process.env.DATABASE_URL || '', 
      contractJson 
    });
  }

  async onModuleInit() {}

  async onModuleDestroy() {}
}
