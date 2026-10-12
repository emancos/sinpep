import React from 'react';
import { useSecureBlobUrl } from '../hooks/useSecureBlobUrl';
import { FileText, Loader2, ImageOff } from 'lucide-react';

interface Props {
  url: string;
  type: string;
  name: string;
}

export const AuthThumbnail: React.FC<Props> = ({ url, type, name }) => {
  const { blobUrl, isLoading, error } = useSecureBlobUrl(url);

  if (type.includes('pdf')) {
    return <FileText className="w-8 h-8 text-rose-500" />;
  }

  if (isLoading) {
    return (
      <div className="w-full h-16 bg-slate-200 dark:bg-slate-700 rounded-t-md flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div className="w-full h-16 bg-slate-200 dark:bg-slate-800 rounded-t-md flex items-center justify-center text-slate-400" title="Não foi possível carregar a miniatura">
        <ImageOff className="w-5 h-5" />
      </div>
    );
  }

  return (
    <div 
      title={name}
      className="w-full h-16 bg-cover bg-center rounded-t-md" 
      style={{ backgroundImage: `url(${blobUrl})` }} 
    />
  );
};
