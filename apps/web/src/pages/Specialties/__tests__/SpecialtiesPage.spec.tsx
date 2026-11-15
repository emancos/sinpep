import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SpecialtiesPage } from '../index';
import type { Specialty } from '../../../hooks/useSpecialties';

const createSpecialtyMutateMock = vi.fn();
const updateSpecialtyMutateMock = vi.fn();
const deleteSpecialtyMutateMock = vi.fn();
const toggleActiveMutateMock = vi.fn();

let mockSpecialties: Specialty[] = [
  {
    id: 'spec-1',
    name: 'GINECOLOGIA E OBSTETRICIA',
    cbo: '225250',
    description: 'Saúde da mulher',
    isActive: true,
  },
];

let authStoreState = {
  permissions: ['procedure-groups:write', 'admin:access'],
  token: 'mock-token',
};

vi.mock('../../../store/useAuthStore', () => ({
  useAuthStore: (selector: (s: typeof authStoreState) => unknown) => selector(authStoreState),
}));

vi.mock('../../../contexts/ConfirmContext', () => ({
  useConfirm: () => vi.fn().mockResolvedValue(true),
}));

vi.mock('../../../hooks/useSpecialties', () => ({
  useSpecialties: () => ({
    data: { data: mockSpecialties, total: mockSpecialties.length },
    isLoading: false,
    isError: false,
  }),
  useCreateSpecialty: () => ({
    mutate: createSpecialtyMutateMock,
    isPending: false,
  }),
  useUpdateSpecialty: () => ({
    mutate: updateSpecialtyMutateMock,
    isPending: false,
  }),
  useDeleteSpecialty: () => ({
    mutate: deleteSpecialtyMutateMock,
    isPending: false,
  }),
  useToggleSpecialtyActive: () => ({
    mutate: toggleActiveMutateMock,
    isPending: false,
  }),
}));

describe('SpecialtiesPage - CBO and Manual Specialty Creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders specialty list including CBO column and values', () => {
    render(<SpecialtiesPage />);

    expect(screen.getByText('Especialidades Médicas')).toBeInTheDocument();
    expect(screen.getAllByText('GINECOLOGIA E OBSTETRICIA')[0]).toBeInTheDocument();
    expect(screen.getByText('225250')).toBeInTheDocument();
  });

  it('opens modal for new specialty with CBO input and submits name and CBO', async () => {
    const user = userEvent.setup();
    render(<SpecialtiesPage />);

    // Click "Nova Especialidade" button
    const newBtn = screen.getByRole('button', { name: /nova especialidade/i });
    await user.click(newBtn);

    // Verify modal title
    expect(screen.getByRole('heading', { name: 'Nova Especialidade' })).toBeInTheDocument();

    // Verify inputs exist
    const nameInput = screen.getByPlaceholderText(/ex: cardiologia, ortopedia/i);
    const cboInput = screen.getByPlaceholderText(/ex: 225120/i);
    expect(nameInput).toBeInTheDocument();
    expect(cboInput).toBeInTheDocument();

    // Type specialty name and CBO code
    await user.type(nameInput, 'CARDIOLOGIA');
    await user.type(cboInput, '225120');

    // Click Salvar
    const saveBtn = screen.getByRole('button', { name: /^salvar$/i });
    await user.click(saveBtn);

    expect(createSpecialtyMutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'CARDIOLOGIA',
        cbo: '225120',
      }),
      expect.any(Object)
    );
  });

  it('opens edit modal and pre-fills existing CBO and submits updated data', async () => {
    const user = userEvent.setup();
    render(<SpecialtiesPage />);

    // Click Edit button (first occurrence)
    const editBtns = screen.getAllByRole('button', { name: /editar/i });
    await user.click(editBtns[0]);

    // Verify modal title and pre-filled inputs
    expect(screen.getByRole('heading', { name: 'Editar Especialidade' })).toBeInTheDocument();
    const cboInput = screen.getByPlaceholderText(/ex: 225120/i);
    expect(cboInput).toHaveValue('225250');

    // Change CBO
    await user.clear(cboInput);
    await user.type(cboInput, '225251');

    // Click Salvar
    const saveBtn = screen.getByRole('button', { name: /^salvar$/i });
    await user.click(saveBtn);

    expect(updateSpecialtyMutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'spec-1',
        cbo: '225251',
      }),
      expect.any(Object)
    );
  });
});
