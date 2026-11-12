import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import { apiUrl } from '../../../services/api';
import type { RegulationRequest } from '../../../services/regulation';

const authStoreState = {
  token: 'jwt-test-token',
  user: {
    id: 'user-reg-1',
    name: 'Dr. Marcos',
    email: 'marcos@saude.gov.br',
    profileId: 'prof-reg',
    profileName: 'Regulador (Central de Regulação)',
    healthCenterId: 'hc-1',
    linkedHealthCenterIds: ['hc-1'],
    isMunicipalRegulator: true,
  },
  activeProfile: { id: 'prof-reg', name: 'Regulador (Central de Regulação)' },
  permissions: ['regulation-operator:read'],
};

const requestFixture: RegulationRequest = {
  id: 'req-att-1',
  protocolNumber: 'REG-2026-ATT',
  status: 'PENDENTE_REGULACAO',
  type: 'EXAME',
  priority: 'PRIORITARIO',
  cid10: 'I10',
  clinicalJustification: 'Análise clínica de exame anexo.',
  clinicalHistory: 'Sem alergias.',
  returnEditableFields: [],
  patientId: 'pat-1',
  requestingHealthCenterId: 'hc-1',
  requestingUserId: 'user-sol-1',
  procedureId: 'proc-1',
  procedureGroupId: 'grp-1',
  specialtyId: 'spec-1',
  createdAt: '2026-11-10T10:00:00.000Z',
  updatedAt: '2026-11-10T10:00:00.000Z',
  patient: {
    id: 'pat-1',
    name: 'Maria dos Santos',
    cpf: '111.222.333-44',
    cns: '700000000000002',
    birthDate: '1980-04-12',
    gender: 'FEMININO',
  },
  requestingHealthCenter: { id: 'hc-1', name: 'UBS Centro', cnes: '1234567' },
  requestingUser: { id: 'user-sol-1', name: 'Ana UBS', email: 'ana@ubs.gov.br' },
  procedure: { id: 'proc-1', code: '0204030153', name: 'Radiografia de Tórax' },
  attachments: [
    {
      id: 'att-img-1',
      fileName: 'raio-x.png',
      fileUrl: '/storage/file/drive-img-1',
      fileType: 'image/png',
      fileSize: 2048,
      createdAt: '2026-11-10T10:00:00.000Z',
    },
    {
      id: 'att-pdf-1',
      fileName: 'laudo-ecg.pdf',
      fileUrl: '/storage/file/drive-pdf-1',
      fileType: 'application/pdf',
      fileSize: 4096,
      createdAt: '2026-11-10T10:00:00.000Z',
    },
  ],
  statusHistory: [],
};

vi.mock('../../../store/useAuthStore', () => ({
  useAuthStore: (selector: (s: typeof authStoreState) => unknown) => selector(authStoreState),
}));

vi.mock('../../../hooks/useRegulation', () => ({
  useRegulationRequest: () => ({
    data: requestFixture,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useResubmitRegulationRequest: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('../../../hooks/useSchedules', () => ({
  useAvailableSlots: () => ({ data: [], isLoading: false }),
}));

vi.mock('../../../hooks/useProcedures', () => ({
  useProcedureGroups: () => ({ data: [] }),
  useProcedures: () => ({ data: { data: [] } }),
}));

vi.mock('../BookSlotModal', () => ({
  BookSlotModal: () => null,
}));

vi.mock('../RegulationRequestPrintModal', () => ({
  RegulationRequestPrintModal: () => null,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

import { RequestDetailsPage } from '../RequestDetailsPage';
import { RequestDetailsModal } from '../RequestDetailsModal';

describe('Visualização Autenticada de Anexos da Solicitação', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:http://localhost/mock-blob');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  it('RequestDetailsPage carrega prévia da imagem com Bearer token, amplia no AttachmentViewer e abre PDF autenticado', async () => {
    const user = userEvent.setup();
    const axiosGetSpy = vi.spyOn(axios, 'get').mockResolvedValue({
      data: new Blob(['fake-bytes'], { type: 'image/png' }),
    } as any);

    render(
      <MemoryRouter initialEntries={['/regulation/requests/req-att-1']}>
        <Routes>
          <Route path="/regulation/requests/:id" element={<RequestDetailsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const img = await screen.findByRole('img', { name: 'raio-x.png' });
    expect(img).toHaveAttribute('src', 'blob:http://localhost/mock-blob');
    expect(axiosGetSpy).toHaveBeenCalledWith(`${apiUrl}/storage/file/drive-img-1`, {
      responseType: 'blob',
      headers: { Authorization: 'Bearer jwt-test-token' },
    });

    // Ampliar imagem abre o AttachmentViewer autenticado
    await user.click(screen.getByRole('button', { name: /Ampliar/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Redefinir|Ajustar/i })).toBeInTheDocument();
    });

    // Fecha visualizador
    await user.click(screen.getAllByRole('button').find((b) => b.querySelector('.lucide-x'))!);

    // Abrir PDF em nova aba busca blob com Bearer token e abre object URL
    const newTabButtons = screen.getAllByTitle('Visualizar em nova aba');
    await user.click(newTabButtons[1]);

    await waitFor(() => {
      expect(axiosGetSpy).toHaveBeenCalledWith(`${apiUrl}/storage/file/drive-pdf-1`, {
        responseType: 'blob',
        headers: { Authorization: 'Bearer jwt-test-token' },
      });
      expect(window.open).toHaveBeenCalledWith('blob:http://localhost/mock-blob', '_blank', 'noopener,noreferrer');
    });
  });

  it('RequestDetailsModal abre anexo via visualizador autenticado sem link direto sem token', async () => {
    const user = userEvent.setup();
    const axiosGetSpy = vi.spyOn(axios, 'get').mockResolvedValue({
      data: new Blob(['pdf-bytes'], { type: 'application/pdf' }),
    } as any);

    render(
      <MemoryRouter>
        <RequestDetailsModal isOpen={true} onClose={vi.fn()} request={requestFixture} />
      </MemoryRouter>,
    );

    expect(screen.getByText('laudo-ecg.pdf')).toBeInTheDocument();

    const previewButtons = screen.getAllByTitle('Visualizar');
    await user.click(previewButtons[1]);

    await waitFor(() => {
      expect(axiosGetSpy).toHaveBeenCalledWith(`${apiUrl}/storage/file/drive-pdf-1`, {
        responseType: 'blob',
        headers: { Authorization: 'Bearer jwt-test-token' },
      });
      expect(screen.getByTitle('laudo-ecg.pdf')).toBeInTheDocument();
    });
  });
});

