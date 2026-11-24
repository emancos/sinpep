import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Reception } from '../index';

const getReceptionScheduleWithMetaMock = vi.fn();
const enqueuePatientMock = vi.fn();

vi.mock('../../../services/reception', () => ({
  getReceptionScheduleWithMeta: (...args: any[]) => getReceptionScheduleWithMetaMock(...args),
  enqueuePatient: (...args: any[]) => enqueuePatientMock(...args),
  getQueueSettings: vi.fn().mockResolvedValue({ rule: 'PRIORITY_FIRST' }),
  updateQueueSettings: vi.fn().mockResolvedValue({ rule: 'PRIORITY_FIRST' }),
}));

vi.mock('../../../services/rooms', () => ({
  getRoomAllocations: vi.fn().mockResolvedValue([
    {
      id: 'alloc-1',
      specialtyName: 'CONSULTA EM DERMATOLOGIA',
      date: '2026-11-24',
      room: { id: 'room-1', number: '04', name: 'Consultório Dermatologia' },
    },
  ]),
  deallocateRoom: vi.fn(),
  getRoomsWithOccupancy: vi.fn().mockResolvedValue([]),
  allocateRoom: vi.fn(),
}));

vi.mock('../../../store/useAuthStore', () => ({
  useAuthStore: (selector: (state: any) => any) =>
    selector({
      token: 'test-token',
      user: { id: 'user-rec-1', name: 'Recepcionista Modelo' },
      activeProfile: { id: 'prof-rec', name: 'Recepcionista' },
    }),
}));

vi.mock('../../../hooks/useDoctors', () => ({
  useCurrentDoctor: () => ({ data: null, isLoading: false }),
}));

vi.mock('../../../contexts/SocketContext', () => ({
  useSocket: () => ({ socket: null }),
}));

vi.mock('../PriorityRuleSelector', () => ({
  PriorityRuleSelector: () => <div data-testid="priority-rule-selector" />,
}));

vi.mock('../ValidateConfirmationTokenModal', () => ({
  ValidateConfirmationTokenModal: () => null,
}));

vi.mock('../SelectRoomModal', () => ({
  SelectRoomModal: () => null,
}));

vi.mock('../CreatePatientModal', () => ({
  CreatePatientModal: () => null,
}));

vi.mock('../EnqueuePriorityModal', () => ({
  EnqueuePriorityModal: () => null,
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

describe('Reception (Interoperabilidade e-SUS Regulação & SINPeP)', () => {
  const renderPage = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/reception?date=2026-11-24']}>
          <Reception />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exibe agendas com pacientes agendados do e-SUS Regulação e do SINPeP com badges de origem', async () => {
    const user = userEvent.setup();

    getReceptionScheduleWithMetaMock.mockResolvedValue({
      specialties: {
        'CONSULTA EM CARDIOLOGIA': [
          {
            coSolicitacao: 'ESUS-100',
            hrMarcacao: '08:00',
            dtMarcacao: '2026-11-24',
            noProcedimentoInterno: 'CONSULTA EM CARDIOLOGIA',
            pacienteNome: 'PACIENTE ESUS MODELO',
            pacienteNuCpf: '11122233344',
            pacienteNuCns: '700000000000001',
            noEstabelecimentoExecutante: 'POLICLINICA ROBERVAL MEDEIROS DE ARAUJO',
            coCnesEstabelecimentoExecutante: '2606712',
            source: 'ESUS',
            isRegistered: true,
            patientId: 'pat-1',
            isQueued: false,
          },
        ],
        'CONSULTA EM DERMATOLOGIA': [
          {
            coSolicitacao: 'SOL-202611-0099',
            hrMarcacao: '09:00',
            dtMarcacao: '2026-11-24',
            noProcedimentoInterno: 'CONSULTA EM DERMATOLOGIA',
            pacienteNome: 'PACIENTE SINPEP DERM',
            pacienteNuCpf: '22233344455',
            pacienteNuCns: '700000000000002',
            noEstabelecimentoExecutante: 'POLICLINICA ROBERVAL MEDEIROS DE ARAUJO',
            coCnesEstabelecimentoExecutante: '2606712',
            confirmationToken: 'SB-1234-ABCD',
            source: 'SINPEP',
            isRegistered: true,
            patientId: 'pat-2',
            isQueued: false,
          },
        ],
      },
      meta: {
        executingUnit: {
          name: 'POLICLINICA ROBERVAL MEDEIROS DE ARAUJO',
          cnes: '2606712',
        },
        specialtyMeta: {
          'CONSULTA EM CARDIOLOGIA': {
            sources: ['ESUS'],
            esusCount: 1,
            sinpepBookedCount: 0,
            sinpepAvailableSlots: 0,
            sinpepTotalSlots: 0,
            sinpepSchedules: [],
          },
          'CONSULTA EM DERMATOLOGIA': {
            sources: ['SINPEP'],
            esusCount: 0,
            sinpepBookedCount: 1,
            sinpepAvailableSlots: 7,
            sinpepTotalSlots: 8,
            sinpepSchedules: [
              {
                scheduleId: 'sch-derm-1',
                doctorName: 'DR. DERMATOLOGISTA MODELO',
                startTime: '08:00',
                endTime: '12:00',
                scheduleType: 'CONSULTA',
              },
            ],
          },
        },
      },
    });

    renderPage();

    expect(await screen.findByText('CONSULTA EM CARDIOLOGIA')).toBeInTheDocument();
    expect(screen.getByText('CONSULTA EM DERMATOLOGIA')).toBeInTheDocument();
    expect(screen.getByText(/DR\. DERMATOLOGISTA MODELO/i)).toBeInTheDocument();
    expect(screen.getByText(/7 vagas livres/i)).toBeInTheDocument();
    expect(screen.getByText('POLICLINICA ROBERVAL MEDEIROS DE ARAUJO')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /CONSULTA EM DERMATOLOGIA/i }));

    await waitFor(() => {
      expect(screen.getByText('Escala SINPeP Ativa')).toBeInTheDocument();
    });
    expect(screen.getByText(/1 agendados • 7 vagas disponíveis/i)).toBeInTheDocument();
    expect(screen.getByText('PACIENTE SINPEP DERM')).toBeInTheDocument();
    expect(screen.getByText('Chave: SB-1234-ABCD')).toBeInTheDocument();
  });
});
