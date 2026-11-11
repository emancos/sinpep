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

/**
 * Fallback aplicado exclusivamente a solicitações já com status DEVOLVIDA
 * criadas antes da devolução granular (quando `return_editable_fields` estiver vazio).
 */
export const LEGACY_DEVOLVIDA_FALLBACK_FIELDS: ReturnEditableField[] = [
  'CLINICAL_JUSTIFICATION',
  'CLINICAL_HISTORY',
  'ATTACHMENTS',
];

export const RETURN_EDITABLE_FIELD_LABELS: Record<ReturnEditableField, string> = {
  PROCEDURE: 'Tipo, Grupo e Procedimento/Exame',
  PRIORITY: 'Nível de Prioridade',
  CID10: 'Diagnóstico Principal (CID-10)',
  CLINICAL_JUSTIFICATION: 'Justificativa Clínica',
  CLINICAL_HISTORY: 'Histórico Clínico / Observações',
  ANAMNESIS: 'Anamnese do Paciente',
  ATTACHMENTS: 'Anexos e Documentos',
};

const VALID_FIELD_SET = new Set<string>(RETURN_EDITABLE_FIELDS);

export function normalizeReturnEditableFields(input: unknown): ReturnEditableField[] {
  let rawList: unknown = input;
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return [];
    try {
      rawList = JSON.parse(trimmed);
    } catch {
      rawList = trimmed.split(',').map((s) => s.trim());
    }
  }

  if (!Array.isArray(rawList)) {
    return [];
  }

  const deduped: ReturnEditableField[] = [];
  for (const entry of rawList) {
    if (typeof entry === 'string' && VALID_FIELD_SET.has(entry)) {
      const typed = entry as ReturnEditableField;
      if (!deduped.includes(typed)) {
        deduped.push(typed);
      }
    }
  }
  return deduped;
}

export function getEffectiveReturnEditableFields(rawFields: unknown): ReturnEditableField[] {
  const normalized = normalizeReturnEditableFields(rawFields);
  return normalized.length > 0 ? normalized : [...LEGACY_DEVOLVIDA_FALLBACK_FIELDS];
}

