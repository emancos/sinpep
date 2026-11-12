import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import { CreateRegulationRequest } from '../CreateRegulationRequest';

const createRequestMutateAsyncMock = vi.fn();

const authStoreState = {
  token: 'test-token',
  user: {
    id: 'user-sol-1',
    name: 'Maria Solicitante',
    email: 'maria@ubs.gov.br',
    healthCenterId: 'hc-1',
    linkedHealthCenterIds: ['hc-1'],
  },
  activeProfile: { id: 'prof-sol', name: 'Solicitante (UBS)' },
  permissions: ['regulation-solicitor:read', 'regulation-solicitor:write'],
};

vi.mock('../../../store/useAuthStore', () => ({
  useAuthStore: (selector: (state: typeof authStoreState) => unknown) => selector(authStoreState),
}));

vi.mock('../../../hooks/useRegulation', () => ({
  useCreateRegulationRequest: () => ({
    mutateAsync: createRequestMutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock('../../../hooks/useProcedures', () => ({
  useProcedureGroups: () => ({
    data: [{ id: 'grp-tc', name: 'GRUPO - TOMOGRAFIA - GERAL' }],
  }),
  useProcedures: () => ({
    data: {
      data: [
        {
          id: 'proc-cons-1',
          code: '0301010072',
          name: 'Consulta em Cardiologia',
          procedureGroupId: 'grp-cons',
        },
      ],
    },
    isLoading: false,
  }),
}));

vi.mock('../BookSlotModal', () => ({
  BookSlotModal: () => null,
}));

vi.mock('../RegulationRequestPrintModal', () => ({
  RegulationRequestPrintModal: () => null,
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

describe('CreateRegulationRequest (grupos de exames)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.scrollTo = vi.fn();

    vi.spyOn(axios, 'get').mockImplementation(async (url) => {
      if (String(url).includes('/procedures')) {
        return {
          data: {
            data: [
              {
                id: 'proc-tc-1',
                code: '0206020031',
                name: 'TOMOGRAFIA COMPUTADORIZADA DO TORAX SEM CONTRASTE',
                procedureGroupId: 'grp-tc',
                requiresRegulation: true,
              },
              {
                id: 'proc-tc-2',
                code: '0206010010',
                name: 'TOMOGRAFIA COMPUTADORIZADA DE COLUNA TORACICA',
                procedureGroupId: 'grp-tc',
                requiresRegulation: true,
              },
            ],
          },
        };
      }
      if (String(url).includes('/cid10/search')) {
        return {
          data: [{ code: 'M54.6', description: 'Dor na coluna torácica' }],
        };
      }
      if (String(url).includes('/schedules/available-slots')) {
        return { data: [] };
      }
      return { data: [] };
    });
  });

  it('envia uma única solicitação contendo a lista groupProcedures ao adicionar múltiplas tomografias no grupo', async () => {
    const user = userEvent.setup();

    createRequestMutateAsyncMock.mockResolvedValueOnce({
      id: 'req-group-1',
      protocolNumber: 'SOL-202611-9393',
      type: 'EXAME',
      status: 'PENDENTE_REGULACAO',
      procedureId: 'proc-tc-1',
      procedureGroupId: 'grp-tc',
      patient: { id: 'pat-1', name: 'CARLOS ALBERTO LUCENA PONCIANO' },
      procedureGroup: { id: 'grp-tc', name: 'GRUPO - TOMOGRAFIA - GERAL' },
      procedure: {
        id: 'proc-tc-1',
        code: '0206020031',
        name: 'TOMOGRAFIA COMPUTADORIZADA DO TORAX SEM CONTRASTE',
      },
      groupProcedures: [
        {
          procedureId: 'proc-tc-1',
          code: '0206020031',
          name: 'TOMOGRAFIA COMPUTADORIZADA DO TORAX SEM CONTRASTE',
        },
        {
          procedureId: 'proc-tc-2',
          code: '0206010010',
          name: 'TOMOGRAFIA COMPUTADORIZADA DE COLUNA TORACICA',
        },
      ],
    });

    const patientState = {
      id: 'pat-1',
      name: 'CARLOS ALBERTO LUCENA PONCIANO',
      cpf: '21628734434',
      cns: '707308020952070',
      birthDate: '1975-05-10',
      gender: 'M',
      healthCenter: { id: 'hc-1', name: 'UBS Centro' },
    };

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/regulation/create',
            state: { defaultPatient: patientState },
          },
        ]}
      >
        <Routes>
          <Route path="/regulation/create" element={<CreateRegulationRequest />} />
        </Routes>
      </MemoryRouter>,
    );

    // Etapa 1 -> Etapa 2
    await user.click(screen.getByRole('button', { name: /Avançar para Tipo & Prioridade/i }));

    // Seleciona Exame Diagnóstico e Grupo Tomografia Geral
    await user.click(screen.getByRole('button', { name: /Exame Diagnóstico/i }));

    const groupSelect = await screen.findByRole('combobox', {
      name: /Grupo de Exame Diagnóstico/i,
    });
    await user.selectOptions(groupSelect, 'grp-tc');

    // Aguarda carregar os 2 exames no Catálogo do Grupo e adiciona ambos com 1 clique cada
    const firstExamBtn = await screen.findByRole('button', {
      name: /TOMOGRAFIA COMPUTADORIZADA DO TORAX SEM CONTRASTE/i,
    });
    const secondExamBtn = screen.getByRole('button', {
      name: /TOMOGRAFIA COMPUTADORIZADA DE COLUNA TORACICA/i,
    });

    await user.click(firstExamBtn);
    await user.click(secondExamBtn);

    expect(screen.getByText(/Exames Selecionados \(2\)/i)).toBeInTheDocument();

    // Etapa 2 -> Etapa 3
    await user.click(screen.getByRole('button', { name: /Avançar para Diagnóstico & Anexos/i }));

    const cidInput = screen.getByPlaceholderText(/Buscar CID-10 por código/i);
    await user.type(cidInput, 'M54.6');

    const cidChoice = await screen.findByRole('button', { name: /Dor na coluna torácica/i });
    await user.click(cidChoice);

    const justificationInput = screen.getByPlaceholderText(/Descreva a queixa principal/i);
    await user.type(justificationInput, 'Dor torácica persistente com necessidade de exames.');

    // Etapa 3 -> Etapa 4
    await user.click(screen.getByRole('button', { name: /Avançar para Revisão Final/i }));

    expect(screen.getByText(/Exames Solicitados \(2\):/i)).toBeInTheDocument();

    // Submete solicitação única
    await user.click(screen.getByRole('button', { name: /Protocolar Solicitação na Regulação/i }));

    await waitFor(() => {
      expect(createRequestMutateAsyncMock).toHaveBeenCalledTimes(1);
    });

    const submittedFormData = createRequestMutateAsyncMock.mock.calls[0][0] as FormData;
    expect(submittedFormData.get('type')).toBe('EXAME');
    expect(submittedFormData.get('procedureGroupId')).toBe('grp-tc');
    expect(JSON.parse(String(submittedFormData.get('procedureIds')))).toEqual([
      'proc-tc-1',
      'proc-tc-2',
    ]);
    expect(JSON.parse(String(submittedFormData.get('groupProcedures')))).toEqual([
      {
        procedureId: 'proc-tc-1',
        code: '0206020031',
        name: 'TOMOGRAFIA COMPUTADORIZADA DO TORAX SEM CONTRASTE',
      },
      {
        procedureId: 'proc-tc-2',
        code: '0206010010',
        name: 'TOMOGRAFIA COMPUTADORIZADA DE COLUNA TORACICA',
      },
    ]);

    // Confirma exibição do protocolo único e dos 2 exames no modal de conclusão
    expect(await screen.findByText('#SOL-202611-9393')).toBeInTheDocument();
    expect(screen.getByText(/1\. TOMOGRAFIA COMPUTADORIZADA DO TORAX SEM CONTRASTE/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. TOMOGRAFIA COMPUTADORIZADA DE COLUNA TORACICA/i)).toBeInTheDocument();
  });

  it('permite buscar e selecionar consulta com 1 clique e alternar itens no painel duplo de exames', async () => {
    const user = userEvent.setup();

    const patientState = {
      id: 'pat-1',
      name: 'CARLOS ALBERTO LUCENA PONCIANO',
      cpf: '21628734434',
      cns: '707308020952070',
      birthDate: '1975-05-10',
      gender: 'M',
      healthCenter: { id: 'hc-1', name: 'UBS Centro' },
    };

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/regulation/create',
            state: { defaultPatient: patientState },
          },
        ]}
      >
        <Routes>
          <Route path="/regulation/create" element={<CreateRegulationRequest />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /Avançar para Tipo & Prioridade/i }));

    // Testa lista unificada de Consulta Médica
    const consultaSearch = screen.getByPlaceholderText(/Buscar especialidade ou código SIGTAP/i);
    await user.type(consultaSearch, 'Cardiologia');
    const cardioBtn = await screen.findByRole('button', { name: /Consulta em Cardiologia/i });
    await user.click(cardioBtn);
    expect(screen.getByText('Selecionada:')).toBeInTheDocument();

    // Troca para Exame Diagnóstico e testa filtro + toggle/remoção no painel duplo
    await user.click(screen.getByRole('button', { name: /Exame Diagnóstico/i }));
    const groupSelect = await screen.findByRole('combobox', {
      name: /Grupo de Exame Diagnóstico/i,
    });
    await user.selectOptions(groupSelect, 'grp-tc');

    const examSearch = await screen.findByPlaceholderText(/Filtrar exame por nome ou código SIGTAP/i);
    await user.type(examSearch, 'COLUNA TORACICA');

    const colunaBtn = await screen.findByRole('button', {
      name: /TOMOGRAFIA COMPUTADORIZADA DE COLUNA TORACICA/i,
    });
    expect(
      screen.queryByRole('button', { name: /TOMOGRAFIA COMPUTADORIZADA DO TORAX SEM CONTRASTE/i }),
    ).not.toBeInTheDocument();

    await user.click(colunaBtn);
    expect(screen.getByText(/Exames Selecionados \(1\)/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Remover TOMOGRAFIA COMPUTADORIZADA DE COLUNA TORACICA/i }));
    expect(screen.getByText(/Exames Selecionados \(0\)/i)).toBeInTheDocument();
  });
});

