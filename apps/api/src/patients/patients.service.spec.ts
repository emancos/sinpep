import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PatientsService } from './patients.service';
import { DATABASE_CONNECTION } from '../database/database.constants';

function createMockPatient(overrides: Record<string, any> = {}) {
  return {
    id: 'patient-1',
    name: 'João da Silva',
    cpf: '111.222.333-44',
    cns: '700000000000001',
    email: 'joao@example.com',
    birthDate: '1980-05-10',
    gender: 'MASCULINO',
    healthCenterId: 'hc-1',
    healthAgentId: 'agent-1',
    attentionLevel: 1,
    attentionNotes: null,
    isActive: true,
    address: 'Rua A, 10 - Centro, São Bento - PB, CEP: 58865-000',
    patientPhones: [{ id: 'phone-1', phoneNumber: '(83) 99999-1111', isWhatsapp: true, label: 'Principal' }],
    phones: [{ id: 'phone-1', phoneNumber: '(83) 99999-1111', isWhatsapp: true, label: 'Principal' }],
    healthCenter: { id: 'hc-1', name: 'UBS 1', cnes: '1234567' },
    healthAgent: { id: 'agent-1', name: 'ACS Ana' },
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
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    ...overrides,
  };
}

function createPatientsMockDb(initialPatient = createMockPatient()) {
  let currentPatient = structuredClone(initialPatient);
  const insertedHistory: any[] = [];
  const updateCalls: Array<{ table: any; setPayload: any }> = [];

  const db = {
    query: {
      patients: {
        findFirst: jest.fn(async () => structuredClone(currentPatient)),
      },
      patientAnamnesis: {
        findFirst: jest.fn(async () => structuredClone(currentPatient.patientAnamnesis)),
      },
      patientEditHistory: {
        findMany: jest.fn(async () => insertedHistory),
      },
      users: {
        findFirst: jest.fn(async () => ({
          id: 'user-sol-1',
          name: 'Enfermeira Maria',
          email: 'maria@ubs.gov.br',
          phone: '(83) 98888-7777',
        })),
      },
    },
    update: jest.fn((table: any) => ({
      set: jest.fn((payload: any) => ({
        where: jest.fn(async () => {
          updateCalls.push({ table, setPayload: payload });
          if (payload && 'isActive' in payload) {
            currentPatient.isActive = payload.isActive;
          }
          if (payload && 'healthCenterId' in payload) {
            currentPatient.healthCenterId = payload.healthCenterId;
          }
          if (payload && 'healthAgentId' in payload) {
            currentPatient.healthAgentId = payload.healthAgentId;
          }
          if (payload && 'address' in payload) {
            currentPatient.address = payload.address;
          }
          if (payload && 'name' in payload) {
            currentPatient.name = payload.name;
          }
          return [currentPatient];
        }),
      })),
    })),
    delete: jest.fn(() => ({
      where: jest.fn(async () => {
        currentPatient.patientPhones = [];
        currentPatient.phones = [];
        return [];
      }),
    })),
    insert: jest.fn(() => ({
      values: jest.fn((valuesPayload: any) => {
        if (valuesPayload && !Array.isArray(valuesPayload) && 'changes' in valuesPayload && 'origin' in valuesPayload) {
          insertedHistory.unshift(valuesPayload);
        }
        if (Array.isArray(valuesPayload)) {
          const mapped = valuesPayload.map((p, idx) => ({
            id: p.id || `phone-new-${idx}`,
            phoneNumber: p.phoneNumber,
            isWhatsapp: Boolean(p.isWhatsapp),
            label: p.label ?? 'Principal',
          }));
          currentPatient.patientPhones = mapped;
          currentPatient.phones = mapped;
        } else if (valuesPayload && typeof valuesPayload === 'object' && 'phoneNumber' in valuesPayload) {
          const phoneRow = {
            id: valuesPayload.id || `phone-new-${currentPatient.patientPhones.length}`,
            phoneNumber: valuesPayload.phoneNumber,
            isWhatsapp: Boolean(valuesPayload.isWhatsapp),
            label: valuesPayload.label ?? 'Principal',
          };
          currentPatient.patientPhones.push(phoneRow);
          currentPatient.phones.push(phoneRow);
        }
        return {
          returning: jest.fn(async () => (Array.isArray(valuesPayload) ? valuesPayload : [valuesPayload])),
        };
      }),
    })),
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => ({
          orderBy: jest.fn(async () => insertedHistory),
        })),
      })),
    })),
    __getPatient: () => currentPatient,
    __setPatient: (p: any) => {
      currentPatient = structuredClone(p);
    },
    __insertedHistory: insertedHistory,
    __updateCalls: updateCalls,
  };

  return db;
}

