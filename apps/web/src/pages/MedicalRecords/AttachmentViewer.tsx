import React from 'react';
import { X, ExternalLink } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

interface Props {
  file: { url: string; type: string; name: string };
  onClose: () => void;
}

export const AttachmentViewer: React.FC<Props> = ({ file, onClose }) => {
  const isImage = file.type.includes('image');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      
      <div className="absolute top-4 right-4 flex items-center gap-4 z-[70]">
        <a 
          href={file.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-full transition-colors flex items-center gap-2"
        >
          <ExternalLink className="w-5 h-5" />
          <span className="text-sm font-medium hidden sm:inline">Nova Aba / Baixar</span>
        </a>
        <button onClick={onClose} className="bg-slate-800 hover:bg-red-600 text-white p-3 rounded-full transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="w-full h-full max-w-6xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-md overflow-hidden flex flex-col relative mt-16 sm:mt-0">
        <div className="p-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-center font-medium text-slate-800 dark:text-slate-200 truncate">
          {file.name}
        </div>
        
        <div className="flex-1 overflow-hidden flex items-center justify-center bg-slate-200 dark:bg-black">
          {isImage ? (
            <TransformWrapper initialScale={1}>
              <TransformComponent wrapperClass="w-full h-full flex items-center justify-center">
                <img 
                  src={file.url} 
                  alt={file.name} 
                  className="max-w-full max-h-full object-contain pointer-events-none"
                />
              </TransformComponent>
            </TransformWrapper>
          ) : (
            <iframe 
              src={file.url} 
              className="w-full h-full border-none" 
              title={file.name}
            />
          )}
        </div>
      </div>
    </div>
  );
};
