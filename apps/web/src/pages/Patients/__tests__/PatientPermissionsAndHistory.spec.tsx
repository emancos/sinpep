import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Patient, PatientEditHistoryEntry } from '../../../hooks/usePatients';

const HC_SOLICITOR_ID = '11111111-1111-4111-8111-111111111111';
const HC_OTHER_ID = '22222222-2222-4222-8222-222222222222';
const AGENT_ID = '33333333-3333-4333-8333-333333333333';

const updatePatientMutateAsyncMock = vi.fn();
const toggleActiveMutateAsyncMock = vi.fn();

let activePatientFixture: Patient;
let patientsListFixture: Patient[] = [];
let historyFixture: PatientEditHistoryEntry[] = [];

let authStoreState = {
  user: {
    id: 'user-sol-1',
    name: 'Enfermeira Maria',
    email: 'maria@ubs.gov.br',
    phone: '(83) 98888-7777',
    profileId: 'prof-sol',
    profileName: 'Solicitante (UBS)',
    healthCenterId: HC_SOLICITOR_ID,
    linkedHealthCenterIds: [HC_SOLICITOR_ID],
    isMunicipalRegulator: false,
  },
  activeProfile: { id: 'prof-sol', name: 'Solicitante (UBS)' },
  permissions: ['patients:read', 'patients:write'],
  token: 'test-token',
};

vi.mock('../../../store/useAuthStore', () => ({
  useAuthStore: (selector: (s: typeof authStoreState) => unknown) => selector(authStoreState),
}));

