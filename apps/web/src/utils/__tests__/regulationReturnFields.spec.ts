import { describe, expect, it } from 'vitest';
import {
  buildRestrictedResubmitFormData,
  getEffectiveReturnEditableFields,
  isReturnFieldEditable,
  LEGACY_DEVOLVIDA_FALLBACK_FIELDS,
} from '../regulationReturnFields';

describe('regulationReturnFields utils', () => {
  it('aplica fallback legado quando returnEditableFields é nulo ou vazio', () => {
    expect(getEffectiveReturnEditableFields(null)).toEqual(LEGACY_DEVOLVIDA_FALLBACK_FIELDS);
    expect(getEffectiveReturnEditableFields([])).toEqual(LEGACY_DEVOLVIDA_FALLBACK_FIELDS);
    expect(isReturnFieldEditable([], 'CLINICAL_JUSTIFICATION')).toBe(true);
    expect(isReturnFieldEditable([], 'CID10')).toBe(false);
  });

  it('respeita estritamente os campos indicados quando presentes', () => {
    expect(getEffectiveReturnEditableFields(['CID10', 'PRIORITY'])).toEqual(['CID10', 'PRIORITY']);
    expect(isReturnFieldEditable(['CID10'], 'CID10')).toBe(true);
    expect(isReturnFieldEditable(['CID10'], 'PRIORITY')).toBe(false);
    expect(isReturnFieldEditable(['CID10'], 'CLINICAL_JUSTIFICATION')).toBe(false);
  });

  it('buildRestrictedResubmitFormData inclui apenas os blocos liberados e ignora os bloqueados', () => {
    const file = new File(['pdf'], 'novo.pdf', { type: 'application/pdf' });
    const formData = buildRestrictedResubmitFormData(['CID10', 'ATTACHMENTS'], {
      justification: 'Corrigido CID-10 e anexos conforme solicitado.',
      type: 'CONSULTA',
      specialtyId: 'spec-1',
      procedureId: 'proc-1',
      procedureGroupId: 'grp-1',
      priority: 'URGENCIA',
      cid10: 'I11',
      clinicalJustification: 'Deveria ser omitida',
      clinicalHistory: 'Deveria ser omitido',
      anamnesis: { isHypertensive: true },
      removeAttachmentIds: ['att-old-1'],
      newFiles: [file],
    });

    expect(formData.get('justification')).toBe('Corrigido CID-10 e anexos conforme solicitado.');
    expect(formData.get('cid10')).toBe('I11');
    expect(formData.get('removeAttachmentIds')).toBe(JSON.stringify(['att-old-1']));
    expect(formData.getAll('attachments')).toHaveLength(1);

    // Campos não autorizados não podem ser enviados no FormData
    expect(formData.get('type')).toBeNull();
    expect(formData.get('priority')).toBeNull();
    expect(formData.get('clinicalJustification')).toBeNull();
    expect(formData.get('clinicalHistory')).toBeNull();
    expect(formData.get('anamnesis')).toBeNull();
    expect(formData.get('groupProcedures')).toBeNull();
  });

  it('buildRestrictedResubmitFormData envia lista groupProcedures e procedureId principal quando PROCEDURE está liberado', () => {
    const groupProcedures = [
      { procedureId: 'proc-tc-1', code: '0206010079', name: 'Tomografia de Crânio' },
      { procedureId: 'proc-tc-2', code: '0206020031', name: 'Tomografia de Tórax' },
    ];
    const formData = buildRestrictedResubmitFormData(['PROCEDURE'], {
      justification: 'Atualizados os exames do grupo de tomografia.',
      type: 'EXAME',
      procedureGroupId: 'grp-tc',
      procedureId: 'proc-tc-old',
      groupProcedures,
    });

    expect(formData.get('type')).toBe('EXAME');
    expect(formData.get('procedureGroupId')).toBe('grp-tc');
    expect(formData.get('procedureId')).toBe('proc-tc-1');
    expect(formData.get('groupProcedures')).toBe(JSON.stringify(groupProcedures));
  });
});

