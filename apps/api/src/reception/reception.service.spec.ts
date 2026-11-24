import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { ReceptionService } from './reception.service';
import { DoctorsService } from '../doctors/doctors.service';
import { HealthCentersService } from '../health-centers/health-centers.service';
import { EventsGateway } from '../events/events.gateway';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ReceptionService - Interoperabilidade e-SUS Regulação e SINPeP', () => {
  let service: ReceptionService;
  let mockDb: any;
  let mockDoctorsService: any;
  let mockHealthCentersService: any;
  let mockEventsGateway: any;

  const originalEsusSecret = process.env.ESUS_API_SECRET;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.ESUS_API_SECRET = 'test-esus-secret';

    const makeSelectChain = (result: any[]) => ({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(result),
      }),
    });

    mockDb = {
      query: {
        healthCenters: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'hc-policlinica',
            name: 'POLICLINICA ROBERVAL MEDEIROS DE ARAUJO',
            cnes: '2606712',
          }),
        },
        scheduleSlots: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        regulationRequests: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      },
      select: jest.fn().mockImplementation(() => makeSelectChain([])),
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: 'queue-1', priority: 'CONVENCIONAL' }]),
        }),
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ id: 'queue-1' }]),
          }),
        }),
      }),
    };

    mockDoctorsService = {
      updateDoctorCpfAndCredentialsByCns: jest.fn(),
      create: jest.fn(),
    };

    mockHealthCentersService = {
      searchProfessionals: jest.fn(),
      searchCnes: jest.fn(),
    };

    mockEventsGateway = {
      server: {
        emit: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceptionService,
        { provide: 'DATABASE_CONNECTION', useValue: mockDb },
        { provide: DoctorsService, useValue: mockDoctorsService },
        { provide: HealthCentersService, useValue: mockHealthCentersService },
        { provide: EventsGateway, useValue: mockEventsGateway },
      ],
    }).compile();

    service = module.get<ReceptionService>(ReceptionService);
  });

  afterAll(() => {
    process.env.ESUS_API_SECRET = originalEsusSecret;
  });

  it('não deve exibir escala SINPeP vazia (sem pacientes agendados)', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        hits: {
          hits: [
            {
              _source: {
                coSolicitacao: 'ESUS-001',
                hrMarcacao: '08:00',
                dtMarcacao: '2026-11-24',
                noProcedimentoInterno: 'CONSULTA EM CARDIOLOGIA',
                pacienteNome: 'PACIENTE ESUS MODELO',
                pacienteNuCpf: '11122233344',
                pacienteNuCns: '700000000000001',
                noEstabelecimentoExecutante: 'POLICLINICA ROBERVAL MEDEIROS DE ARAUJO',
                coCnesEstabelecimentoExecutante: '2606712',
              },
            },
          ],
        },
      },
    });

    mockDb.query.scheduleSlots.findMany.mockResolvedValueOnce([
      {
        id: 'slot-derm-1',
        scheduleId: 'sch-derm-1',
        date: '2026-11-24',
        time: '09:00',
        slotType: 'PRIMEIRA_VEZ',
        status: 'DISPONIVEL',
        patientId: null,
        patient: null,
        regulationRequestId: null,
        regulationRequest: null,
        schedule: {
          id: 'sch-derm-1',
          isActive: true,
          scheduleType: 'CONSULTA',
          startTime: '09:00',
          endTime: '12:00',
          executingHealthCenter: {
            id: 'hc-policlinica',
            name: 'POLICLINICA ROBERVAL MEDEIROS DE ARAUJO',
            cnes: '2606712',
          },
          procedure: { id: 'proc-derm', name: 'Consulta em Dermatologia' },
          procedureGroup: null,
          doctor: {
            id: 'doc-derm',
            cns: '700000000000009',
            cpf: '55566677788',
            user: { name: 'DR. DERMATOLOGISTA MODELO' },
          },
        },
      },
    ]);

    const result = await service.getEsusSchedule('2026-11-24', '2606712', true);

    expect(Object.keys(result.specialties)).toEqual(['CONSULTA EM CARDIOLOGIA']);
    expect(result.specialties['CONSULTA EM DERMATOLOGIA']).toBeUndefined();
    expect(result.meta.specialtyMeta['CONSULTA EM DERMATOLOGIA']).toBeUndefined();
  });

  it('deve unificar atendimentos do e-SUS e do SINPeP sob a mesma especialidade normalizada e filtrar outro CNES', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        hits: {
          hits: [
            {
              _source: {
                coSolicitacao: 'ESUS-DERM-1',
                hrMarcacao: '08:00',
                dtMarcacao: '2026-11-24',
                noProcedimentoInterno: 'CONSULTA EM DERMATOLOGIA',
                pacienteNome: 'PACIENTE ESUS DERM',
                pacienteNuCpf: '11122233344',
                pacienteNuCns: '700000000000001',
                noEstabelecimentoExecutante: 'POLICLINICA ROBERVAL MEDEIROS DE ARAUJO',
                coCnesEstabelecimentoExecutante: '2606712',
              },
            },
          ],
        },
      },
    });

    mockDb.query.scheduleSlots.findMany.mockResolvedValueOnce([
      {
        id: 'slot-derm-booked',
        scheduleId: 'sch-derm-1',
        date: '2026-11-24',
        time: '08:30',
        slotType: 'PRIMEIRA_VEZ',
        status: 'AGENDADO',
        patientId: 'pat-sinpep-1',
        patient: {
          id: 'pat-sinpep-1',
          name: 'PACIENTE SINPEP DERM',
          cpf: '22233344455',
          cns: '700000000000002',
        },
        regulationRequestId: 'req-sinpep-1',
        regulationRequest: {
          id: 'req-sinpep-1',
          protocolNumber: 'SOL-202611-0099',
          confirmationToken: 'SB-1234-ABCD',
          procedure: { id: 'proc-derm', name: 'Consulta em Dermatologia' },
        },
        schedule: {
          id: 'sch-derm-1',
          isActive: true,
          scheduleType: 'CONSULTA',
          startTime: '08:00',
          endTime: '12:00',
          executingHealthCenter: {
            id: 'hc-policlinica',
            name: 'POLICLINICA ROBERVAL MEDEIROS DE ARAUJO',
            cnes: '2606712',
          },
          procedure: { id: 'proc-derm', name: 'Consulta em Dermatologia' },
          procedureGroup: null,
          doctor: {
            id: 'doc-derm',
            cns: '700000000000009',
            cpf: '55566677788',
            user: { name: 'DR. DERMATOLOGISTA MODELO' },
          },
        },
      },
      // Slot de outra unidade (CNES diferente) deve ser ignorado
      {
        id: 'slot-outra-unidade',
        scheduleId: 'sch-outra',
        date: '2026-11-24',
        time: '10:00',
        slotType: 'PRIMEIRA_VEZ',
        status: 'DISPONIVEL',
        patientId: null,
        patient: null,
        regulationRequestId: null,
        regulationRequest: null,
        schedule: {
          id: 'sch-outra',
          isActive: true,
          scheduleType: 'CONSULTA',
          startTime: '10:00',
          endTime: '12:00',
          executingHealthCenter: {
            id: 'hc-outra',
            name: 'OUTRA UNIDADE',
            cnes: '9999999',
          },
          procedure: { id: 'proc-oftalmo', name: 'Consulta em Oftalmologia' },
          procedureGroup: null,
          doctor: { user: { name: 'DR. OUTRO' } },
        },
      },
    ]);

    const result = await service.getEsusSchedule('2026-11-24', '2606712', true);

    expect(Object.keys(result.specialties)).toEqual(['CONSULTA EM DERMATOLOGIA']);
    expect(result.specialties['CONSULTA EM DERMATOLOGIA']).toHaveLength(2);

    const sources = result.specialties['CONSULTA EM DERMATOLOGIA'].map((p: any) => p.source);
    expect(sources).toEqual(['ESUS', 'SINPEP']);
    expect(result.specialties['CONSULTA EM DERMATOLOGIA'][1]).toMatchObject({
      coSolicitacao: 'SOL-202611-0099',
      confirmationToken: 'SB-1234-ABCD',
      pacienteNome: 'PACIENTE SINPEP DERM',
      isRegistered: true,
      patientId: 'pat-sinpep-1',
    });

    expect(result.meta.specialtyMeta['CONSULTA EM DERMATOLOGIA']).toMatchObject({
      sources: ['ESUS', 'SINPEP'],
      esusCount: 1,
      sinpepBookedCount: 1,
      sinpepAvailableSlots: 0,
      sinpepTotalSlots: 1,
    });
  });

  it('não deve chamar autoRegisterDoctor ao enfileirar paciente de origem SINPEP', async () => {
    const autoRegisterSpy = jest.spyOn(service, 'autoRegisterDoctor').mockResolvedValue(undefined);

    await service.enqueuePatient(
      'pat-sinpep-1',
      'CONSULTA EM DERMATOLOGIA',
      '2026-11-24',
      'SOL-202611-0099',
      { source: 'SINPEP', noProfissionalExecutante: 'DR. DERMATOLOGISTA MODELO' },
      'CONVENCIONAL',
    );

    expect(autoRegisterSpy).not.toHaveBeenCalled();
  });
});
