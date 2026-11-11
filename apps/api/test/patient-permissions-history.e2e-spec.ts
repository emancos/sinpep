import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { PatientsController } from '../src/patients/patients.controller';
import { PatientsService } from '../src/patients/patients.service';
import { DATABASE_CONNECTION } from '../src/database/database.constants';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../src/auth/guards/permissions.guard';

function createE2EPatientsDb() {
  const INITIAL_HC_ID = '11111111-1111-4111-8111-111111111111';
  let patient: any = {
    id: 'patient-e2e-1',
    name: 'Maria da Paz',
    cpf: '222.333.444-55',
    cns: '700000000000002',
    email: 'maria@example.com',
    birthDate: '1988-02-14',
    gender: 'FEMININO',
    healthCenterId: INITIAL_HC_ID,
    healthAgentId: '33333333-3333-4333-8333-333333333333',
    attentionLevel: 1,
    attentionNotes: null,
    isActive: true,
    address: 'Rua Antiga, 10 - Centro, São Bento - PB',
    patientPhones: [{ id: 'ph-1', phoneNumber: '(83) 99999-0001', isWhatsapp: true, label: 'Celular' }],
    phones: [{ id: 'ph-1', phoneNumber: '(83) 99999-0001', isWhatsapp: true, label: 'Celular' }],
    healthCenter: { id: INITIAL_HC_ID, name: 'UBS 1', cnes: '1111111' },
    healthAgent: { id: '33333333-3333-4333-8333-333333333333', name: 'ACS João' },
    patientAnamnesis: null,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
  };

  const editHistory: any[] = [];

  const db = {
    query: {
      patients: {
        findFirst: jest.fn(async () => structuredClone(patient)),
      },
      patientAnamnesis: {
        findFirst: jest.fn(async () => null),
      },
      patientEditHistory: {
        findMany: jest.fn(async () => structuredClone(editHistory)),
      },
      users: {
        findFirst: jest.fn(async () => ({
          id: 'user-sol-e2e',
          name: 'Enfermeira UBS',
          email: 'enf@ubs.gov.br',
          phone: '(83) 98888-1234',
        })),
      },
    },
    update: jest.fn(() => ({
      set: jest.fn((payload: any) => ({
        where: jest.fn(async () => {
          if ('isActive' in payload) patient.isActive = payload.isActive;
          if ('healthCenterId' in payload) patient.healthCenterId = payload.healthCenterId;
          if ('healthAgentId' in payload) patient.healthAgentId = payload.healthAgentId;
          if ('address' in payload) patient.address = payload.address;
          if ('name' in payload) patient.name = payload.name;
          return [patient];
        }),
      })),
    })),
    delete: jest.fn(() => ({
      where: jest.fn(async () => {
        patient.patientPhones = [];
        patient.phones = [];
        return [];
      }),
    })),
    insert: jest.fn(() => ({
      values: jest.fn((valuesPayload: any) => {
        const items = Array.isArray(valuesPayload) ? valuesPayload : [valuesPayload];
        for (const item of items) {
          if (!item || typeof item !== 'object') continue;
          if ('origin' in item && 'changes' in item) {
            editHistory.unshift(item);
          } else if ('phoneNumber' in item) {
            const p = {
              id: item.id || `ph-new-${patient.patientPhones.length}`,
              phoneNumber: item.phoneNumber,
              isWhatsapp: Boolean(item.isWhatsapp),
              label: item.label ?? 'Principal',
            };
            patient.patientPhones.push(p);
            patient.phones.push(p);
          }
        }
        return { returning: jest.fn(async () => items) };
      }),
    })),
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => ({
          orderBy: jest.fn(async () => structuredClone(editHistory)),
        })),
      })),
    })),
    __setHealthCenterId: (hcId: string) => {
      patient.healthCenterId = hcId;
    },
  };

  return db;
}

