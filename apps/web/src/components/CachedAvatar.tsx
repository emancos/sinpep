import React, { useState, useEffect } from 'react';
import { User as UserIcon } from 'lucide-react';
import { getAvatarUrl } from '../utils/avatar';

interface CachedAvatarProps {
  src?: string | null;
  alt?: string;
  className?: string;
  iconClassName?: string;
}

function getValidCachedAvatar(cacheKey: string): string | null {
  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;
    if (cached.startsWith('data:image/')) {
      return cached;
    }
    // Remove entradas antigas corrompidas (ex.: HTML 404 salvo em base64)
    localStorage.removeItem(cacheKey);
  } catch {
    // Ignora falhas de acesso ao localStorage
  }
  return null;
}

export const CachedAvatar: React.FC<CachedAvatarProps> = ({
  src,
  alt = 'Avatar',
  className = 'w-full h-full object-cover',
  iconClassName = 'w-3.5 h-3.5 text-blue-400',
}) => {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  const actualSrc = getAvatarUrl(src);
  const cacheKey = actualSrc ? `avatar-cache-${actualSrc}` : null;

  useEffect(() => {
    setHasError(false);

    if (!actualSrc || !cacheKey) {
      setImgSrc(null);
      return;
    }

    if (actualSrc.startsWith('data:') || actualSrc.startsWith('blob:')) {
      setImgSrc(actualSrc);
      return;
    }

    const cachedData = getValidCachedAvatar(cacheKey);
    if (cachedData) {
      setImgSrc(cachedData);
      return;
    }

    setImgSrc(actualSrc);

    const controller = new AbortController();
    fetch(actualSrc, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Avatar fetch failed with status ${response.status}`);
        }
        return response.blob();
      })
      .then((blob) => {
        if (!blob.type.startsWith('image/')) {
          throw new Error(`Unexpected avatar mime type: ${blob.type}`);
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result;
          if (typeof base64data !== 'string' || !base64data.startsWith('data:image/')) {
            return;
          }
          try {
            localStorage.setItem(cacheKey, base64data);
          } catch {
            // Cota do localStorage excedida não deve impedir exibição
          }
          setImgSrc(base64data);
        };
        reader.readAsDataURL(blob);
      })
      .catch((err: any) => {
        if (err?.name !== 'AbortError') {
          setHasError(true);
        }
      });

    return () => {
      controller.abort();
    };
  }, [actualSrc, cacheKey]);

  if (!imgSrc || hasError) {
    return <UserIcon className={iconClassName} />;
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={() => {
        if (cacheKey) {
          try {
            localStorage.removeItem(cacheKey);
          } catch {
            // noop
          }
        }
        setHasError(true);
      }}
    />
  );
};
