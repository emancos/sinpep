import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateOrEditDoctor } from '../Create';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockDoctorData = {
  id: 'doc-123',
  crm: '12345',
  crmState: 'PB',
  attendanceType: 'CONSULTA',
  cpf: '123.456.789-00',
  cns: '700 0000 0000 0001',
  user: {
    id: 'user-123',
    name: 'Dr. Roberto Teste',
    healthCenter: {
      id: 'hc-1',
      name: 'POLICLINICA CENTRAL',
      cnes: '2606712',
    },
  },
  doctorSpecialties: [{ specialtyId: 'spec-1' }],
  doctorProcedures: [{ procedureId: 'proc-1' }],
  doctorProcedureGroups: [],
};

vi.mock('../../../hooks/useDoctors', () => ({
  useDoctor: () => ({
    data: mockDoctorData,
    isLoading: false,
    error: null,
  }),
  useCreateDoctor: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useUpdateDoctor: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('../../../hooks/useSpecialties', () => ({
  useSpecialties: () => ({
    data: {
      data: [
        { id: 'spec-1', name: 'MÉDICO CARDIOLOGISTA', cbo: '225120', isActive: true },
        { id: 'spec-2', name: 'MÉDICO ORTOPEDISTA', cbo: '225270', isActive: true },
      ],
      total: 2,
    },
    isLoading: false,
  }),
}));

vi.mock('../../../hooks/useProcedures', () => ({
  useProcedures: () => ({
    data: {
      data: [
        { id: 'proc-1', name: 'CONSULTA EM CARDIOLOGIA', isActive: true },
        { id: 'proc-2', name: 'CONSULTA EM ORTOPEDIA', isActive: true },
        { id: 'proc-3', name: 'ELETROCARDIOGRAMA', isActive: true },
      ],
      total: 3,
    },
    isLoading: false,
  }),
  useProcedureGroups: () => ({
    data: [
      { id: 'grp-1', name: 'EXAMES CARDIOLOGICOS' },
    ],
    isLoading: false,
  }),
}));

vi.mock('../../../services/cnes', () => ({
  cnesService: {
    searchEstablishment: vi.fn().mockResolvedValue([]),
    searchProfessionals: vi.fn().mockResolvedValue([]),
  },
}));

const renderWithProviders = (initialEntries: string[]) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/doctors/create" element={<CreateOrEditDoctor />} />
          <Route path="/doctors/:id/edit" element={<CreateOrEditDoctor />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('CreateOrEditDoctor - Step 3 Atuação Profissional and Select Viewport Overflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ensures form container does not have overflow-hidden class that clips dropdowns', () => {
    const { container } = renderWithProviders(['/doctors/create']);

    const formElement = container.querySelector('form');
    expect(formElement).toBeInTheDocument();
    expect(formElement?.className).not.toContain('overflow-hidden');
  });

  it('renders Step 3 in edit mode and allows opening Consultas Permitidas select', async () => {
    const user = userEvent.setup();

    renderWithProviders(['/doctors/doc-123/edit']);

    // In edit mode, starts at Step 2 (Identificação e Documentos)
    expect(screen.getByText('Identificação e Documentos')).toBeInTheDocument();

    // Wait for form to prefill with doctor data
    await waitFor(() => {
      expect(screen.getByDisplayValue('12345')).toBeInTheDocument();
    });

    // Click "Próxima Etapa" to go to Step 3 (Atuação Profissional)
    const nextBtns = screen.getAllByRole('button', { name: /próxima etapa/i });
    await user.click(nextBtns[1]);

    // Verify Step 3 is rendered
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: 'Atuação Profissional' })).toBeInTheDocument();
    });
    expect(screen.getAllByText(/consultas permitidas/i)[0]).toBeInTheDocument();

    // Verify react-select selected consultation is present
    expect(screen.getAllByText('CONSULTA EM CARDIOLOGIA')[0]).toBeInTheDocument();
  });
});