describe('PatientsController Solicitor Permissions & Edit History (e2e)', () => {
  let app: INestApplication<App>;
  let mockDb: ReturnType<typeof createE2EPatientsDb>;
  let activeUser: any;

  const HC_SOLICITOR_ID = '11111111-1111-4111-8111-111111111111';
  const HC_OTHER_ID = '99999999-9999-4999-8999-999999999999';
  const HC_TARGET_MUNICIPAL_ID = '22222222-2222-4222-8222-222222222222';

  const solicitorUser = {
    id: 'user-sol-e2e',
    name: 'Enfermeira UBS',
    email: 'enf@ubs.gov.br',
    phone: '(83) 98888-1234',
    healthCenterId: HC_SOLICITOR_ID,
    linkedHealthCenterIds: [HC_SOLICITOR_ID],
    activeProfileName: 'Solicitante (UBS)',
    permissions: ['patients:read', 'patients:write'],
  };

  const adminUser = {
    id: 'user-admin-e2e',
    name: 'Administrador Municipal',
    email: 'admin@saude.gov.br',
    phone: '(83) 97777-0000',
    linkedHealthCenterIds: [HC_SOLICITOR_ID],
    activeProfileName: 'Administrador',
    permissions: ['admin:access', 'patients:read', 'patients:write'],
  };

  beforeEach(async () => {
    mockDb = createE2EPatientsDb();
    activeUser = solicitorUser;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PatientsController],
      providers: [
        PatientsService,
        Reflector,
        PermissionsGuard,
        { provide: DATABASE_CONNECTION, useValue: mockDb },
      ],
    })
      .overrideGuard(JwtAuthGuard)
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

  it('PATCH /patients/:id/toggle-active retorna 403 para Solicitante e 200 com histórico para Administrador', async () => {
    activeUser = solicitorUser;
    await request(app.getHttpServer())
      .patch('/patients/patient-e2e-1/toggle-active')
      .expect(403);

    activeUser = adminUser;
    const adminRes = await request(app.getHttpServer())
      .patch('/patients/patient-e2e-1/toggle-active')
      .expect(200);

    expect(adminRes.body.isActive).toBe(false);

    const historyRes = await request(app.getHttpServer())
      .get('/patients/patient-e2e-1/history')
      .expect(200);

    expect(historyRes.body).toHaveLength(1);
    expect(historyRes.body[0]).toEqual(
      expect.objectContaining({
        origin: 'PATIENT_STATUS',
        editedByUserId: 'user-admin-e2e',
        editedByEmail: 'admin@saude.gov.br',
      }),
    );
  });

  it('PUT /patients/:id impõe bloqueio de identificação/unidade não vinculada para Solicitante (403) e registra histórico ao editar vínculo/endereço/telefones (200)', async () => {
    activeUser = solicitorUser;

    // 1. Tentativa de editar CPF/Nome mesmo na própria unidade -> 403
    await request(app.getHttpServer())
      .put('/patients/patient-e2e-1')
      .send({ name: 'Nome Fraudulento' })
      .expect(403);

    // 2. Tentativa de desativar via body não-whitelisted (active: false) -> ValidationPipe + rawBody check -> 403
    await request(app.getHttpServer())
      .put('/patients/patient-e2e-1')
      .send({ active: false })
      .expect(403);

    // 3. Paciente vinculado a outra unidade -> 403
    mockDb.__setHealthCenterId(HC_OTHER_ID);
    await request(app.getHttpServer())
      .put('/patients/patient-e2e-1')
      .send({ address: 'Rua Bloqueada, 100' })
      .expect(403);

    // 4. Paciente na unidade do solicitante -> edita Vínculo (inclusive transferindo para outra UBS do município), Endereço e Telefones -> 200
    mockDb.__setHealthCenterId(HC_SOLICITOR_ID);
    await request(app.getHttpServer())
      .put('/patients/patient-e2e-1')
      .send({
        healthCenterId: HC_TARGET_MUNICIPAL_ID,
        address: 'Rua Permitida, 300 - Centro, São Bento - PB',
        phones: [{ phoneNumber: '(83) 99888-7777', isWhatsapp: true }],
      })
      .expect(200);

    // 5. GET /patients/:id/history retorna histórico detalhado com usuário completo
    const historyRes = await request(app.getHttpServer())
      .get('/patients/patient-e2e-1/history')
      .expect(200);

    expect(historyRes.body).toHaveLength(1);
    expect(historyRes.body[0]).toEqual(
      expect.objectContaining({
        origin: 'PATIENT_EDIT',
        editedByUserId: 'user-sol-e2e',
        editedByName: 'Enfermeira UBS',
        editedByEmail: 'enf@ubs.gov.br',
        editedByPhone: '(83) 98888-1234',
      }),
    );
  });
});
