import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

export function useSecureBlobUrl(url: string | null) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const token = useAuthStore(state => state.token);

  useEffect(() => {
    if (!url) {
      setBlobUrl(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    
    axios.get(url, {
      responseType: 'blob',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then((response: any) => {
        if (!isMounted) return;
        const objectUrl = URL.createObjectURL(response.data);
        setBlobUrl(objectUrl);
        setIsLoading(false);
      })
      .catch((err: any) => {
        if (!isMounted) return;
        console.error('Failed to load secure blob:', err);
        setError(err);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [url, token]);

  return { blobUrl, isLoading, error };
}
