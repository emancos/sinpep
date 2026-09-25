// @ts-nocheck
import postgres from '@prisma/orm-postgres/runtime';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

const contractJson = require('../generated/prisma8/contract.json');
const db = postgres({ url: process.env.DATABASE_URL, contractJson });
const prisma = db.orm.public;

async function main() {
  console.log('Iniciando importação do CID-10...');
  
  const filePath = path.join(__dirname, './CID10.SQL');
  
  if (!fs.existsSync(filePath)) {
    console.error(`Arquivo não encontrado: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  const cidsToInsert = [];
  
  // Regex to extract code and description from INSERT INTO CID10 VALUES ('A00.0','Description');
  const regex = /INSERT INTO CID10 VALUES \('([^']+)','([^']+)'\);/;

  for (const line of lines) {
    if (!line.trim()) continue;
    
    const match = line.match(regex);
    if (match) {
      cidsToInsert.push({
        code: match[1],
        description: match[2].trim(),
      });
    }
  }

  console.log(`Encontrados ${cidsToInsert.length} registros no arquivo SQL.`);

  if (cidsToInsert.length > 0) {
    // Delete existing records to avoid conflicts if re-running
    await prisma.cid10.deleteMany({});
    
    console.log('Inserindo registros no banco de dados. Isso pode demorar alguns segundos...');
    
    // Chunk inserts if necessary, but Prisma createMany can handle 14k easily.
    // However, some DB limit chunk size. Let's do chunks of 2000
    const chunkSize = 2000;
    for (let i = 0; i < cidsToInsert.length; i += chunkSize) {
      const chunk = cidsToInsert.slice(i, i + chunkSize);
      await prisma.cid10.createMany({
        data: chunk,
        skipDuplicates: true,
      });
      console.log(`Inseridos ${i + chunk.length} de ${cidsToInsert.length}`);
    }

    console.log('Importação concluída com sucesso!');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
