import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as crypto from 'crypto';
import * as schema from '../database/schema';

export type PatientEditOrigin =
  | 'PATIENT_EDIT'
  | 'PATIENT_STATUS'
  | 'PATIENT_ATTENTION'
  | 'REGULATION_CREATE'
  | 'REGULATION_RESUBMIT';

export interface PatientFieldChange {
  field: string;
  label: string;
  before: unknown;
  after: unknown;
}

export interface AuditUserInput {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}

function normalizeDateOnly(value: unknown): string | null {
  if (!value) return null;
  const str = String(value);
  return str.length >= 10 ? str.slice(0, 10) : str;
}

function normalizeNullableString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatPhonesForComparison(phones: Array<{ phoneNumber?: string; isWhatsapp?: boolean }> | undefined | null): string[] {
  if (!Array.isArray(phones)) return [];
  return phones
    .filter((p) => Boolean(p?.phoneNumber))
    .map((p) => `${String(p.phoneNumber).trim()}${p.isWhatsapp ? ' (WhatsApp)' : ''}`)
    .sort();
}

function formatMedications(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) return 'Nenhum';
  return value
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        const name = (item as any).name || (item as any).medication || '';
        const dose = (item as any).dosage || (item as any).dose || '';
        return dose ? `${name} (${dose})` : name;
      }
      return String(item);
    })
    .filter(Boolean)
    .join(', ');
}

function areJsonValuesEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

export function buildPatientUpdateChanges(beforePatient: any, afterPatient: any): PatientFieldChange[] {
  const changes: PatientFieldChange[] = [];

  const scalarChecks: Array<{
    field: string;
    label: string;
    getBefore: () => unknown;
    getAfter: () => unknown;
    displayBefore?: () => unknown;
    displayAfter?: () => unknown;
  }> = [
    {
      field: 'name',
      label: 'Nome completo',
      getBefore: () => normalizeNullableString(beforePatient.name),
      getAfter: () => normalizeNullableString(afterPatient.name),
    },
    {
      field: 'cpf',
      label: 'CPF',
      getBefore: () => normalizeNullableString(beforePatient.cpf),
      getAfter: () => normalizeNullableString(afterPatient.cpf),
    },
    {
      field: 'cns',
      label: 'Cartão SUS (CNS)',
      getBefore: () => normalizeNullableString(beforePatient.cns),
      getAfter: () => normalizeNullableString(afterPatient.cns),
    },
    {
      field: 'email',
      label: 'E-mail',
      getBefore: () => normalizeNullableString(beforePatient.email),
      getAfter: () => normalizeNullableString(afterPatient.email),
    },
    {
      field: 'birthDate',
      label: 'Data de nascimento',
      getBefore: () => normalizeDateOnly(beforePatient.birthDate),
      getAfter: () => normalizeDateOnly(afterPatient.birthDate),
    },
    {
      field: 'gender',
      label: 'Sexo',
      getBefore: () => normalizeNullableString(beforePatient.gender),
      getAfter: () => normalizeNullableString(afterPatient.gender),
    },
    {
      field: 'healthCenterId',
      label: 'UBS vinculada',
      getBefore: () => beforePatient.healthCenterId ?? null,
      getAfter: () => afterPatient.healthCenterId ?? null,
      displayBefore: () => beforePatient.healthCenter?.name || beforePatient.healthCenterId || null,
      displayAfter: () => afterPatient.healthCenter?.name || afterPatient.healthCenterId || null,
    },
    {
      field: 'healthAgentId',
      label: 'Agente de saúde',
      getBefore: () => beforePatient.healthAgentId ?? null,
      getAfter: () => afterPatient.healthAgentId ?? null,
      displayBefore: () => beforePatient.healthAgent?.name || beforePatient.healthAgentId || null,
      displayAfter: () => afterPatient.healthAgent?.name || afterPatient.healthAgentId || null,
    },
    {
      field: 'address',
      label: 'Endereço',
      getBefore: () => normalizeNullableString(beforePatient.address),
      getAfter: () => normalizeNullableString(afterPatient.address),
    },
    {
      field: 'isActive',
      label: 'Status do cadastro',
      getBefore: () => Boolean(beforePatient.isActive),
      getAfter: () => Boolean(afterPatient.isActive),
      displayBefore: () => (beforePatient.isActive ? 'Ativo' : 'Inativo'),
      displayAfter: () => (afterPatient.isActive ? 'Ativo' : 'Inativo'),
    },
    {
      field: 'attentionLevel',
      label: 'Nível de atenção',
      getBefore: () => beforePatient.attentionLevel ?? 1,
      getAfter: () => afterPatient.attentionLevel ?? 1,
    },
    {
      field: 'attentionNotes',
      label: 'Observações de atenção',
      getBefore: () => normalizeNullableString(beforePatient.attentionNotes),
      getAfter: () => normalizeNullableString(afterPatient.attentionNotes),
    },
  ];

  for (const check of scalarChecks) {
    const beforeVal = check.getBefore();
    const afterVal = check.getAfter();
    if (!areJsonValuesEqual(beforeVal, afterVal)) {
      changes.push({
        field: check.field,
        label: check.label,
        before: check.displayBefore ? check.displayBefore() : beforeVal,
        after: check.displayAfter ? check.displayAfter() : afterVal,
      });
    }
  }

  const beforePhones = formatPhonesForComparison(beforePatient.phones || beforePatient.patientPhones);
  const afterPhones = formatPhonesForComparison(afterPatient.phones || afterPatient.patientPhones);
  if (!areJsonValuesEqual(beforePhones, afterPhones)) {
    changes.push({
      field: 'phones',
      label: 'Contatos telefônicos',
      before: beforePhones.length > 0 ? beforePhones.join(', ') : null,
      after: afterPhones.length > 0 ? afterPhones.join(', ') : null,
    });
  }

  return changes;
}

