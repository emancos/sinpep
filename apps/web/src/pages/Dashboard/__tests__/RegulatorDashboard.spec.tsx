import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { DashboardSummaryResponse } from '../../../hooks/useDashboard';

const authState = {
  user: {
    id: 'user-reg-1',
    name: 'Marcos Regulador',
    email: 'marcos@saude.gov.br',
    profileName: 'Regulador (Central de Regulação)',
  },
};

vi.mock('../../../store/useAuthStore', () => ({
  useAuthStore: (selector: (s: typeof authState) => unknown) => selector(authState),
}));

import { RegulatorDashboard } from '../components/RegulatorDashboard';

describe('RegulatorDashboard', () => {
  it('renderiza KPIs reais, prioridades amigáveis (Urgente/Prioritário/Eletivo), especialidades e solicitações urgentes', () => {
    const summary: DashboardSummaryResponse = {
      profile: 'Regulador (Central de Regulação)',
      kpis: {
        toEvaluate: 2060,
        waitingList: 4115,
        scheduled: 148,
        returned: 31,
        denied: 9,
        totalActive: 6175,
      },
      charts: {
        riskBreakdown: [
          { risk: 'URGENTE', count: 14 },
          { risk: 'PRIORITARIO', count: 73 },
          { risk: 'ELETIVO', count: 6088 },
        ],
        topWaitingSpecialties: [
          { specialty_name: 'GRUPO - TOMOGRAFIA - GERAL', count: 512 },
          { specialty_name: 'Cardiologia Adulto', count: 320 },
        ],
      },
      recentItems: [
        {
          id: 'req-urg-1',
          protocol: 'SOL-202611-1001',
          risk: 'URGENTE',
          status: 'PENDENTE_REGULACAO',
          created_at: '2026-11-11T10:00:00.000Z',
          patient_name: 'Ana Paula Silva',
          patient_cpf: '12345678900',
          specialty_name: 'GRUPO - TOMOGRAFIA - GERAL',
          requesting_unit: 'UBS Centro',
        },
      ],
    };

    render(
      <MemoryRouter>
        <RegulatorDashboard summary={summary} isLoading={false} />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Olá, Dr\(a\)\. Marcos Regulador/i)).toBeInTheDocument();
    expect(screen.getByText('2060')).toBeInTheDocument();
    expect(screen.getByText('4115')).toBeInTheDocument();
    expect(screen.getByText('31')).toBeInTheDocument();
    expect(screen.getByText('6175')).toBeInTheDocument();

    expect(screen.getAllByText('Prioridade Clínica').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Urgente').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Prioritário')).toBeInTheDocument();
    expect(screen.getByText('Eletivo')).toBeInTheDocument();

    expect(screen.getAllByText('GRUPO - TOMOGRAFIA - GERAL').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Cardiologia Adulto')).toBeInTheDocument();
    expect(screen.getByText('Ana Paula Silva')).toBeInTheDocument();
    expect(screen.getByText('UBS Centro')).toBeInTheDocument();
  });
});