describe('PatientsService (Solicitor restrictions & Edit history)', () => {
  let service: PatientsService;
  let mockDb: ReturnType<typeof createPatientsMockDb>;

  const solicitorUser = {
    id: 'user-sol-1',
    name: 'Enfermeira Maria',
    email: 'maria@ubs.gov.br',
    phone: '(83) 98888-7777',
    activeProfileName: 'Solicitante (UBS)',
    healthCenterId: 'hc-1',
    linkedHealthCenterIds: ['hc-1', 'hc-3'],
    permissions: ['patients:read', 'patients:write', 'regulation-solicitor:write'],
  };

  const adminUser = {
    id: 'user-admin-1',
    name: 'Admin Geral',
    email: 'admin@saude.gov.br',
    phone: '(83) 97777-6666',
    activeProfileName: 'Administrador',
    linkedHealthCenterIds: ['hc-1'],
    permissions: ['admin:access', 'patients:read', 'patients:write'],
  };

  beforeEach(async () => {
    mockDb = createPatientsMockDb();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsService,
        { provide: DATABASE_CONNECTION, useValue: mockDb },
      ],
    }).compile();

    service = module.get<PatientsService>(PatientsService);
  });

  describe('toggleActive', () => {
    it('bloqueia Solicitante (UBS) com ForbiddenException ao tentar desativar ou reativar paciente', async () => {
      await expect(service.toggleActive('patient-1', solicitorUser)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('permite Administrador alternar status e registra entrada em patient_edit_history', async () => {
      await service.toggleActive('patient-1', adminUser);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.__insertedHistory).toHaveLength(1);
      expect(mockDb.__insertedHistory[0]).toEqual(
        expect.objectContaining({
          patientId: 'patient-1',
          origin: 'PATIENT_STATUS',
          editedByUserId: 'user-admin-1',
          editedByName: 'Admin Geral',
          editedByEmail: 'admin@saude.gov.br',
          editedByPhone: '(83) 97777-6666',
          changes: [
            expect.objectContaining({
              field: 'isActive',
              before: 'Ativo',
              after: 'Inativo',
            }),
          ],
        }),
      );
    });
  });

  describe('update permissions for Solicitante (UBS)', () => {
    it('rejeita edição se paciente não pertence a nenhuma unidade vinculada ao solicitante', async () => {
      mockDb.__setPatient(createMockPatient({ healthCenterId: 'hc-other-unit' }));

      await expect(
        service.update(
          'patient-1',
          { address: 'Rua Nova, 99 - Centro' },
          solicitorUser,
          { address: 'Rua Nova, 99 - Centro' },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejeita tentativa de Solicitante editar campo de identificação mesmo para paciente da própria UBS', async () => {
      await expect(
        service.update(
          'patient-1',
          { name: 'Outro Nome' },
          solicitorUser,
          { name: 'Outro Nome' },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejeita tentativa de Solicitante enviar isActive ou active no rawBody', async () => {
      await expect(
        service.update(
          'patient-1',
          { address: 'Rua B, 20 - Centro' },
          solicitorUser,
          { active: false, isActive: false },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('permite Solicitante atualizar Vínculo (inclusive transferindo para qualquer UBS do município), Endereço e Telefones e grava histórico', async () => {
      const nextAddress = 'Rua Atualizada, 250 - Jardim, São Bento - PB, CEP: 58865-000';
      await service.update(
        'patient-1',
        {
          healthCenterId: 'hc-municipal-99',
          healthAgentId: null,
          address: nextAddress,
          phones: [
            { phoneNumber: '(83) 99123-4567', isWhatsapp: true, label: 'WhatsApp' },
          ],
        },
        solicitorUser,
        {
          healthCenterId: 'hc-municipal-99',
          healthAgentId: null,
          address: nextAddress,
          phones: [
            { phoneNumber: '(83) 99123-4567', isWhatsapp: true, label: 'WhatsApp' },
          ],
        },
      );

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.__insertedHistory).toHaveLength(1);
      const historyEntry = mockDb.__insertedHistory[0];
      expect(historyEntry.origin).toBe('PATIENT_EDIT');
      expect(historyEntry.editedByUserId).toBe('user-sol-1');
      expect(historyEntry.editedByName).toBe('Enfermeira Maria');
      expect(historyEntry.editedByEmail).toBe('maria@ubs.gov.br');
      expect(historyEntry.editedByPhone).toBe('(83) 98888-7777');
      const changedFields = historyEntry.changes.map((c: any) => c.field);
      expect(changedFields).toEqual(
        expect.arrayContaining(['healthCenterId', 'healthAgentId', 'address', 'phones']),
      );
    });

    it('não grava histórico quando nenhum campo efetivamente mudou', async () => {
      const patient = createMockPatient();
      await service.update(
        'patient-1',
        { address: patient.address },
        solicitorUser,
        { address: patient.address },
      );

      expect(mockDb.__insertedHistory).toHaveLength(0);
    });

    it('completa dados do usuário editor via banco quando req.user não traz phone/name', async () => {
      await service.update(
        'patient-1',
        { address: 'Rua Nova Auditada, 55' },
        { id: 'user-sol-1', activeProfileName: 'Solicitante (UBS)', linkedHealthCenterIds: ['hc-1'], permissions: ['patients:write'] },
        { address: 'Rua Nova Auditada, 55' },
      );

      expect(mockDb.query.users.findFirst).toHaveBeenCalled();
      expect(mockDb.__insertedHistory).toHaveLength(1);
      expect(mockDb.__insertedHistory[0]).toEqual(
        expect.objectContaining({
          editedByUserId: 'user-sol-1',
          editedByName: 'Enfermeira Maria',
          editedByEmail: 'maria@ubs.gov.br',
          editedByPhone: '(83) 98888-7777',
        }),
      );
    });
  });

  describe('getEditHistory', () => {
    it('retorna lista de alterações registradas para paciente existente', async () => {
      mockDb.__insertedHistory.push({
        id: 'hist-1',
        patientId: 'patient-1',
        editedByUserId: 'user-sol-1',
        editedByName: 'Enfermeira Maria',
        editedByEmail: 'maria@ubs.gov.br',
        editedByPhone: '(83) 98888-7777',
        origin: 'PATIENT_EDIT',
        changes: [{ field: 'phones', label: 'Contatos Telefônicos', before: ['A'], after: ['B'] }],
        createdAt: '2026-11-11T10:00:00.000Z',
      });

      const history = await service.getEditHistory('patient-1');
      expect(history).toHaveLength(1);
      expect(history[0].editedByEmail).toBe('maria@ubs.gov.br');
    });

    it('lança NotFoundException quando paciente não existe', async () => {
      mockDb.query.patients.findFirst.mockResolvedValueOnce(null);
      await expect(service.getEditHistory('missing-id')).rejects.toThrow(NotFoundException);
    });
  });
});
