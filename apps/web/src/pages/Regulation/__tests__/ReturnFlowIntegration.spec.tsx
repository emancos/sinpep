import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { RegulationRequest } from '../../../services/regulation';

const evaluateMutateAsyncMock = vi.fn();
const resubmitMutateAsyncMock = vi.fn();
const toastErrorMock = vi.fn();
let currentRequestFixture: RegulationRequest;

let authStoreState = {
  user: {
    id: 'user-sol-1',
    name: 'Maria Solicitante',
    email: 'maria@ubs.gov.br',
    profileId: 'prof-sol',
    profileName: 'Solicitante (UBS)',
    healthCenterId: 'hc-1',
    linkedHealthCenterIds: ['hc-1'],
    isMunicipalRegulator: false,
  },
  activeProfile: { id: 'prof-sol', name: 'Solicitante (UBS)' },
  permissions: ['regulation-solicitor:read', 'regulation-solicitor:write', 'regulation-solicitor:edit_returned'],
};

vi.mock('../../../store/useAuthStore', () => ({
  useAuthStore: (selector: (s: typeof authStoreState) => unknown) => selector(authStoreState),
}));

vi.mock('../../../hooks/useRegulation', () => ({
  useEvaluateRegulationRequest: () => ({
    mutateAsync: evaluateMutateAsyncMock,
    isPending: false,
  }),
  useRegulationRequest: () => ({
    data: currentRequestFixture,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useResubmitRegulationRequest: () => ({
    mutateAsync: resubmitMutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock('../../../hooks/useSchedules', () => ({
  useAvailableSlots: () => ({ data: [], isLoading: false }),
}));

vi.mock('../../../hooks/useProcedures', () => ({
  useProcedureGroups: () => ({
    data: [
      { id: 'grp-1', name: 'Consultas Médicas' },
      { id: 'grp-tc', name: 'GRUPO - TOMOGRAFIA - GERAL' },
    ],
  }),
  useProcedures: () => ({
    data: {
      data: [
        { id: 'proc-1', code: '0301010072', name: 'Consulta em Cardiologia', procedureGroupId: 'grp-1', type: 'CONSULTA' },
        { id: 'proc-tc-1', code: '0206010079', name: 'Tomografia de Crânio', procedureGroupId: 'grp-tc', type: 'EXAME' },
        { id: 'proc-tc-2', code: '0206020031', name: 'Tomografia de Tórax', procedureGroupId: 'grp-tc', type: 'EXAME' },
        { id: 'proc-tc-3', code: '0206030010', name: 'Tomografia de Abdome', procedureGroupId: 'grp-tc', type: 'EXAME' },
      ],
    },
  }),
}));

vi.mock('../BookSlotModal', () => ({
  BookSlotModal: () => null,
}));

vi.mock('../RegulationRequestPrintModal', () => ({
  RegulationRequestPrintModal: () => null,
}));

vi.mock('../components/Cid10SelectorInput', () => ({
  Cid10SelectorInput: ({
    value,
    onChange,
    disabled,
  }: {
    value: string;
    onChange: (val: string) => void;
    disabled?: boolean;
  }) => (
    <input
      aria-label="Diagnóstico Principal (CID-10)"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: (...args: unknown[]) => toastErrorMock(...args),
    warning: vi.fn(),
  },
}));

import { EvaluateRegulationModal } from '../EvaluateRegulationModal';
import { RequestDetailsPage } from '../RequestDetailsPage';
import { SolicitorDashboard } from '../../Dashboard/components/SolicitorDashboard';

function buildBaseRequest(overrides: Partial<RegulationRequest> = {}): RegulationRequest {
  return {
    id: 'req-123',
    protocolNumber: 'REG-2026-0123',
    status: 'DEVOLVIDA',
    type: 'CONSULTA',
    priority: 'ELETIVO',
    cid10: 'I10',
    clinicalJustification: 'Paciente apresenta hipertensão de difícil controle.',
    clinicalHistory: 'Uso regular de losartana 50mg.',
    returnEditableFields: ['CID10', 'ATTACHMENTS'],
    patientId: 'patient-1',
    requestingHealthCenterId: 'hc-1',
    requestingUserId: 'user-sol-1',
    procedureId: 'proc-1',
    procedureGroupId: 'grp-1',
    specialtyId: 'spec-1',
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-02T10:00:00.000Z',
    patient: {
      id: 'patient-1',
      name: 'João da Silva',
      cpf: '111.222.333-44',
      cns: '700000000000001',
      birthDate: '1970-05-10',
      gender: 'MASCULINO',
      patientAnamnesis: {
        isHypertensive: true,
        isDiabetic: false,
        isSmoker: false,
        otherDiseases: null,
        isOncological: false,
        oncologicalStage: null,
        allergies: 'Nenhuma',
        isPcd: false,
        pcdDescription: null,
        continuousMedications: [],
      },
    },
    requestingHealthCenter: { id: 'hc-1', name: 'UBS Centro', cnes: '1234567' },
    requestingUser: { id: 'user-sol-1', name: 'Maria Solicitante', email: 'maria@ubs.gov.br' },
    procedure: { id: 'proc-1', code: '0301010072', name: 'Consulta em Cardiologia' },
    procedureGroup: { id: 'grp-1', name: 'Consultas Médicas' },
    attachments: [
      {
        id: 'att-1',
        fileName: 'ecg-antigo.pdf',
        fileUrl: 'https://drive.google.com/att-1',
        fileType: 'application/pdf',
        fileSize: 1024,
        createdAt: '2026-11-01T10:00:00.000Z',
      },
    ],
    statusHistory: [
      {
        id: 'hist-1',
        previousStatus: 'PENDENTE_REGULACAO',
        newStatus: 'DEVOLVIDA',
        justification: 'CID-10 divergente e anexo ilegível.',
        editableFields: ['CID10', 'ATTACHMENTS'],
        createdAt: '2026-11-02T10:00:00.000Z',
        actionByUser: { id: 'reg-1', name: 'Dr. Regulador' },
      },
    ],
    ...overrides,
  };
}

describe('Fluxo de Devolução Granular (Frontend Integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    evaluateMutateAsyncMock.mockResolvedValue({});
    resubmitMutateAsyncMock.mockResolvedValue({});
    currentRequestFixture = buildBaseRequest();
    authStoreState = {
      user: {
        id: 'user-sol-1',
        name: 'Maria Solicitante',
        email: 'maria@ubs.gov.br',
        profileId: 'prof-sol',
        profileName: 'Solicitante (UBS)',
        healthCenterId: 'hc-1',
        linkedHealthCenterIds: ['hc-1'],
        isMunicipalRegulator: false,
      },
      activeProfile: { id: 'prof-sol', name: 'Solicitante (UBS)' },
      permissions: ['regulation-solicitor:read', 'regulation-solicitor:write', 'regulation-solicitor:edit_returned'],
    };
  });

  it('EvaluateRegulationModal exige seleção de ao menos 1 campo ao devolver e envia returnEditableFields', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <EvaluateRegulationModal
        isOpen={true}
        onClose={onClose}
        request={buildBaseRequest({ status: 'PENDENTE_REGULACAO', returnEditableFields: [] })}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Devolver para UBS/i }));
    await user.type(
      screen.getByPlaceholderText(/Ex: Favor anexar exame/i),
      'Favor corrigir CID-10 e reenviar anexo legível.',
    );

    // Sem marcar nenhum campo, exibe erro e não submete
    const confirmBtn = screen.getByRole('button', { name: /Confirmar Avaliação/i });
    await user.click(confirmBtn);
    expect(toastErrorMock).toHaveBeenCalledWith(
      'Selecione pelo menos um campo que o solicitante deve corrigir.',
    );
    expect(evaluateMutateAsyncMock).not.toHaveBeenCalled();

    // Seleciona CID10 e ATTACHMENTS
    await user.click(screen.getByLabelText(/Diagnóstico Principal \(CID-10\)/i));
    await user.click(screen.getByLabelText(/Anexos e Documentos/i));

    await user.click(confirmBtn);

    await waitFor(() => {
      expect(evaluateMutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'req-123',
          decision: 'DEVOLVER',
          returnEditableFields: ['CID10', 'ATTACHMENTS'],
        }),
      );
    });
  });

  it('SolicitorDashboard redireciona "Corrigir & Reenviar" diretamente para /regulation/requests/:id?edit=true', () => {
    render(
      <MemoryRouter>
        <SolicitorDashboard
          isLoading={false}
          summary={{
            profile: 'Solicitante (UBS)',
            kpis: { returned: 1 },
            alerts: [
              {
                id: 'req-123',
                protocolNumber: 'REG-2026-0123',
                patientName: 'João da Silva',
                procedureName: 'Consulta em Cardiologia',
                priority: 'ELETIVO',
                returnReason: 'Corrigir CID-10.',
                updatedAt: '2026-11-02T10:00:00.000Z',
              },
            ],
            recentScheduled: [],
          }}
        />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: /Corrigir & Reenviar/i });
    expect(link).toHaveAttribute('href', '/regulation/requests/req-123?edit=true');
  });

  it('RequestDetailsPage (?edit=true) libera apenas campos indicados e envia FormData restrito no reenvio', async () => {
    const user = userEvent.setup();
    currentRequestFixture = buildBaseRequest({
      status: 'DEVOLVIDA',
      returnEditableFields: ['CID10', 'ATTACHMENTS'],
    });

    const renderWithRouter = (ui: React.ReactElement) =>
      render(
        <MemoryRouter initialEntries={['/regulation/requests/req-123?edit=true']}>
          <Routes>
            <Route path="/regulation/requests/:id" element={ui} />
          </Routes>
        </MemoryRouter>,
      );

    renderWithRouter(<RequestDetailsPage />);

    // CID-10 está liberado e editável
    const cidInput = screen.getByLabelText(/Diagnóstico Principal \(CID-10\)/i);
    expect(cidInput).toBeEnabled();

    // Prioridade e Justificativa Clínica NÃO foram indicadas -> permanecem bloqueadas
    expect(screen.queryByRole('textarea')).toBeNull();
    const lockedJust = screen.queryByDisplayValue('Paciente apresenta hipertensão de difícil controle.');
    expect(lockedJust).toBeNull();

    // Botão de remover anexo existente está disponível porque ATTACHMENTS está liberado
    const removeAttachmentBtn = screen.getByTitle(/Remover anexo/i);
    await user.click(removeAttachmentBtn);

    // Altera CID-10 e preenche justificativa da correção
    await user.clear(cidInput);
    await user.type(cidInput, 'I11');
    await user.type(
      screen.getByPlaceholderText(/Ex: Justificativa clínica complementada/i),
      'CID-10 atualizado e anexo substituído.',
    );

    await user.click(screen.getByRole('button', { name: /Reenviar Solicitação Corrigida/i }));

    await waitFor(() => {
      expect(resubmitMutateAsyncMock).toHaveBeenCalledTimes(1);
    });

    const callArg = resubmitMutateAsyncMock.mock.calls[0][0] as { id: string; formData: FormData };
    expect(callArg.id).toBe('req-123');
    expect(callArg.formData.get('cid10')).toBe('I11');
    expect(callArg.formData.get('removeAttachmentIds')).toBe(JSON.stringify(['att-1']));
    expect(callArg.formData.get('justification')).toBe('CID-10 atualizado e anexo substituído.');
    expect(callArg.formData.get('priority')).toBeNull();
    expect(callArg.formData.get('clinicalJustification')).toBeNull();
  });

  it('RequestDetailsPage permite editar lista completa de exames do grupo (adicionar/remover) quando PROCEDURE está liberado', async () => {
    const user = userEvent.setup();
    currentRequestFixture = buildBaseRequest({
      status: 'DEVOLVIDA',
      type: 'EXAME',
      procedureGroupId: 'grp-tc',
      procedureId: 'proc-tc-1',
      procedureGroup: { id: 'grp-tc', name: 'GRUPO - TOMOGRAFIA - GERAL' },
      procedure: { id: 'proc-tc-1', code: '0206010079', name: 'Tomografia de Crânio' },
      groupProcedures: [
        { procedureId: 'proc-tc-1', code: '0206010079', name: 'Tomografia de Crânio' },
        { procedureId: 'proc-tc-2', code: '0206020031', name: 'Tomografia de Tórax' },
      ],
      returnEditableFields: ['PROCEDURE'],
    });

    render(
      <MemoryRouter initialEntries={['/regulation/requests/req-123?edit=true']}>
        <Routes>
          <Route path="/regulation/requests/:id" element={<RequestDetailsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Procedimentos \/ Exames Selecionados \(2\)/i)).toBeInTheDocument();

    // Remove Tomografia de Crânio
    await user.click(screen.getByRole('button', { name: /Remover Tomografia de Crânio/i }));
    expect(screen.getByText(/Procedimentos \/ Exames Selecionados \(1\)/i)).toBeInTheDocument();

    // Seleciona e adiciona Tomografia de Abdome
    await user.selectOptions(screen.getByLabelText(/Adicionar procedimento ao grupo/i), 'proc-tc-3');
    await user.click(screen.getByRole('button', { name: /^Adicionar$/i }));
    expect(screen.getByText(/Procedimentos \/ Exames Selecionados \(2\)/i)).toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText(/Ex: Justificativa clínica complementada/i),
      'Substituída TC de Crânio por TC de Abdome no grupo.',
    );

    await user.click(screen.getByRole('button', { name: /Reenviar Solicitação Corrigida/i }));

    await waitFor(() => {
      expect(resubmitMutateAsyncMock).toHaveBeenCalledTimes(1);
    });

    const callArg = resubmitMutateAsyncMock.mock.calls[0][0] as { id: string; formData: FormData };
    expect(callArg.formData.get('type')).toBe('EXAME');
    expect(callArg.formData.get('procedureGroupId')).toBe('grp-tc');
    expect(callArg.formData.get('procedureId')).toBe('proc-tc-2');
    expect(JSON.parse(String(callArg.formData.get('groupProcedures')))).toEqual([
      { procedureId: 'proc-tc-2', code: '0206020031', name: 'Tomografia de Tórax' },
      { procedureId: 'proc-tc-3', code: '0206030010', name: 'Tomografia de Abdome' },
    ]);
  });
});
