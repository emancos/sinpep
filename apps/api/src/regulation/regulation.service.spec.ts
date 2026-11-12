import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { RegulationService } from './regulation.service';

function createMockRequest(overrides: Record<string, any> = {}) {
  return {
    id: 'req-1',
    protocolNumber: 'REG-2026-0001',
    status: 'PENDENTE_REGULACAO',
    type: 'CONSULTA',
    priority: 'NORMAL',
    cid10: 'I10',
    procedureId: 'proc-1',
    procedureGroupId: 'grp-1',
    specialtyId: 'spec-1',
    patientId: 'patient-1',
    requestingHealthCenterId: 'hc-1',
    executingHealthCenterId: null,
    clinicalJustification: 'Paciente apresenta hipertensão persistente há 3 meses.',
    notes: 'Sem observações adicionais.',
    returnEditableFields: [],
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
    attachments: [
      { id: 'att-1', requestId: 'req-1', fileName: 'exame.pdf', fileUrl: 'https://drive.google.com/att-1' },
      { id: 'att-2', requestId: 'req-1', fileName: 'laudo.pdf', fileUrl: 'https://drive.google.com/att-2' },
    ],
    patient: {
      id: 'patient-1',
      name: 'José Paciente',
      birthDate: '1970-03-15',
      healthCenterId: 'hc-1',
      patientAnamnesis: {
        id: 'anam-1',
        patientId: 'patient-1',
        isHypertensive: false,
        isDiabetic: false,
        otherDiseases: null,
        isOncological: false,
        oncologicalStage: null,
        allergies: null,
        isPcd: false,
        pcdDescription: null,
        continuousMedications: [],
      },
    },
    ...overrides,
  };
}

function createRegulationMockDb(initialRequest = createMockRequest()) {
  let currentRequest = structuredClone(initialRequest);
  const insertedStatusHistory: any[] = [];
  const insertedPatientHistory: any[] = [];
  const insertedRequests: any[] = [];
  const insertedAttachments: any[] = [];
  const deleteCalls: any[] = [];
  const updateCalls: Array<{ setPayload: any }> = [];

  const db = {
    query: {
      regulationRequests: {
        findFirst: jest.fn(async () => structuredClone(currentRequest)),
      },
      patientAnamnesis: {
        findFirst: jest.fn(async () => structuredClone(currentRequest.patient.patientAnamnesis)),
      },
      patients: {
        findFirst: jest.fn(async () => structuredClone(currentRequest.patient)),
      },
      procedures: {
        findFirst: jest.fn(async () => ({ id: 'proc-2', procedureGroupId: 'grp-2', name: 'Ecocardiograma' })),
      },
      users: {
        findFirst: jest.fn(async () => ({
          id: 'user-sol-1',
          name: 'Maria UBS',
          email: 'maria@ubs.gov.br',
          phone: '(83) 99999-0000',
        })),
      },
      healthCenters: {
        findFirst: jest.fn(async () => ({ id: 'hc-1', name: 'UBS Centro', cnes: '1234567' })),
      },
    },
    update: jest.fn(() => ({
      set: jest.fn((payload: any) => ({
        where: jest.fn(async () => {
          updateCalls.push({ setPayload: payload });
          if (payload && 'returnEditableFields' in payload) {
            currentRequest.returnEditableFields = payload.returnEditableFields;
          }
          if (payload && 'status' in payload) {
            currentRequest.status = payload.status;
          }
          if (payload && 'cid10' in payload) {
            currentRequest.cid10 = payload.cid10;
          }
          if (payload && 'clinicalJustification' in payload) {
            currentRequest.clinicalJustification = payload.clinicalJustification;
          }
          if (payload && 'priority' in payload) {
            currentRequest.priority = payload.priority;
          }
          if (payload && 'procedureId' in payload) {
            currentRequest.procedureId = payload.procedureId;
          }
          if (payload && 'procedureGroupId' in payload) {
            currentRequest.procedureGroupId = payload.procedureGroupId;
          }
          if (payload && 'groupProcedures' in payload) {
            currentRequest.groupProcedures = payload.groupProcedures;
          }
          if (payload && 'type' in payload) {
            currentRequest.type = payload.type;
          }
          if (payload && 'isHypertensive' in payload) {
            currentRequest.patient.patientAnamnesis = {
              ...currentRequest.patient.patientAnamnesis,
              ...payload,
            };
          }
          return [currentRequest];
        }),
      })),
    })),
    delete: jest.fn(() => ({
      where: jest.fn(async () => {
        deleteCalls.push(true);
        return [];
      }),
    })),
    insert: jest.fn(() => ({
      values: jest.fn((valuesPayload: any) => {
        const items = Array.isArray(valuesPayload) ? valuesPayload : [valuesPayload];
        for (const item of items) {
          if (!item || typeof item !== 'object') continue;
          if ('newStatus' in item && 'requestId' in item) {
            insertedStatusHistory.push(item);
          } else if ('origin' in item && 'changes' in item) {
            insertedPatientHistory.push(item);
          } else if ('protocolNumber' in item) {
            insertedRequests.push(item);
          } else if ('fileUrl' in item) {
            insertedAttachments.push(item);
          }
        }
        return {
          returning: jest.fn(async () => items),
        };
      }),
    })),
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn(async () => [
          { id: 'proc-tc-1', code: '0206010079', name: 'Tomografia de Crânio' },
          { id: 'proc-tc-2', code: '0206020031', name: 'Tomografia de Tórax' },
          { id: 'proc-tc-3', code: '0206030010', name: 'Tomografia de Abdome' },
        ]),
      })),
    })),
    __setRequest: (req: any) => {
      currentRequest = structuredClone(req);
    },
    __getRequest: () => currentRequest,
    __insertedStatusHistory: insertedStatusHistory,
    __insertedPatientHistory: insertedPatientHistory,
    __insertedRequests: insertedRequests,
    __insertedAttachments: insertedAttachments,
    __deleteCalls: deleteCalls,
    __updateCalls: updateCalls,
  };

  return db;
}

