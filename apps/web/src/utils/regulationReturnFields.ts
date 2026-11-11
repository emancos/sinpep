export const RETURN_EDITABLE_FIELDS = [
  'PROCEDURE',
  'PRIORITY',
  'CID10',
  'CLINICAL_JUSTIFICATION',
  'CLINICAL_HISTORY',
  'ANAMNESIS',
  'ATTACHMENTS',
] as const;

export type ReturnEditableField = (typeof RETURN_EDITABLE_FIELDS)[number];

export const LEGACY_DEVOLVIDA_FALLBACK_FIELDS: ReturnEditableField[] = [
  'CLINICAL_JUSTIFICATION',
  'CLINICAL_HISTORY',
  'ATTACHMENTS',
];

export interface ReturnEditableFieldOption {
  value: ReturnEditableField;
  label: string;
  description: string;
}

export const RETURN_EDITABLE_FIELD_OPTIONS: ReturnEditableFieldOption[] = [
  {
    value: 'PROCEDURE',
    label: 'Procedimento / Tipo / Grupo',
    description: 'Tipo de solicitação (Consulta/Exame/Procedimento), especialidade, grupo ou procedimento.',
  },
  {
    value: 'PRIORITY',
    label: 'Nível de Prioridade',
    description: 'Classificação clínica entre Eletivo, Prioritário ou Urgência.',
  },
  {
    value: 'CID10',
    label: 'Diagnóstico Principal (CID-10)',
    description: 'Código e descrição da hipótese diagnóstica.',
  },
  {
    value: 'CLINICAL_JUSTIFICATION',
    label: 'Justificativa Clínica',
    description: 'Detalhamento clínico que fundamenta a solicitação.',
  },
  {
    value: 'CLINICAL_HISTORY',
    label: 'Histórico Clínico / Observações',
    description: 'Comorbidades, sinais vitais relatados e evolução prévia.',
  },
  {
    value: 'ANAMNESIS',
    label: 'Anamnese do Paciente',
    description: 'Condições clínicas de base, alergias, medicamentos contínuos e sinais vitais.',
  },
  {
    value: 'ATTACHMENTS',
    label: 'Anexos e Documentos',
    description: 'Inclusão de novos laudos/exames e remoção de anexos incorretos.',
  },
];

export function getReturnFieldLabel(field: ReturnEditableField): string {
  return RETURN_EDITABLE_FIELD_OPTIONS.find((item) => item.value === field)?.label || field;
}

export function getEffectiveReturnEditableFields(rawFields?: ReturnEditableField[] | null): ReturnEditableField[] {
  if (Array.isArray(rawFields) && rawFields.length > 0) {
    return rawFields;
  }
  return [...LEGACY_DEVOLVIDA_FALLBACK_FIELDS];
}

export function isReturnFieldEditable(
  rawFields: ReturnEditableField[] | null | undefined,
  field: ReturnEditableField,
): boolean {
  return getEffectiveReturnEditableFields(rawFields).includes(field);
}

export interface GroupProcedureDraftItem {
  procedureId?: string;
  code: string;
  sigtapCode?: string;
  name: string;
}

export interface ResubmitPayloadDraft {
  justification: string;
  type?: string;
  specialtyId?: string | null;
  procedureId?: string | null;
  procedureGroupId?: string | null;
  groupProcedures?: GroupProcedureDraftItem[];
  procedureIds?: string[];
  priority?: string;
  cid10?: string;
  clinicalJustification?: string;
  clinicalHistory?: string;
  anamnesis?: Record<string, any> | null;
  removeAttachmentIds?: string[];
  newFiles?: File[];
}

/**
 * Monta o FormData de reenvio incluindo estritamente os blocos autorizados na devolução.
 */
export function buildRestrictedResubmitFormData(
  rawAllowedFields: ReturnEditableField[] | null | undefined,
  draft: ResubmitPayloadDraft,
): FormData {
  const allowed = new Set(getEffectiveReturnEditableFields(rawAllowedFields));
  const formData = new FormData();

  formData.append('justification', draft.justification.trim());

  if (allowed.has('PROCEDURE')) {
    if (draft.type !== undefined) formData.append('type', draft.type);
    formData.append('specialtyId', draft.specialtyId || '');
    const primaryProcedureId =
      draft.groupProcedures && draft.groupProcedures.length > 0
        ? draft.groupProcedures.find((item) => item.procedureId)?.procedureId || draft.procedureId || ''
        : draft.procedureId || '';
    formData.append('procedureId', primaryProcedureId);
    formData.append('procedureGroupId', draft.procedureGroupId || '');
    if (draft.groupProcedures !== undefined) {
      formData.append('groupProcedures', JSON.stringify(draft.groupProcedures));
    }
    if (draft.procedureIds !== undefined) {
      formData.append('procedureIds', JSON.stringify(draft.procedureIds));
    }
  }

  if (allowed.has('PRIORITY') && draft.priority !== undefined) {
    formData.append('priority', draft.priority);
  }

  if (allowed.has('CID10') && draft.cid10 !== undefined) {
    formData.append('cid10', draft.cid10.trim());
  }

  if (allowed.has('CLINICAL_JUSTIFICATION') && draft.clinicalJustification !== undefined) {
    formData.append('clinicalJustification', draft.clinicalJustification.trim());
  }

  if (allowed.has('CLINICAL_HISTORY') && draft.clinicalHistory !== undefined) {
    formData.append('clinicalHistory', draft.clinicalHistory.trim());
  }

  if (allowed.has('ANAMNESIS') && draft.anamnesis) {
    formData.append('anamnesis', JSON.stringify(draft.anamnesis));
  }

  if (allowed.has('ATTACHMENTS')) {
    if (draft.removeAttachmentIds && draft.removeAttachmentIds.length > 0) {
      formData.append('removeAttachmentIds', JSON.stringify(draft.removeAttachmentIds));
    }
    if (draft.newFiles && draft.newFiles.length > 0) {
      for (const file of draft.newFiles) {
        formData.append('attachments', file);
      }
    }
  }

  return formData;
}

