import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { fetchAuthenticatedFileBlob, resolveStorageFileUrl } from '../utils/storageUrl';

export function useSecureBlobUrl(url: string | null | undefined) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    const resolvedUrl = resolveStorageFileUrl(url);
    if (!resolvedUrl) {
      setBlobUrl(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    if (resolvedUrl.startsWith('data:') || resolvedUrl.startsWith('blob:')) {
      setBlobUrl(resolvedUrl);
      setError(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    let activeObjectUrl: string | null = null;
    setIsLoading(true);
    setError(null);

    fetchAuthenticatedFileBlob(resolvedUrl, token)
      .then((blob) => {
        if (!isMounted) return;
        activeObjectUrl = URL.createObjectURL(blob);
        setBlobUrl(activeObjectUrl);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const normalizedErr = err instanceof Error ? err : new Error('Falha ao carregar arquivo');
        console.error('Failed to load secure blob:', normalizedErr);
        setError(normalizedErr);
        setBlobUrl(null);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
      if (activeObjectUrl) {
        URL.revokeObjectURL(activeObjectUrl);
      }
    };
  }, [url, token]);

  return { blobUrl, isLoading, error };
}
