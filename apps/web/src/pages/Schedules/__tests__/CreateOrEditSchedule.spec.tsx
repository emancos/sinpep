import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateOrEditSchedule } from '../CreateOrEditSchedule';
import * as useSchedulesModule from '../../../hooks/useSchedules';
import { useAuthStore } from '../../../store/useAuthStore';

describe('CreateOrEditSchedule - Quotas in Selects', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    useAuthStore.setState({
      token: 'fake-token',
      isAuthenticated: true,
      user: {
        id: 'user-coord',
        name: 'Coordenador',
        email: 'coord@saude.gov.br',
        healthCenterId: 'center-1',
      } as any,
      activeProfile: {
        id: 'prof-coord',
        name: 'Coordenador de Unidade',
      } as any,
    });
  });

  it('exibe os procedimentos com cotas pactuadas no select e alerta informativo', async () => {
    vi.spyOn(useSchedulesModule, 'useScheduleDependencies').mockReturnValue({
      data: {
        healthCenters: [
          { id: 'center-1', name: 'POLICLÍNICA CENTRAL', cnes: '1234567', label: '1234567 - POLICLÍNICA CENTRAL' },
        ],
        procedureGroups: [
          {
            id: 'group-usg',
            name: 'GRUPO - ULTRASSONOGRAFIA - GERAL',
            label: '[02] GRUPO - ULTRASSONOGRAFIA - GERAL [Cota: 120/mês]',
            hasQuota: true,
            quotaTotal: 120,
            procedures: [
              { id: 'proc-1', code: '0205020097', name: 'ULTRASSONOGRAFIA DE MAMAS', label: '0205020097 - ULTRASSONOGRAFIA DE MAMAS [Cota: 80/mês]' },
            ],
          },
        ],
        procedures: [
          {
            id: 'proc-1',
            code: '0205020097',
            name: 'ULTRASSONOGRAFIA DE MAMAS',
            procedureGroupId: 'group-usg',
            hasQuota: true,
            quotaTotal: 80,
            label: '0205020097 - ULTRASSONOGRAFIA DE MAMAS [Cota: 80/mês]',
          },
        ],
        doctors: [
          { id: 'doc-1', name: 'Dr. Roberto', crm: '1234/PB', label: 'Dr. Roberto (CRM: 1234)' },
        ],
        cbos: [
          { cbo: '225320', specialtyId: 'spec-1', name: 'Médico em radiologia', label: '225320 - Médico em radiologia' },
        ],
      },
      isLoading: false,
    } as any);

    vi.spyOn(useSchedulesModule, 'useSchedule').mockReturnValue({
      data: undefined,
      isLoading: false,
    } as any);

    vi.spyOn(useSchedulesModule, 'useCheckScheduleConflicts').mockReturnValue({
      data: { conflicts: [], susAppointments: [] },
      isLoading: false,
    } as any);

    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CreateOrEditSchedule />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Seleciona tipo EXAME para exibir tanto grupos quanto exames individuais
    const exameBtn = screen.getByRole('button', { name: 'EXAME' });
    await user.click(exameBtn);

    // Deve exibir o indicativo de cotas pactuadas
    expect(
      await screen.findByText(/Exibindo procedimentos com cotas pactuadas nesta unidade executante/i),
    ).toBeInTheDocument();

    // No select de procedimentos, as opções devem conter as tags de cota
    const select = screen.getByRole('combobox', { name: /Procedimento/i });
    expect(select).toBeInTheDocument();

    expect(screen.getByText(/\[02\] GRUPO - ULTRASSONOGRAFIA - GERAL \[Cota: 120\/mês\]/i)).toBeInTheDocument();
    expect(screen.getByText(/0205020097 - ULTRASSONOGRAFIA DE MAMAS \[Cota: 80\/mês\]/i)).toBeInTheDocument();
  });
});
