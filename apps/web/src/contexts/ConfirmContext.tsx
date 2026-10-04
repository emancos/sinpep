import React, { createContext, useContext, useState, useRef } from 'react';
import { AlertTriangle, Info } from 'lucide-react';

interface ConfirmOptions {
 title: string;
 description: string;
 confirmText?: string;
 cancelText?: string;
 variant?: 'danger' | 'info';
}

type ConfirmFunction = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFunction | null>(null);

export const useConfirm = () => {
 const context = useContext(ConfirmContext);
 if (!context) {
 throw new Error('useConfirm deve ser usado dentro de um ConfirmProvider');
 }
 return context;
};

interface ConfirmProviderProps {
 children: React.ReactNode;
}

export const ConfirmProvider: React.FC<ConfirmProviderProps> = ({ children }) => {
 const [isOpen, setIsOpen] = useState(false);
 const [options, setOptions] = useState<ConfirmOptions | null>(null);
 const resolverRef = useRef<((value: boolean) => void) | null>(null);

 const confirm = (opts: ConfirmOptions): Promise<boolean> => {
 setOptions(opts);
 setIsOpen(true);
 return new Promise<boolean>((resolve) => {
 resolverRef.current = resolve;
 });
 };

 const handleConfirm = () => {
 resolverRef.current?.(true);
 setIsOpen(false);
 };

 const handleCancel = () => {
 resolverRef.current?.(false);
 setIsOpen(false);
 };

 return (
 <ConfirmContext.Provider value={confirm}>
 {children}

 {/* Custom Alert Dialog Modal */}
 {isOpen && options && (
 <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
 <div 
 className="bg-slate-900 border border-slate-800 rounded-md max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200"
 role="alertdialog"
 aria-modal="true"
 >
 <div className="flex gap-4">
 <div className={`w-10 h-10 rounded-md shrink-0 flex items-center justify-center ${
 options.variant === 'danger' 
 ? 'bg-rose-500/10 text-rose-500' 
 : 'bg-blue-500/10 text-blue-500'
 }`}>
 {options.variant === 'danger' ? (
 <AlertTriangle className="w-5 h-5" />
 ) : (
 <Info className="w-5 h-5" />
 )}
 </div>
 
 <div className="space-y-1.5 flex-1">
 <h3 className="text-base font-bold text-white leading-tight">
 {options.title}
 </h3>
 <p className="text-sm text-slate-400 font-normal leading-relaxed break-words">
 {options.description}
 </p>
 </div>
 </div>

 <div className="flex justify-end gap-2.5 pt-2">
 <button
 type="button"
 onClick={handleCancel}
 className="px-4 py-2 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-md text-xs font-semibold transition-all cursor-pointer"
 >
 {options.cancelText || 'Cancelar'}
 </button>
 
 <button
 type="button"
 onClick={handleConfirm}
 className={`px-4 py-2 text-xs font-semibold rounded-md text-white transition-all cursor-pointer ${
 options.variant === 'danger'
 ? 'bg-rose-600 hover:bg-rose-500 shadow-md '
 : 'bg-blue-600 hover:bg-blue-500 shadow-md '
 }`}
 >
 {options.confirmText || 'Confirmar'}
 </button>
 </div>
 </div>
 </div>
 )}
 </ConfirmContext.Provider>
 );
};
