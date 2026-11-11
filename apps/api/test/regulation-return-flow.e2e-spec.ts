import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { RegulationController } from '../src/regulation/regulation.controller';
import { RegulationService } from '../src/regulation/regulation.service';
import { PermissionsGuard } from '../src/auth/guards/permissions.guard';
import { StorageService } from '../src/storage/storage.service';
import { EventsGateway } from '../src/events/events.gateway';

function createE2ERegulationDb() {
  let currentRequest: any = {
    id: 'req-e2e-1',
    protocolNumber: 'REG-2026-E2E',
    status: 'PENDENTE_REGULACAO',
    type: 'CONSULTA',
    priority: 'NORMAL',
    cid10: 'I10',
    procedureId: 'proc-1',
    procedureGroupId: 'grp-1',
    specialtyId: 'spec-1',
    patientId: 'patient-e2e-1',
    requestingHealthCenterId: 'hc-ubs-1',
    executingHealthCenterId: null,
    clinicalJustification: 'Justificativa inicial suficiente para análise.',
    notes: 'Observação inicial.',
    returnEditableFields: [],
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z',
    attachments: [
      { id: 'att-keep', requestId: 'req-e2e-1', fileName: 'encaminhamento.pdf', fileUrl: 'https://drive.google.com/keep' },
      { id: 'att-remove', requestId: 'req-e2e-1', fileName: 'ilegivel.pdf', fileUrl: 'https://drive.google.com/shared-url' },
    ],
    patient: {
      id: 'patient-e2e-1',
      name: 'Paciente Integração',
      birthDate: '1975-09-01',
      healthCenterId: 'hc-other-ubs',
      patientAnamnesis: {
        id: 'anam-e2e-1',
        patientId: 'patient-e2e-1',
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
  };

  const statusHistory: any[] = [];
  const patientHistory: any[] = [];

  const db = {
    query: {
      regulationRequests: {
        findFirst: jest.fn(async () => ({
          ...structuredClone(currentRequest),
          statusHistory: structuredClone(statusHistory),
        })),
      },
      patientAnamnesis: {
        findFirst: jest.fn(async () => structuredClone(currentRequest.patient.patientAnamnesis)),
      },
      patients: {
        findFirst: jest.fn(async () => structuredClone(currentRequest.patient)),
      },
      users: {
        findFirst: jest.fn(async () => ({
          id: 'user-sol-e2e',
          name: 'Enfermeira UBS',
          email: 'enf@ubs.gov.br',
          phone: '(83) 99911-2233',
        })),
      },
      healthCenters: {
        findFirst: jest.fn(async () => ({ id: 'hc-ubs-1', name: 'UBS 1', cnes: '1234567' })),
      },
    },
    update: jest.fn(() => ({
      set: jest.fn((payload: any) => ({
        where: jest.fn(async () => {
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
          if (payload && 'type' in payload) {
            currentRequest.type = payload.type;
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
        currentRequest.attachments = currentRequest.attachments.filter((a: any) => a.id !== 'att-remove');
        return [];
      }),
    })),
    insert: jest.fn(() => ({
      values: jest.fn((valuesPayload: any) => {
        const rows = Array.isArray(valuesPayload) ? valuesPayload : [valuesPayload];
        for (const row of rows) {
          if (!row || typeof row !== 'object') continue;
          if ('newStatus' in row && 'requestId' in row) {
            statusHistory.unshift(row);
          } else if ('origin' in row && 'changes' in row) {
            patientHistory.unshift(row);
          } else if ('fileUrl' in row) {
            currentRequest.attachments.push(row);
          }
        }
        return {
          returning: jest.fn(async () => rows),
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
    execute: jest.fn(async () => ({ rows: [] })),
    __getRequest: () => currentRequest,
    __getPatientHistory: () => patientHistory,
  };

  return db;
}

describe('RegulationController Return Flow & Anamnesis (e2e)', () => {
  let app: INestApplication<App>;
  let mockDb: ReturnType<typeof createE2ERegulationDb>;
  let activeUser: any;

  const regulatorUser = {
    id: 'user-reg-e2e',
    name: 'Dr. Regulador',
    email: 'reg@saude.gov.br',
    isMunicipalRegulator: true,
    activeProfileName: 'Regulador (Central de Regulação)',
    permissions: ['regulation-operator:evaluate', 'regulation-operator:read'],
  };

  const solicitorUser = {
    id: 'user-sol-e2e',
    name: 'Enfermeira UBS',
    email: 'enf@ubs.gov.br',
    phone: '(83) 99911-2233',
    healthCenterId: 'hc-ubs-1',
    activeHealthCenterId: 'hc-ubs-1',
    linkedHealthCenterIds: ['hc-ubs-1'],
    activeProfileName: 'Solicitante (UBS)',
    permissions: [
      'regulation-solicitor:read',
      'regulation-solicitor:write',
      'regulation-solicitor:edit_returned',
    ],
  };

  beforeEach(async () => {
    mockDb = createE2ERegulationDb();
    activeUser = regulatorUser;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [RegulationController],
      providers: [
        RegulationService,
        Reflector,
        PermissionsGuard,
        { provide: 'DATABASE_CONNECTION', useValue: mockDb },
        {
          provide: StorageService,
          useValue: {
            uploadFile: jest.fn(async (file: any) => `https://drive.google.com/${file.originalname}`),
          },
        },
        {
          provide: EventsGateway,
          useValue: { server: { emit: jest.fn() } },
        },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = activeUser;
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /regulation/requests/:id/evaluate valida PermissionsGuard, rejeita DEVOLVER sem campos (400) e devolve com campos granulares (201)', async () => {
    // Solicitante não tem permissão regulation-operator:evaluate -> 403
    activeUser = solicitorUser;
    await request(app.getHttpServer())
      .post('/regulation/requests/req-e2e-1/evaluate')
      .send({ decision: 'DEVOLVER', justification: 'Teste sem permissão', returnEditableFields: ['CID10'] })
      .expect(403);

    // Regulador sem selecionar campos -> 400
    activeUser = regulatorUser;
    await request(app.getHttpServer())
      .post('/regulation/requests/req-e2e-1/evaluate')
      .send({ decision: 'DEVOLVER', justification: 'Falta corrigir CID e anexos', returnEditableFields: [] })
      .expect(400);

    // Regulador devolve selecionando CID10 e ATTACHMENTS -> 201
    const res = await request(app.getHttpServer())
      .post('/regulation/requests/req-e2e-1/evaluate')
      .send({
        decision: 'DEVOLVER',
        justification: 'Corrigir CID-10 e reenviar laudo legível.',
        returnEditableFields: ['CID10', 'ATTACHMENTS'],
      })
      .expect(201);

    expect(res.body.status).toBe('DEVOLVIDA');
    expect(res.body.returnEditableFields).toEqual(['CID10', 'ATTACHMENTS']);
  });

  it('PATCH /regulation/requests/:id/resubmit bloqueia campo não liberado (403) e permite editar somente os liberados + anexos (200)', async () => {
    // Regulador devolve liberando apenas CID10 e ATTACHMENTS
    activeUser = regulatorUser;
    await request(app.getHttpServer())
      .post('/regulation/requests/req-e2e-1/evaluate')
      .send({
        decision: 'DEVOLVER',
        justification: 'Ajustar apenas CID-10 e anexos.',
        returnEditableFields: ['CID10', 'ATTACHMENTS'],
      })
      .expect(201);

    activeUser = solicitorUser;

    // Tentativa de alterar campo não indicado (clinicalJustification / priority) -> 403
    const forbiddenFieldRes = await request(app.getHttpServer())
      .patch('/regulation/requests/req-e2e-1/resubmit')
      .field('priority', 'URGENCIA')
      .field('justification', 'Tentando alterar prioridade bloqueada')
      .expect(403);

    expect(forbiddenFieldRes.body.message).toContain('Nível de Prioridade');

    // Edição apenas dos campos liberados (cid10 + remover att-remove + adicionar novo PDF) -> 200
    const resubmitRes = await request(app.getHttpServer())
      .patch('/regulation/requests/req-e2e-1/resubmit')
      .field('cid10', 'I11')
      .field('removeAttachmentIds', JSON.stringify(['att-remove']))
      .field('justification', 'CID-10 corrigido e novo laudo anexado.')
      .attach('attachments', Buffer.from('%PDF-1.4 test'), {
        filename: 'novo-laudo.pdf',
        contentType: 'application/pdf',
      })
      .expect(200);

    expect(resubmitRes.body.status).toBe('PENDENTE_REGULACAO');
    expect(resubmitRes.body.cid10).toBe('I11');
    expect(resubmitRes.body.returnEditableFields).toEqual([]);
    expect(resubmitRes.body.attachments.some((a: any) => a.id === 'att-remove')).toBe(false);
    expect(resubmitRes.body.attachments.some((a: any) => a.fileName === 'novo-laudo.pdf')).toBe(true);
  });

  it('POST /regulation/requests permite Solicitante alterar anamnese de paciente de outra UBS e grava histórico', async () => {
    activeUser = solicitorUser;

    await request(app.getHttpServer())
      .post('/regulation/requests')
      .field('patientId', 'patient-e2e-1')
      .field('type', 'CONSULTA')
      .field('priority', 'NORMAL')
      .field('cid10', 'I10')
      .field('clinicalJustification', 'Solicitação de cardiologia com atualização de anamnese.')
      .field('anamnesis', JSON.stringify({ isHypertensive: true, allergies: 'Penicilina' }))
      .expect(201);

    const history = mockDb.__getPatientHistory();
    expect(history).toHaveLength(1);
    expect(history[0]).toEqual(
      expect.objectContaining({
        patientId: 'patient-e2e-1',
        origin: 'REGULATION_CREATE',
        editedByUserId: 'user-sol-e2e',
        editedByEmail: 'enf@ubs.gov.br',
      }),
    );
  });

  it('PATCH /regulation/requests/:id/resubmit permite editar vários exames do grupo quando PROCEDURE está liberado', async () => {
    activeUser = regulatorUser;
    await request(app.getHttpServer())
      .post('/regulation/requests/req-e2e-1/evaluate')
      .send({
        decision: 'DEVOLVER',
        justification: 'Revisar lista de exames de tomografia.',
        returnEditableFields: ['PROCEDURE'],
      })
      .expect(201);

    activeUser = solicitorUser;
    const res = await request(app.getHttpServer())
      .patch('/regulation/requests/req-e2e-1/resubmit')
      .field('type', 'EXAME')
      .field('procedureGroupId', 'grp-tc')
      .field(
        'groupProcedures',
        JSON.stringify([
          { procedureId: 'proc-tc-1', code: '0206010079', name: 'Tomografia de Crânio' },
          { procedureId: 'proc-tc-3', code: '0206030010', name: 'Tomografia de Abdome' },
        ]),
      )
      .field('justification', 'Ajustada lista de exames de tomografia solicitados.')
      .expect(200);

    expect(res.body.status).toBe('PENDENTE_REGULACAO');
    expect(res.body.procedureGroupId).toBe('grp-tc');
    expect(res.body.procedureId).toBe('proc-tc-1');
    expect(res.body.groupProcedures).toHaveLength(2);
    expect(res.body.groupProcedures[1].name).toBe('Tomografia de Abdome');
  });
});
