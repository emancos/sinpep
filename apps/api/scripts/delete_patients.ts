// @ts-nocheck
import postgres from '@prisma/orm-postgres/runtime';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const contractJson = require('../generated/prisma8/contract.json');
const db = postgres({ url: process.env.DATABASE_URL, contractJson });

const prisma = db.orm.public;

async function main() {
  try {
    console.log('Foreign key constraint on Request restrict deletion of Patients. Deleting requests first...');
    const reqProc = await prisma.requestProcedure.deleteMany();
    console.log(`Deleted ${reqProc.count} request procedures.`);
    
    const reqHist = await prisma.requestHistory.deleteMany();
    console.log(`Deleted ${reqHist.count} request histories.`);
    
    const reqAtt = await prisma.requestAttachment.deleteMany();
    console.log(`Deleted ${reqAtt.count} request attachments.`);

    const reqRes = await prisma.request.deleteMany();
    console.log(`Deleted ${reqRes.count} requests.`);

    const patPhone = await prisma.patientPhone.deleteMany();
    console.log(`Deleted ${patPhone.count} patient phones.`);

    const patRes = await prisma.patient.deleteMany();
    console.log(`Successfully deleted ${patRes.count} patients.`);
  } catch (error) {
    console.error('Error deleting data.');
    console.error(error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
