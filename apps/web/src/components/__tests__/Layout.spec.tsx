import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from '../Layout';
import { useAuthStore } from '../../store/useAuthStore';
import { FontSizeProvider } from '../../contexts/FontSizeContext';

vi.mock('../../hooks/useDoctors', () => ({
  useCurrentDoctor: () => ({ data: null }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (str: string) => str,
  }),
}));

describe('Layout (renderização de menus conforme perfil ativo)', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().logout();
  });

  const renderLayout = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <FontSizeProvider>
          <MemoryRouter initialEntries={['/']}>
            <Layout />
          </MemoryRouter>
        </FontSizeProvider>
      </QueryClientProvider>,
    );

  it('exibe menus administrativos quando o perfil ativo for Administrador', () => {
    useAuthStore.getState().login(
      'token-admin',
      {
        id: 'usr-admin',
        name: 'Administrador Master',
        email: 'admin@sinpep.local',
        profileName: 'Administrador',
      },
      ['admin:access'],
      { id: 'prof-admin', name: 'Administrador', isDefault: true },
      [{ id: 'prof-admin', name: 'Administrador' }],
    );

    renderLayout();

    expect(screen.getAllByText('Administração').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Central de Regulação').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Solicitação').length).toBeGreaterThan(0);
  });

  it('exibe estritamente opções do Regulador e omite opções de Administrador quando alternado para Regulador', () => {
    useAuthStore.getState().login(
      'token-reg',
      {
        id: 'usr-admin',
        name: 'Admin em persona Regulador',
        email: 'admin@sinpep.local',
        profileName: 'Administrador',
      },
      [
        'regulation-operator:read',
        'regulation-operator:evaluate',
        'schedules:read',
        'patients:read',
        'reports:read',
      ],
      { id: 'prof-reg', name: 'Regulador (Central de Regulação)' },
      [
        { id: 'prof-admin', name: 'Administrador' },
        { id: 'prof-reg', name: 'Regulador (Central de Regulação)' },
      ],
    );

    renderLayout();

    // Deve exibir itens do regulador
    expect(screen.getAllByText('Central de Regulação').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pacientes').length).toBeGreaterThan(0);

    // NÃO deve exibir menus restritos de administração ou solicitante
    expect(screen.queryByText('Administração')).not.toBeInTheDocument();
    expect(screen.queryByText('Gestão de Utilizadores')).not.toBeInTheDocument();
    expect(screen.queryByText('Municípios & Identidade')).not.toBeInTheDocument();
    expect(screen.queryByText('Solicitação')).not.toBeInTheDocument();
    expect(screen.queryByText('Agenda & Recepção')).not.toBeInTheDocument();
  });

  it('exibe estritamente opções de Solicitante e omite opções de Administrador e Regulação quando em Solicitante', () => {
    useAuthStore.getState().login(
      'token-sol',
      {
        id: 'usr-admin',
        name: 'Admin em persona Solicitante',
        email: 'admin@sinpep.local',
        profileName: 'Administrador',
      },
      [
        'regulation-solicitor:read',
        'regulation-solicitor:write',
        'patients:read',
      ],
      { id: 'prof-sol', name: 'Solicitante (UBS)' },
      [
        { id: 'prof-admin', name: 'Administrador' },
        { id: 'prof-sol', name: 'Solicitante (UBS)' },
      ],
    );

    renderLayout();

    // Deve exibir itens do solicitante
    expect(screen.getAllByText('Solicitação').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pacientes').length).toBeGreaterThan(0);

    // NÃO deve exibir Administração nem Central de Regulação
    expect(screen.queryByText('Administração')).not.toBeInTheDocument();
    expect(screen.queryByText('Central de Regulação')).not.toBeInTheDocument();
  });
});