describe('RegulationService (Devolução granular & Anamnese cross-unit)', () => {
  let service: RegulationService;
  let mockDb: ReturnType<typeof createRegulationMockDb>;
  let mockStorageService: { uploadFile: jest.Mock };
  let mockEventsGateway: { server: { emit: jest.Mock } };

  const regulatorUser = {
    id: 'user-reg-1',
    name: 'Dr. Regulador',
    email: 'regulador@saude.gov.br',
    isMunicipalRegulator: true,
    activeProfileName: 'Regulador (Central de Regulação)',
    permissions: ['admin:access', 'regulation-operator:evaluate'],
  };

  const solicitorUser = {
    id: 'user-sol-1',
    name: 'Maria UBS',
    email: 'maria@ubs.gov.br',
    phone: '(83) 99999-0000',
    healthCenterId: 'hc-1',
    activeHealthCenterId: 'hc-1',
    linkedHealthCenterIds: ['hc-1'],
    activeProfileName: 'Solicitante (UBS)',
    permissions: ['regulation-solicitor:write', 'regulation-solicitor:read'],
  };

  beforeEach(() => {
    mockDb = createRegulationMockDb();
    mockStorageService = {
      uploadFile: jest.fn(async (file: any) => `https://drive.google.com/${file.originalname}`),
    };
    mockEventsGateway = { server: { emit: jest.fn() } };
    service = new RegulationService(
      mockDb as any,
      mockStorageService as any,
      mockEventsGateway as any,
    );
  });

  describe('evaluateRequest (DEVOLVER)', () => {
    it('exige ao menos 1 campo editável selecionado ao devolver solicitação', async () => {
      await expect(
        service.evaluateRequest(
          'req-1',
          'DEVOLVER',
          'Justificativa insuficiente para regulação.',
          undefined,
          regulatorUser,
          undefined,
          [],
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('salva returnEditableFields na solicitação e editableFields no histórico de status', async () => {
      await service.evaluateRequest(
        'req-1',
        'DEVOLVER',
        'Favor corrigir o CID-10 e anexar o laudo.',
        undefined,
        regulatorUser,
        undefined,
        ['CID10', 'ATTACHMENTS', 'INVALID_FIELD'],
      );

      expect(mockDb.__getRequest().status).toBe('DEVOLVIDA');
      expect(mockDb.__getRequest().returnEditableFields).toEqual(['CID10', 'ATTACHMENTS']);
      expect(mockDb.__insertedStatusHistory[0]).toEqual(
        expect.objectContaining({
          newStatus: 'DEVOLVIDA',
          editableFields: ['CID10', 'ATTACHMENTS'],
        }),
      );
    });
  });

  describe('resubmitReturnedRequest (edição granular pelo solicitante)', () => {
    it('exige justificativa das alterações e correções no reenvio', async () => {
      mockDb.__setRequest(
        createMockRequest({
          status: 'DEVOLVIDA',
          returnEditableFields: ['CID10'],
        }),
      );

      await expect(
        service.resubmitReturnedRequest('req-1', { cid10: 'I11' }, [], solicitorUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejeita com ForbiddenException quando solicitante tenta alterar campo não liberado', async () => {
      mockDb.__setRequest(
        createMockRequest({
          status: 'DEVOLVIDA',
          returnEditableFields: ['CLINICAL_JUSTIFICATION'],
        }),
      );

      await expect(
        service.resubmitReturnedRequest(
          'req-1',
          {
            cid10: 'E11',
            clinicalJustification: 'Nova justificativa clínica detalhada.',
            justification: 'Correção realizada pelo solicitante.',
          },
          [],
          solicitorUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('permite editar apenas o campo indicado, retorna status para PENDENTE_REGULACAO e limpa returnEditableFields', async () => {
      mockDb.__setRequest(
        createMockRequest({
          status: 'DEVOLVIDA',
          returnEditableFields: ['CID10'],
        }),
      );

      await service.resubmitReturnedRequest(
        'req-1',
        {
          cid10: 'I11',
          justification: 'CID-10 corrigido conforme orientação médica.',
        },
        [],
        solicitorUser,
      );

      expect(mockDb.__getRequest().cid10).toBe('I11');
      expect(mockDb.__getRequest().status).toBe('PENDENTE_REGULACAO');
      expect(mockDb.__getRequest().returnEditableFields).toEqual([]);
      expect(mockDb.__insertedStatusHistory[0]).toEqual(
        expect.objectContaining({
          previousStatus: 'DEVOLVIDA',
          newStatus: 'PENDENTE_REGULACAO',
        }),
      );
    });

    it('permite remover anexo selecionado e adicionar novo anexo quando ATTACHMENTS estiver liberado', async () => {
      mockDb.__setRequest(
        createMockRequest({
          status: 'DEVOLVIDA',
          returnEditableFields: ['ATTACHMENTS'],
        }),
      );

      const newFile = {
        originalname: 'laudo-atualizado.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('pdf-content'),
      } as Express.Multer.File;

      await service.resubmitReturnedRequest(
        'req-1',
        {
          removeAttachmentIds: JSON.stringify(['att-1']),
          justification: 'Substituído exame ilegível pelo laudo atualizado.',
        },
        [newFile],
        solicitorUser,
      );

      expect(mockDb.__deleteCalls).toHaveLength(1);
      expect(mockStorageService.uploadFile).toHaveBeenCalledTimes(1);
      expect(mockDb.__insertedAttachments).toHaveLength(1);
      expect(mockDb.__getRequest().status).toBe('PENDENTE_REGULACAO');
    });

    it('aplica fallback legado quando returnEditableFields está vazio em solicitação DEVOLVIDA', async () => {
      mockDb.__setRequest(
        createMockRequest({
          status: 'DEVOLVIDA',
          returnEditableFields: [],
        }),
      );

      // Campo fora do fallback (CID10) continua bloqueado
      await expect(
        service.resubmitReturnedRequest(
          'req-1',
          { cid10: 'E11', justification: 'Tentativa de editar campo bloqueado.' },
          [],
          solicitorUser,
        ),
      ).rejects.toThrow(ForbiddenException);

      // Campo do fallback (CLINICAL_JUSTIFICATION) é aceito
      await service.resubmitReturnedRequest(
        'req-1',
        {
          clinicalJustification: 'Justificativa revisada no fluxo legado.',
          justification: 'Justificativa atualizada com dados clínicos.',
        },
        [],
        solicitorUser,
      );

      expect(mockDb.__getRequest().status).toBe('PENDENTE_REGULACAO');
    });

    it('atualiza anamnese e grava histórico do paciente quando ANAMNESIS estiver liberado', async () => {
      mockDb.__setRequest(
        createMockRequest({
          status: 'DEVOLVIDA',
          returnEditableFields: ['ANAMNESIS'],
        }),
      );

      await service.resubmitReturnedRequest(
        'req-1',
        {
          anamnesis: JSON.stringify({
            isHypertensive: true,
            allergies: 'Dipirona',
          }),
          justification: 'Anamnese atualizada com alergia medicamentosa.',
        },
        [],
        solicitorUser,
      );

      expect(mockDb.__insertedPatientHistory).toHaveLength(1);
      expect(mockDb.__insertedPatientHistory[0]).toEqual(
        expect.objectContaining({
          patientId: 'patient-1',
          origin: 'REGULATION_RESUBMIT',
          editedByUserId: 'user-sol-1',
          editedByEmail: 'maria@ubs.gov.br',
        }),
      );
    });

    it('permite editar toda a lista groupProcedures quando PROCEDURE está liberado e bloqueia quando não está', async () => {
      mockDb.__setRequest(
        createMockRequest({
          status: 'DEVOLVIDA',
          type: 'EXAME',
          procedureGroupId: 'grp-tc',
          procedureId: 'proc-tc-1',
          groupProcedures: [
            { procedureId: 'proc-tc-1', code: '0206010079', name: 'Tomografia de Crânio' },
            { procedureId: 'proc-tc-2', code: '0206020031', name: 'Tomografia de Tórax' },
          ],
          returnEditableFields: ['CID10'],
        }),
      );

      // Tentativa de alterar groupProcedures sem PROCEDURE liberado -> ForbiddenException
      await expect(
        service.resubmitReturnedRequest(
          'req-1',
          {
            groupProcedures: JSON.stringify([{ procedureId: 'proc-tc-3', code: '', name: '' }]),
            justification: 'Tentando alterar exames do grupo sem liberação.',
          },
          [],
          solicitorUser,
        ),
      ).rejects.toThrow(ForbiddenException);

      // Com PROCEDURE liberado -> permite alterar lista completa do grupo
      mockDb.__setRequest(
        createMockRequest({
          status: 'DEVOLVIDA',
          type: 'EXAME',
          procedureGroupId: 'grp-tc',
          procedureId: 'proc-tc-1',
          groupProcedures: [
            { procedureId: 'proc-tc-1', code: '0206010079', name: 'Tomografia de Crânio' },
            { procedureId: 'proc-tc-2', code: '0206020031', name: 'Tomografia de Tórax' },
          ],
          returnEditableFields: ['PROCEDURE'],
        }),
      );

      await service.resubmitReturnedRequest(
        'req-1',
        {
          type: 'EXAME',
          procedureGroupId: 'grp-tc',
          groupProcedures: JSON.stringify([
            { procedureId: 'proc-tc-2', code: '', name: '' },
            { procedureId: 'proc-tc-3', code: '', name: '' },
          ]),
          justification: 'Removida TC de Crânio e incluída TC de Abdome conforme solicitação.',
        },
        [],
        solicitorUser,
      );

      expect(mockDb.__getRequest().procedureId).toBe('proc-tc-2');
      expect(mockDb.__getRequest().groupProcedures).toEqual([
        { procedureId: 'proc-tc-2', code: '0206020031', name: 'Tomografia de Tórax' },
        { procedureId: 'proc-tc-3', code: '0206030010', name: 'Tomografia de Abdome' },
      ]);
      expect(mockDb.__getRequest().status).toBe('PENDENTE_REGULACAO');
    });
  });

  describe('createRequest (anamnese em paciente de outra UBS do município)', () => {
    it('permite Solicitante alterar anamnese de paciente vinculado a outra UBS e grava patient_edit_history', async () => {
      mockDb.__setRequest(
        createMockRequest({
          patient: {
            id: 'patient-other-ubs',
            name: 'Paciente Outra UBS',
            birthDate: '1985-04-20',
            healthCenterId: 'hc-other-municipal',
            patientAnamnesis: {
              id: 'anam-2',
              patientId: 'patient-other-ubs',
              isHypertensive: false,
              isDiabetic: false,
              otherDiseases: null,
              isOncological: false,
              oncologicalStage: null,
              allergies: null,
              isPcd: false,
              pcdDescription: null,
              continuousMedications: [],
            },
          },
        }),
      );

      await service.createRequest(
        {
          patientId: 'patient-other-ubs',
          type: 'CONSULTA',
          priority: 'NORMAL',
          cid10: 'I10',
          clinicalJustification: 'Paciente encaminhado com histórico de HAS descompensada.',
          anamnesis: JSON.stringify({
            isHypertensive: true,
            isDiabetic: true,
          }),
        },
        [],
        solicitorUser,
      );

      expect(mockDb.__insertedRequests.length).toBeGreaterThanOrEqual(1);
      expect(mockDb.__insertedPatientHistory).toHaveLength(1);
      expect(mockDb.__insertedPatientHistory[0]).toEqual(
        expect.objectContaining({
          patientId: 'patient-other-ubs',
          origin: 'REGULATION_CREATE',
          editedByUserId: 'user-sol-1',
          editedByName: 'Maria UBS',
          editedByEmail: 'maria@ubs.gov.br',
          editedByPhone: '(83) 99999-0000',
        }),
      );
    });

    it('cria UMA única solicitação com groupProcedures quando EXAME possui múltiplos exames no grupo', async () => {
      await service.createRequest(
        {
          patientId: 'patient-1',
          type: 'EXAME',
          priority: 'PRIORITARIO',
          procedureGroupId: 'grp-tc',
          procedureId: 'proc-tc-1',
          procedureIds: JSON.stringify(['proc-tc-1', 'proc-tc-2']),
          cid10: 'R07.4 - Dor torácica',
          clinicalJustification: 'Investigação de coluna torácica e tórax sem contraste.',
        },
        [],
        solicitorUser,
      );

      expect(mockDb.__insertedRequests).toHaveLength(1);
      const created = mockDb.__insertedRequests[0];
      expect(created.protocolNumber).toMatch(/^SOL-\d{6}-\d{4}$/);
      expect(created.protocolNumber).not.toContain('/');
      expect(created.type).toBe('EXAME');
      expect(created.procedureGroupId).toBe('grp-tc');
      expect(created.procedureId).toBe('proc-tc-1');
      expect(created.groupProcedures).toEqual([
        { procedureId: 'proc-tc-1', code: '0206010079', name: 'Tomografia de Crânio' },
        { procedureId: 'proc-tc-2', code: '0206020031', name: 'Tomografia de Tórax' },
      ]);
      expect(mockDb.__insertedStatusHistory).toHaveLength(1);
      expect(mockEventsGateway.server.emit).toHaveBeenCalledTimes(1);
    });

    it('cria UMA única solicitação com groupProcedures para PROCEDIMENTO com múltiplos itens', async () => {
      await service.createRequest(
        {
          patientId: 'patient-1',
          type: 'PROCEDIMENTO',
          priority: 'ELETIVO',
          procedureGroupId: 'grp-proc',
          procedureIds: ['proc-tc-1', 'proc-tc-2', 'proc-tc-3'],
          cid10: 'M54.5',
          clinicalJustification: 'Múltiplos procedimentos do mesmo grupo.',
        },
        [],
        solicitorUser,
      );

      expect(mockDb.__insertedRequests).toHaveLength(1);
      expect(mockDb.__insertedRequests[0].protocolNumber).toMatch(/^SOL-\d{6}-\d{4}$/);
      expect(mockDb.__insertedRequests[0].groupProcedures).toHaveLength(3);
      expect(mockEventsGateway.server.emit).toHaveBeenCalledTimes(1);
    });

    it('cria solicitações individuais (/01, /02) apenas quando CONSULTA possui múltiplos itens', async () => {
      await service.createRequest(
        {
          patientId: 'patient-1',
          type: 'CONSULTA',
          priority: 'ELETIVO',
          procedureIds: JSON.stringify(['proc-cons-1', 'proc-cons-2']),
          cid10: 'I10',
          clinicalJustification: 'Encaminhamento para duas especialidades distintas.',
        },
        [],
        solicitorUser,
      );

      expect(mockDb.__insertedRequests).toHaveLength(2);
      expect(mockDb.__insertedRequests[0].protocolNumber).toMatch(/^SOL-\d{6}-\d{4}\/01$/);
      expect(mockDb.__insertedRequests[1].protocolNumber).toMatch(/^SOL-\d{6}-\d{4}\/02$/);
      expect(mockDb.__insertedRequests[0].procedureId).toBe('proc-cons-1');
      expect(mockDb.__insertedRequests[1].procedureId).toBe('proc-cons-2');
      expect(mockDb.__insertedRequests[0].groupProcedures).toEqual([]);
      expect(mockDb.__insertedRequests[1].groupProcedures).toEqual([]);
      expect(mockDb.__insertedStatusHistory).toHaveLength(2);
      expect(mockEventsGateway.server.emit).toHaveBeenCalledTimes(2);
    });
  });
});
