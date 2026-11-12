import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { apiUrl } from '../../services/api';
import { getAvatarUrl } from '../avatar';
import { fetchAuthenticatedFileBlob, resolveStorageFileUrl } from '../storageUrl';

describe('storageUrl and avatar utilities', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('resolve caminhos relativos, /uploads, /api/storage e preserva data:/blob:/externos sem corromper', () => {
    expect(getAvatarUrl(null)).toBeNull();
    expect(getAvatarUrl('')).toBeNull();
    expect(getAvatarUrl('/uploads/avatars/avatar-1.png')).toBe(`${apiUrl}/uploads/avatars/avatar-1.png`);
    expect(getAvatarUrl('uploads/avatars/avatar-1.png')).toBe(`${apiUrl}/uploads/avatars/avatar-1.png`);
    expect(getAvatarUrl('http://localhost:9999/uploads/avatars/avatar-1.png')).toBe(
      `${apiUrl}/uploads/avatars/avatar-1.png`,
    );
    expect(getAvatarUrl('data:image/png;base64,iVBORw0KGgo=')).toBe('data:image/png;base64,iVBORw0KGgo=');
    expect(getAvatarUrl('blob:http://localhost:5173/abc-123')).toBe('blob:http://localhost:5173/abc-123');
    expect(getAvatarUrl('https://cdn.example.com/foto.jpg')).toBe('https://cdn.example.com/foto.jpg');

    expect(resolveStorageFileUrl('/api/storage/file/file-99')).toBe(`${apiUrl}/storage/file/file-99`);
    expect(resolveStorageFileUrl('/storage/file/file-99')).toBe(`${apiUrl}/storage/file/file-99`);
  });

  it('envia Authorization Bearer apenas ao baixar arquivos da própria API', async () => {
    const getSpy = vi.spyOn(axios, 'get').mockResolvedValue({
      data: new Blob(['ok'], { type: 'application/pdf' }),
    } as any);

    await fetchAuthenticatedFileBlob(`${apiUrl}/storage/file/f1`, 'jwt-token-123');
    expect(getSpy).toHaveBeenCalledWith(`${apiUrl}/storage/file/f1`, {
      responseType: 'blob',
      headers: { Authorization: 'Bearer jwt-token-123' },
    });

    getSpy.mockClear();
    await fetchAuthenticatedFileBlob('https://external.example.com/public.pdf', 'jwt-token-123');
    expect(getSpy).toHaveBeenCalledWith('https://external.example.com/public.pdf', {
      responseType: 'blob',
    });
  });
});