export function buildAnamnesisChanges(beforeAnamnesis: any, afterAnamnesis: any): PatientFieldChange[] {
  if (!afterAnamnesis) return [];

  const before = beforeAnamnesis || {};
  const fields: Array<{ key: string; label: string; format?: (v: unknown) => unknown }> = [
    { key: 'isHypertensive', label: 'Anamnese: Hipertensão', format: (v) => (Boolean(v) ? 'Sim' : 'Não') },
    { key: 'isDiabetic', label: 'Anamnese: Diabetes', format: (v) => (Boolean(v) ? 'Sim' : 'Não') },
    { key: 'isSmoker', label: 'Anamnese: Tabagismo', format: (v) => (Boolean(v) ? 'Sim' : 'Não') },
    { key: 'otherDiseases', label: 'Anamnese: Outras doenças' },
    { key: 'isOncological', label: 'Anamnese: Oncológico', format: (v) => (Boolean(v) ? 'Sim' : 'Não') },
    { key: 'oncologicalStage', label: 'Anamnese: Estadiamento oncológico' },
    { key: 'allergies', label: 'Anamnese: Alergias' },
    { key: 'isPcd', label: 'Anamnese: PcD', format: (v) => (Boolean(v) ? 'Sim' : 'Não') },
    { key: 'pcdDescription', label: 'Anamnese: Descrição PcD' },
    { key: 'continuousMedications', label: 'Anamnese: Medicamentos contínuos', format: formatMedications },
    { key: 'bloodPressure', label: 'Anamnese: Pressão arterial' },
    { key: 'glycemia', label: 'Anamnese: Glicemia' },
    { key: 'weight', label: 'Anamnese: Peso' },
    { key: 'height', label: 'Anamnese: Altura' },
  ];

  const changes: PatientFieldChange[] = [];
  for (const item of fields) {
    const rawBefore = before[item.key];
    const rawAfter = afterAnamnesis[item.key];

    const normalizedBefore =
      typeof rawAfter === 'boolean' || typeof rawBefore === 'boolean'
        ? Boolean(rawBefore)
        : Array.isArray(rawAfter) || Array.isArray(rawBefore)
        ? Array.isArray(rawBefore)
          ? rawBefore
          : []
        : normalizeNullableString(rawBefore);

    const normalizedAfter =
      typeof rawAfter === 'boolean' || typeof rawBefore === 'boolean'
        ? Boolean(rawAfter)
        : Array.isArray(rawAfter) || Array.isArray(rawBefore)
        ? Array.isArray(rawAfter)
          ? rawAfter
          : []
        : normalizeNullableString(rawAfter);

    if (!areJsonValuesEqual(normalizedBefore, normalizedAfter)) {
      changes.push({
        field: `anamnesis.${item.key}`,
        label: item.label,
        before: item.format ? item.format(normalizedBefore) : normalizedBefore,
        after: item.format ? item.format(normalizedAfter) : normalizedAfter,
      });
    }
  }

  return changes;
}

export async function resolveAuditUserSnapshot(
  db: NodePgDatabase<any>,
  user?: AuditUserInput | null,
): Promise<{
  editedByUserId: string | null;
  editedByName: string;
  editedByEmail: string;
  editedByPhone: string | null;
}> {
  let name = user?.name ?? null;
  let email = user?.email ?? null;
  let phone = user?.phone;

  const queryUsers = (db as any)?.query?.users;
  if (user?.id && (!name || !email || phone === undefined) && queryUsers?.findFirst) {
    const dbUser = await queryUsers.findFirst({
      where: eq(schema.users.id, user.id),
      columns: { id: true, name: true, email: true, phone: true },
    });
    if (dbUser) {
      name = name || dbUser.name;
      email = email || dbUser.email;
      if (phone === undefined) {
        phone = dbUser.phone ?? null;
      }
    }
  }

  return {
    editedByUserId: user?.id ?? null,
    editedByName: name || 'Usuário do Sistema',
    editedByEmail: email || 'não informado',
    editedByPhone: phone ?? null,
  };
}

export async function recordPatientEditHistory(
  db: NodePgDatabase<any>,
  params: {
    patientId: string;
    user?: AuditUserInput | null;
    origin: PatientEditOrigin;
    changes: PatientFieldChange[];
  },
): Promise<void> {
  if (!params.changes || params.changes.length === 0) {
    return;
  }

  const snapshot = await resolveAuditUserSnapshot(db, params.user);
  await db.insert(schema.patientEditHistory).values({
    id: crypto.randomUUID(),
    patientId: params.patientId,
    editedByUserId: snapshot.editedByUserId,
    editedByName: snapshot.editedByName,
    editedByEmail: snapshot.editedByEmail,
    editedByPhone: snapshot.editedByPhone,
    origin: params.origin,
    changes: params.changes,
    createdAt: new Date().toISOString(),
  });
}
