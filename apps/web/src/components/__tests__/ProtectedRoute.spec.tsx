import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { ProtectedRoute } from '../ProtectedRoute';
import { SwitchProfileModal } from '../SwitchProfileModal';
import { useAuthStore } from '../../store/useAuthStore';
import api from '../../services/api';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('../../services/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
  apiUrl: 'http://localhost:3000',
  handleUnauthorizedSession: vi.fn(),
}));

const createValidJwt = (sub = 'user-1') => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  );
  return `${header}.${payload}.signature`;
};

describe('ProtectedRoute & SwitchProfileModal (transição e isolamento de perfis)', () => {
  const solicitanteProfile = {
    id: 'prof-solicitante',
    name: 'Solicitante (UBS)',
    description: 'Solicitações nas UBS',
    isDefault: false,
  };

  const reguladorProfile = {
    id: 'prof-regulador',
    name: 'Regulador (Central de Regulação)',
    description: 'Central de Regulação',
    isDefault: false,
  };

  const adminProfile = {
    id: 'prof-admin',
    name: 'Administrador',
    description: 'Acesso total',
    isDefault: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
    useAuthStore.getState().logout();
  });

  const renderApp = (initialPath: string, showSwitchModal = false) => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/" element={<div>Página Inicial</div>} />
            <Route element={<ProtectedRoute requiredPermission="regulation-solicitor:read" />}>
              <Route
                path="/regulation/solicitor"
                element={
                  <div>
                    <span>Painel do Solicitante</span>
                    {showSwitchModal && <SwitchProfileModal isOpen={true} onClose={vi.fn()} />}
                  </div>
                }
              />
            </Route>
            <Route element={<ProtectedRoute requiredPermission="regulation-operator:read" />}>
              <Route path="/regulation/inbox" element={<div>Central de Regulação</div>} />
            </Route>
            <Route element={<ProtectedRoute requiredPermission="admin:access" />}>
              <Route path="/admin/users" element={<div>Gestão de Utilizadores</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  it('alterna do perfil Solicitante para Regulador recebendo estritamente permissões de regulador e sem erro', async () => {
    const user = userEvent.setup();
    const initialToken = createValidJwt('d7734add-74bf-42c6-86f9-bf55654bcb5c');
    const nextToken = createValidJwt('d7734add-74bf-42c6-86f9-bf55654bcb5c');

    useAuthStore.getState().login(
      initialToken,
      {
        id: 'd7734add-74bf-42c6-86f9-bf55654bcb5c',
        name: 'Admin Teste',
        email: 'admin@sinpep.local',
        profileId: solicitanteProfile.id,
        profileName: 'Administrador',
      },
      ['regulation-solicitor:read'],
      solicitanteProfile,
      [adminProfile, solicitanteProfile, reguladorProfile],
    );

    vi.spyOn(axios, 'get').mockResolvedValue({
      data: {
        id: 'd7734add-74bf-42c6-86f9-bf55654bcb5c',
        name: 'Admin Teste',
        email: 'admin@sinpep.local',
        profileId: solicitanteProfile.id,
        profileName: 'Administrador',
        activeProfile: solicitanteProfile,
        availableProfiles: [adminProfile, solicitanteProfile, reguladorProfile],
        permissions: ['regulation-solicitor:read'],
      },
    });

    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        accessToken: nextToken,
        activeProfile: reguladorProfile,
        availableProfiles: [adminProfile, solicitanteProfile, reguladorProfile],
        permissions: ['regulation-operator:read'], // estritamente regulador, sem admin:access
        user: {
          id: 'd7734add-74bf-42c6-86f9-bf55654bcb5c',
          name: 'Admin Teste',
          email: 'admin@sinpep.local',
          profileName: 'Administrador',
        },
      },
    });

    renderApp('/regulation/solicitor', true);

    await waitFor(() => {
      expect(screen.getByText('Painel do Solicitante')).toBeInTheDocument();
    });

    const regulatorButton = screen.getByRole('button', {
      name: /Regulador \(Central de Regulação\)/i,
    });
    await user.click(regulatorButton);

    await waitFor(() => {
      expect(screen.getByText('Central de Regulação')).toBeInTheDocument();
    });

    expect(toast.success).toHaveBeenCalledWith(
      'Perfil alternado para "Regulador (Central de Regulação)" com sucesso!',
    );
    expect(toast.error).not.toHaveBeenCalled();
    expect(useAuthStore.getState().permissions).toEqual(['regulation-operator:read']);
  });

  it('bloqueia rota administrativa quando o usuário estiver operando sob perfil Regulador mesmo possuindo perfil Administrador vinculado', async () => {
    const token = createValidJwt('d7734add-74bf-42c6-86f9-bf55654bcb5c');

    useAuthStore.getState().login(
      token,
      {
        id: 'd7734add-74bf-42c6-86f9-bf55654bcb5c',
        name: 'Admin Teste',
        email: 'admin@sinpep.local',
        profileName: 'Administrador',
      },
      ['regulation-operator:read'], // operando como regulador
      reguladorProfile,
      [adminProfile, reguladorProfile],
    );

    vi.spyOn(axios, 'get').mockResolvedValue({
      data: {
        id: 'd7734add-74bf-42c6-86f9-bf55654bcb5c',
        name: 'Admin Teste',
        email: 'admin@sinpep.local',
        profileName: 'Administrador',
        activeProfile: reguladorProfile,
        availableProfiles: [adminProfile, reguladorProfile],
        permissions: ['regulation-operator:read'],
      },
    });

    renderApp('/admin/users');

    await waitFor(() => {
      expect(screen.getByText('Página Inicial')).toBeInTheDocument();
    });
    expect(toast.error).toHaveBeenCalledWith(
      'Acesso negado. Você não possui permissão para acessar esta página.',
    );
  });

  it('permite acesso a qualquer rota quando o perfil ativo for Administrador', async () => {
    const token = createValidJwt('d7734add-74bf-42c6-86f9-bf55654bcb5c');

    useAuthStore.getState().login(
      token,
      {
        id: 'd7734add-74bf-42c6-86f9-bf55654bcb5c',
        name: 'Admin Teste',
        email: 'admin@sinpep.local',
        profileName: 'Administrador',
      },
      ['admin:access'],
      adminProfile,
      [adminProfile, reguladorProfile],
    );

    vi.spyOn(axios, 'get').mockResolvedValue({
      data: {
        id: 'd7734add-74bf-42c6-86f9-bf55654bcb5c',
        name: 'Admin Teste',
        email: 'admin@sinpep.local',
        profileName: 'Administrador',
        activeProfile: adminProfile,
        availableProfiles: [adminProfile, reguladorProfile],
        permissions: ['admin:access'],
      },
    });

    renderApp('/admin/users');

    await waitFor(() => {
      expect(screen.getByText('Gestão de Utilizadores')).toBeInTheDocument();
    });
    expect(toast.error).not.toHaveBeenCalled();
  });
});
