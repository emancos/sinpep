import React from 'react';
import { X, ExternalLink, Loader2, AlertTriangle, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useSecureBlobUrl } from '../../hooks/useSecureBlobUrl';

interface Props {
  file: { url: string; type: string; name: string };
  onClose: () => void;
}

export const AttachmentViewer: React.FC<Props> = ({ file, onClose }) => {
  const isImage =
    file.type.toLowerCase().includes('image') ||
    /\.(png|jpe?g|webp|gif)$/i.test(file.name);
  const { blobUrl, isLoading, error } = useSecureBlobUrl(file.url);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      
      <div className="absolute top-4 right-4 flex items-center gap-4 z-[70]">
        {blobUrl && (
          <a 
            href={blobUrl} 
            download={file.name}
            className="bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-full transition-colors flex items-center gap-2 cursor-pointer shadow-lg"
          >
            <ExternalLink className="w-5 h-5" />
            <span className="text-sm font-medium hidden sm:inline">Baixar Anexo</span>
          </a>
        )}
        <button onClick={onClose} className="bg-slate-800 hover:bg-red-600 text-white p-3 rounded-full transition-colors cursor-pointer shadow-lg">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="w-full h-full max-w-6xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-md overflow-hidden flex flex-col relative mt-16 sm:mt-0">
        <div className="p-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-center font-medium text-slate-800 dark:text-slate-200 truncate">
          {file.name}
        </div>
        
        <div className="flex-1 overflow-hidden flex items-center justify-center bg-slate-200 dark:bg-black p-4 relative">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 text-white">
              <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
              <p className="text-sm">Carregando anexo de forma segura...</p>
            </div>
          ) : error || !blobUrl ? (
            <div className="flex flex-col items-center justify-center gap-3 text-slate-400 p-8 text-center max-w-md">
              <AlertTriangle className="w-12 h-12 text-amber-500" />
              <h3 className="text-base font-semibold text-white">Não foi possível carregar o anexo</h3>
              <p className="text-xs text-slate-400">
                O arquivo pode não estar mais acessível ou as credenciais de acesso ao Google Drive expiraram no servidor.
              </p>
            </div>
          ) : isImage ? (
            <TransformWrapper
              initialScale={1}
              minScale={1}
              maxScale={8}
              centerOnInit={true}
              limitToBounds={false}
              smooth={true}
              wheel={{
                step: 0.002,
                disabled: false,
              }}
              pinch={{
                step: 2,
                disabled: false,
              }}
              doubleClick={{
                disabled: false,
                mode: 'toggle',
                step: 1.5,
                animationTime: 250,
              }}
              panning={{
                disabled: false,
                allowLeftClickPan: true,
                velocityDisabled: false,
              }}
            >
              {({ zoomIn, zoomOut, resetTransform }) => (
                <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                  {/* Floating Zoom & Pan Controls Toolbar */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/80 shadow-2xl">
                    <button
                      type="button"
                      onClick={() => zoomOut()}
                      className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full transition-all cursor-pointer"
                      title="Diminuir Zoom (-)"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => zoomIn()}
                      className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full transition-all cursor-pointer"
                      title="Aumentar Zoom (+)"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-slate-700 mx-1" />
                    <button
                      type="button"
                      onClick={() => resetTransform()}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-full transition-all cursor-pointer font-medium"
                      title="Ajustar ao centro / Redefinir"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Ajustar</span>
                    </button>
                  </div>

                  <TransformComponent
                    wrapperClass="!w-full !h-full cursor-grab active:cursor-grabbing select-none"
                    contentClass="!w-full !h-full flex items-center justify-center"
                    wrapperStyle={{ width: '100%', height: '100%' }}
                    contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <img 
                      src={blobUrl} 
                      alt={file.name} 
                      className="max-w-full max-h-full object-contain pointer-events-none select-none drop-shadow-md"
                      draggable={false}
                    />
                  </TransformComponent>
                </div>
              )}
            </TransformWrapper>
          ) : (
            <iframe 
              src={blobUrl} 
              className="w-full h-full border-none" 
              title={file.name}
            />
          )}
        </div>
      </div>
    </div>
  );
};