vi.mock('../../../hooks/usePatients', () => ({
  usePatients: () => ({
    data: { data: patientsListFixture, total: patientsListFixture.length },
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
  }),
  usePatient: () => ({
    data: activePatientFixture,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useUpdatePatient: () => ({
    mutate: updatePatientMutateAsyncMock,
    mutateAsync: updatePatientMutateAsyncMock,
    isPending: false,
  }),
  useDeletePatient: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useTogglePatientActive: () => ({
    mutateAsync: toggleActiveMutateAsyncMock,
    isPending: false,
  }),
  usePatientEditHistory: () => ({
    data: historyFixture,
    isLoading: false,
  }),
  useUpdatePatientAttention: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  checkPatientUnique: vi.fn(async () => ({ exists: false })),
}));

vi.mock('../../../hooks/useHealthCenters', () => ({
  useHealthCenters: () => ({
    data: {
      data: [
        { id: HC_SOLICITOR_ID, name: 'UBS Centro', cnes: '1111111' },
        { id: HC_OTHER_ID, name: 'UBS Zona Sul', cnes: '2222222' },
      ],
    },
    isLoading: false,
  }),
}));

vi.mock('../../../hooks/useHealthAgents', () => ({
  useHealthAgents: () => ({
    data: { data: [{ id: AGENT_ID, name: 'ACS Pedro', healthCenterId: HC_SOLICITOR_ID }] },
    isLoading: false,
  }),
}));

vi.mock('../../../hooks/useMedicalRecords', () => ({
  useMedicalRecords: () => ({
    data: { data: [] },
    isLoading: false,
  }),
}));

vi.mock('../../../hooks/usePermission', () => ({
  usePermission: () => ({
    hasPermission: (perm: string) => authStoreState.permissions.includes(perm),
  }),
}));

vi.mock('../../../contexts/ConfirmContext', () => ({
  useConfirm: () => vi.fn(async () => true),
}));

vi.mock('../../../services/viacep', () => ({
  fetchAddressByCep: vi.fn(async () => null),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

import { PatientsList } from '../index';
import { EditPatient } from '../Edit';
import { PatientDetails } from '../Details';

function makePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'pat-1',
    name: 'Carlos Henrique',
    cpf: '123.456.789-01',
    cns: '700000000000001',
    birthDate: '1982-06-15',
    gender: 'MASCULINO',
    healthCenterId: HC_SOLICITOR_ID,
    healthAgentId: AGENT_ID,
    address: 'Rua Principal, Nº 10 - Centro - São Bento/PB - CEP: 58865-000',
    isActive: true,
    attentionLevel: 1,
    attentionNotes: null,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
    phones: [{ id: 'ph-1', phoneNumber: '(83) 99999-1111', isWhatsapp: true }],
    healthCenter: { id: HC_SOLICITOR_ID, name: 'UBS Centro', cnes: '1111111' },
    healthAgent: { id: AGENT_ID, name: 'ACS Pedro' },
    ...overrides,
  };
}

describe('Permissões de Solicitante e Histórico de Edições de Pacientes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updatePatientMutateAsyncMock.mockResolvedValue({});
    authStoreState = {
      user: {
        id: 'user-sol-1',
        name: 'Enfermeira Maria',
        email: 'maria@ubs.gov.br',
        phone: '(83) 98888-7777',
        profileId: 'prof-sol',
        profileName: 'Solicitante (UBS)',
        healthCenterId: HC_SOLICITOR_ID,
        linkedHealthCenterIds: [HC_SOLICITOR_ID],
        isMunicipalRegulator: false,
      },
      activeProfile: { id: 'prof-sol', name: 'Solicitante (UBS)' },
      permissions: ['patients:read', 'patients:write', 'regulation-solicitor:write'],
      token: 'test-token',
    };
    activePatientFixture = makePatient();
    patientsListFixture = [
      makePatient({ id: 'pat-1', name: 'Paciente Minha UBS', healthCenterId: HC_SOLICITOR_ID }),
      makePatient({
        id: 'pat-2',
        name: 'Paciente Outra UBS',
        healthCenterId: HC_OTHER_ID,
        healthCenter: { id: HC_OTHER_ID, name: 'UBS Zona Sul', cnes: '2222222' },
      }),
    ];
    historyFixture = [
      {
        id: 'hist-1',
        patientId: 'pat-1',
        editedByUserId: 'user-sol-1',
        editedByName: 'Enfermeira Maria',
        editedByEmail: 'maria@ubs.gov.br',
        editedByPhone: '(83) 98888-7777',
        origin: 'PATIENT_EDIT',
        createdAt: '2026-11-11T14:30:00.000Z',
        changes: [
          {
            field: 'phones',
            label: 'Contatos telefônicos',
            before: '(83) 99999-1111',
            after: '(83) 98888-2222 (WhatsApp)',
          },
        ],
      },
    ];
  });

  it('PatientsList oculta ação de desativar para Solicitante e habilita Editar apenas para pacientes das unidades vinculadas', () => {
    render(
      <MemoryRouter>
        <PatientsList />
      </MemoryRouter>,
    );

    expect(screen.getByText('Paciente Minha UBS')).toBeInTheDocument();
    expect(screen.getByText('Paciente Outra UBS')).toBeInTheDocument();

    // Solicitante não vê botões de desativar/reativar
    expect(screen.queryByTitle(/Desativar Paciente/i)).toBeNull();
    expect(screen.queryByTitle(/Reativar Paciente/i)).toBeNull();

    // Paciente da unidade vinculada possui link/título Editar Paciente; o de outra UBS aparece bloqueado
    expect(screen.getByTitle('Editar Paciente')).toBeInTheDocument();
    expect(
      screen.getByTitle('Solicitantes (UBS) só podem editar pacientes vinculados às suas Unidades de Saúde'),
    ).toBeDisabled();
  });

  it('EditPatient inicia no Passo 2 para Solicitante, bloqueia Passo 1 e envia apenas Vínculo, Endereço e Telefones', async () => {
    const user = userEvent.setup();
    activePatientFixture = makePatient({ id: 'pat-1', healthCenterId: HC_SOLICITOR_ID });

    render(
      <MemoryRouter initialEntries={['/patients/pat-1/edit']}>
        <Routes>
          <Route path="/patients/:id/edit" element={<EditPatient />} />
        </Routes>
      </MemoryRouter>,
    );

    // Deve abrir diretamente no Passo 2 (Vínculo de Saúde Territorial)
    expect(screen.getByText('Vínculo de Saúde Territorial')).toBeInTheDocument();

    // Ao avançar para o Passo 3 e salvar, payload não pode conter dados de identificação
    await user.click(screen.getByRole('button', { name: /Avançar/i }));
    await user.click(screen.getByRole('button', { name: /Confirmar e Salvar/i }));

    await waitFor(() => {
      expect(updatePatientMutateAsyncMock).toHaveBeenCalledTimes(1);
    });

    const sent = updatePatientMutateAsyncMock.mock.calls[0][0] as { id: string; data: Record<string, unknown> };
    expect(sent.id).toBe('pat-1');
    expect(sent.data).toHaveProperty('healthCenterId', HC_SOLICITOR_ID);
    expect(sent.data).toHaveProperty('address');
    expect(sent.data).toHaveProperty('phones');
    expect(sent.data).not.toHaveProperty('name');
    expect(sent.data).not.toHaveProperty('cpf');
    expect(sent.data).not.toHaveProperty('cns');
  });

  it('EditPatient bloqueia acesso quando Solicitante tenta abrir edição de paciente de outra UBS', () => {
    activePatientFixture = makePatient({ id: 'pat-2', healthCenterId: HC_OTHER_ID });

    render(
      <MemoryRouter initialEntries={['/patients/pat-2/edit']}>
        <Routes>
          <Route path="/patients/:id/edit" element={<EditPatient />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /Voltar para a Lista/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Confirmar e Salvar/i })).toBeNull();
  });

  it('PatientDetails exibe Histórico de Edições com data/hora, ID, nome, email e telefone do usuário', () => {
    activePatientFixture = makePatient({ id: 'pat-1', healthCenterId: HC_OTHER_ID });

    render(
      <MemoryRouter initialEntries={['/patients/pat-1']}>
        <Routes>
          <Route path="/patients/:id" element={<PatientDetails />} />
        </Routes>
      </MemoryRouter>,
    );

    // Botão Solicitar Regulação permanece disponível mesmo em paciente de outra UBS
    expect(screen.getByRole('button', { name: /Solicitar Regulação/i })).toBeInTheDocument();
    // Botão Editar Paciente fica desabilitado para paciente de outra UBS
    const editBtn = screen.getByRole('button', { name: /Editar Paciente/i });
    expect(editBtn).toBeDisabled();

    // Card de histórico exibe usuário editor completo e alteração registrada
    expect(screen.getByText('Histórico de Edições do Paciente')).toBeInTheDocument();
    expect(screen.getByText('Enfermeira Maria')).toBeInTheDocument();
    expect(screen.getByText(/maria@ubs\.gov\.br/)).toBeInTheDocument();
    expect(screen.getByText(/\(83\) 98888-7777/)).toBeInTheDocument();
    expect(screen.getByText(/user-sol-1/)).toBeInTheDocument();
    expect(screen.getByText(/Contatos telefônicos/)).toBeInTheDocument();
  });
});
