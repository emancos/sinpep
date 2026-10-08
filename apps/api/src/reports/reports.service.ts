import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { sql, count, eq, desc } from 'drizzle-orm';

@Injectable()
export class ReportsService {
  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async getEpidemiological() {
    // Busca dados consolidados de anamnese
    const anamnesisCount = await this.db.select({
      total: count(),
      hypertensive: sql<number>`SUM(CASE WHEN ${schema.patientAnamnesis.isHypertensive} = true THEN 1 ELSE 0 END)::int`,
      diabetic: sql<number>`SUM(CASE WHEN ${schema.patientAnamnesis.isDiabetic} = true THEN 1 ELSE 0 END)::int`,
      smoker: sql<number>`SUM(CASE WHEN ${schema.patientAnamnesis.isSmoker} = true THEN 1 ELSE 0 END)::int`,
      oncological: sql<number>`SUM(CASE WHEN ${schema.patientAnamnesis.isOncological} = true THEN 1 ELSE 0 END)::int`,
      pcd: sql<number>`SUM(CASE WHEN ${schema.patientAnamnesis.isPcd} = true THEN 1 ELSE 0 END)::int`,
    }).from(schema.patientAnamnesis);

    // Top 10 CID10 primários
    const topCid = await this.db.select({
      code: schema.medicalRecords.cid10,
      count: count(schema.medicalRecords.id),
    })
    .from(schema.medicalRecords)
    .where(sql`${schema.medicalRecords.cid10} IS NOT NULL AND ${schema.medicalRecords.cid10} != ''`)
    .groupBy(schema.medicalRecords.cid10)
    .orderBy(desc(count(schema.medicalRecords.id)))
    .limit(10);

    return {
      comorbidities: anamnesisCount[0],
      topCid
    };
  }

  async getOperational() {
    // Total de Prontuários fechados
    const recordsCount = await this.db.select({ count: count() }).from(schema.medicalRecords);
    
    // Prontuários agrupados por mês (últimos 6 meses)
    const recordsByMonth = await this.db.execute(sql`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COUNT(*) as count
      FROM medical_records
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY month
      ORDER BY month ASC
    `);

    // Prontuários por Médico
    const recordsByDoctor = await this.db.execute(sql`
      SELECT 
        u.name as doctor_name,
        COUNT(mr.id) as count
      FROM medical_records mr
      JOIN users u ON mr.doctor_id = u.id
      GROUP BY u.name
      ORDER BY count DESC
      LIMIT 10
    `);

    return {
      totalRecords: recordsCount[0].count,
      recordsByMonth: recordsByMonth.rows,
      recordsByDoctor: recordsByDoctor.rows,
    };
  }

  async getProcedures() {
    // Agregação baseada no array JSON "requestedExams" não pode ser contada nativamente sem unnest no Postgres,
    // Faremos um pull simplificado ou podemos usar SQL Nativo se tivermos dados reais.
    
    // Como os exames solicitados ficam dentro de um array JSONB em requested_exams
    const examsStats = await this.db.execute(sql`
      SELECT 
        jsonb_array_elements_text(requested_exams) as exam,
        COUNT(*) as count
      FROM medical_records
      WHERE jsonb_array_length(requested_exams) > 0
      GROUP BY exam
      ORDER BY count DESC
      LIMIT 15
    `);

    return {
      topExams: examsStats.rows,
    };
  }

  async getPharmacy() {
    // Medicações contínuas da anamnese
    const continuousMedsStats = await this.db.execute(sql`
      SELECT 
        jsonb_array_elements_text(continuous_medications) as medication,
        COUNT(*) as count
      FROM patient_anamnesis
      WHERE jsonb_array_length(continuous_medications) > 0
      GROUP BY medication
      ORDER BY count DESC
      LIMIT 15
    `);

    // Medicações recitadas casuais do prontuário
    const prescribedMedsStats = await this.db.execute(sql`
      SELECT 
        jsonb_array_elements_text(medications) as medication,
        COUNT(*) as count
      FROM medical_records
      WHERE jsonb_array_length(medications) > 0
      GROUP BY medication
      ORDER BY count DESC
      LIMIT 15
    `);

    return {
      continuousMedications: continuousMedsStats.rows,
      prescribedMedications: prescribedMedsStats.rows,
    };
  }
}
