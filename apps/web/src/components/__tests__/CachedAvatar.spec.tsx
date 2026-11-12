import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CachedAvatar } from '../CachedAvatar';
import { getAvatarUrl } from '../../utils/avatar';

describe('CachedAvatar', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renderiza ícone fallback quando src está ausente', () => {
    const { container } = render(<CachedAvatar src={null} alt="Usuário" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('limpa cache corrompido (não-imagem) no localStorage e exibe fallback se o servidor retornar 404', async () => {
    const src = '/uploads/avatars/missing.png';
    const fullUrl = getAvatarUrl(src)!;
    const cacheKey = `avatar-cache-${fullUrl}`;
    localStorage.setItem(cacheKey, 'data:text/html;base64,PGh0bWw+PC9odG1sPg==');

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      blob: async () => new Blob(['Not Found'], { type: 'text/html' }),
    } as Response);

    const { container } = render(<CachedAvatar src={src} alt="Maria" />);

    await waitFor(() => {
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
    expect(localStorage.getItem(cacheKey)).toBeNull();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('repassa onError limpando o cache quando imagem válida falha ao decodificar no DOM', async () => {
    const src = 'data:image/png;base64,iVBORw0KGgo=';
    const { container } = render(<CachedAvatar src={src} alt="Maria" />);

    const img = await screen.findByRole('img', { name: 'Maria' });
    expect(img).toHaveAttribute('src', src);

    fireEvent.error(img);

    await waitFor(() => {
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('carrega imagem válida da API e armazena em cache base64 apenas quando response.ok e mime image/*', async () => {
    const src = '/uploads/avatars/avatar-ok.png';
    const fullUrl = getAvatarUrl(src)!;
    const cacheKey = `avatar-cache-${fullUrl}`;

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      blob: async () => new Blob(['png-data'], { type: 'image/png' }),
    } as Response);

    render(<CachedAvatar src={src} alt="João" />);

    const img = await screen.findByRole('img', { name: 'João' });
    expect(img).toBeInTheDocument();

    await waitFor(() => {
      expect(localStorage.getItem(cacheKey)).toMatch(/^data:image\/png;base64,/);
    });
  });
});

