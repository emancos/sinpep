import axios from 'axios';
import { apiUrl } from '../services/api';

/**
 * Normaliza e resolve URLs de arquivos servidos localmente (/uploads/...) ou via API protegida (/storage/file/...).
 */
export function resolveStorageFileUrl(fileUrl?: string | null): string | null {
  if (!fileUrl) return null;
  const trimmed = fileUrl.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  const normalized = trimmed.startsWith('/api/storage')
    ? trimmed.replace(/^\/api\/storage/, '/storage')
    : trimmed;

  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    try {
      const parsed = new URL(normalized);
      if (parsed.pathname.startsWith('/uploads/') || parsed.pathname.startsWith('/storage/')) {
        return `${apiUrl}${parsed.pathname}${parsed.search}`;
      }
    } catch {
      return normalized;
    }
    return normalized;
  }

  return normalized.startsWith('/') ? `${apiUrl}${normalized}` : `${apiUrl}/${normalized}`;
}

export function isSameApiOriginUrl(resolvedUrl: string): boolean {
  return resolvedUrl.startsWith(apiUrl) || resolvedUrl.startsWith('/');
}

/**
 * Faz download binário de um anexo enviando Bearer token quando o destino pertence à própria API.
 */
export async function fetchAuthenticatedFileBlob(
  resolvedUrl: string,
  token?: string | null,
): Promise<Blob> {
  const shouldSendAuth = Boolean(token && isSameApiOriginUrl(resolvedUrl));
  const response = await axios.get<Blob>(resolvedUrl, {
    responseType: 'blob',
    ...(shouldSendAuth ? { headers: { Authorization: `Bearer ${token}` } } : {}),
  });
  return response.data;
}

/**
 * Abre em nova aba ou baixa um anexo protegido utilizando URL temporária de Blob autenticada.
 */
export async function openAuthenticatedAttachment(
  fileUrl: string | null | undefined,
  token: string | null | undefined,
  fileName?: string,
  mode: 'view' | 'download' = 'view',
): Promise<void> {
  const resolved = resolveStorageFileUrl(fileUrl);
  if (!resolved) {
    throw new Error('URL do anexo inválida');
  }

  if (mode === 'view' && !isSameApiOriginUrl(resolved)) {
    window.open(resolved, '_blank', 'noopener,noreferrer');
    return;
  }

  const blob = await fetchAuthenticatedFileBlob(resolved, token);
  const objectUrl = URL.createObjectURL(blob);

  if (mode === 'view') {
    window.open(objectUrl, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    return;
  }

  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName || 'anexo';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
}

