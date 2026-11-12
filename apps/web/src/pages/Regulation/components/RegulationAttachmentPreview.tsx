import React from 'react';
import { Download, ExternalLink, Eye, ImageOff, Loader2, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { useSecureBlobUrl } from '../../../hooks/useSecureBlobUrl';
import { useAuthStore } from '../../../store/useAuthStore';
import type { RegulationAttachment } from '../../../services/regulation';
import { openAuthenticatedAttachment, resolveStorageFileUrl } from '../../../utils/storageUrl';

export function isRegulationAttachmentImage(att: { fileName: string; fileType?: string }): boolean {
  const type = (att.fileType || '').toLowerCase();
  const name = (att.fileName || '').toLowerCase();
  return (
    type.startsWith('image/') ||
    name.endsWith('.png') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.webp') ||
    name.endsWith('.gif')
  );
}

export function isRegulationAttachmentPdf(att: { fileName: string; fileType?: string }): boolean {
  const type = (att.fileType || '').toLowerCase();
  const name = (att.fileName || '').toLowerCase();
  return type.includes('pdf') || name.endsWith('.pdf');
}

interface AuthenticatedImageProps {
  fileUrl: string;
  alt: string;
  className?: string;
}

export const AuthenticatedAttachmentImage: React.FC<AuthenticatedImageProps> = ({
  fileUrl,
  alt,
  className = 'w-full h-full object-cover transition-transform duration-300 group-hover:scale-105',
}) => {
  const resolvedUrl = resolveStorageFileUrl(fileUrl);
  const { blobUrl, isLoading, error } = useSecureBlobUrl(resolvedUrl);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
        <span className="text-[11px]">Carregando imagem...</span>
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 text-slate-400 px-3 text-center">
        <ImageOff className="w-6 h-6 text-amber-500" />
        <span className="text-[11px]">Não foi possível exibir a imagem</span>
      </div>
    );
  }

  return <img src={blobUrl} alt={alt} className={className} />;
};

interface AttachmentRowProps {
  attachment: RegulationAttachment;
  onPreview: (attachment: RegulationAttachment) => void;
}

export const RegulationAttachmentRow: React.FC<AttachmentRowProps> = ({ attachment, onPreview }) => {
  const token = useAuthStore((state) => state.token);

  const handleAction = async (mode: 'view' | 'download') => {
    try {
      await openAuthenticatedAttachment(attachment.fileUrl, token, attachment.fileName, mode);
    } catch {
      toast.error('Não foi possível abrir ou baixar o anexo.');
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-md text-xs hover:border-blue-300 dark:hover:border-blue-700 transition">
      <button
        type="button"
        onClick={() => onPreview(attachment)}
        className="flex items-center space-x-2 min-w-0 flex-1 text-left cursor-pointer group"
        title="Visualizar anexo"
      >
        <Paperclip className="w-4 h-4 text-slate-400 group-hover:text-blue-500 shrink-0" />
        <span className="font-medium text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
          {attachment.fileName}
        </span>
      </button>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onPreview(attachment)}
          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-700 rounded transition cursor-pointer"
          title="Visualizar"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => handleAction('view')}
          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-700 rounded transition cursor-pointer"
          title="Abrir em nova aba"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => handleAction('download')}
          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-white dark:hover:bg-slate-700 rounded transition cursor-pointer"
          title="Baixar arquivo"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

