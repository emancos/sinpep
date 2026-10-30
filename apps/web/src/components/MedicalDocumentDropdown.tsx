import React, { useState, useRef, useEffect } from 'react';
import { FileText, ChevronDown, Printer, Activity, Clock, ClipboardList } from 'lucide-react';

export interface MedicalDocumentDropdownProps {
  onSelectPrescription: () => void;
  onSelectCertificate: () => void;
  onSelectAttendanceDeclaration: () => void;
  onSelectApacReport?: () => void;
  buttonClassName?: string;
  label?: string;
  align?: 'left' | 'right';
}

export const MedicalDocumentDropdown: React.FC<MedicalDocumentDropdownProps> = ({
  onSelectPrescription,
  onSelectCertificate,
  onSelectAttendanceDeclaration,
  onSelectApacReport,
  buttonClassName,
  label = 'Emitir Documentos',
  align = 'right',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={
          buttonClassName ||
          'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded-md transition-all cursor-pointer shadow-xs active:scale-95'
        }
        title="Emitir ou imprimir documentos clínicos"
        aria-expanded={isOpen}
      >
        <FileText className="w-3.5 h-3.5 shrink-0" />
        <span>{label}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute z-30 mt-1.5 w-60 rounded-md bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 py-1 text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-150 ${
            align === 'left' ? 'left-0' : 'right-0'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700/60">
            Documentos Disponíveis
          </div>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onSelectPrescription();
            }}
            className="w-full text-left px-3 py-2 text-xs flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer group"
          >
            <div className="w-6 h-6 rounded flex items-center justify-center bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
              <Printer className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-white leading-tight">Prescrição Médica</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Receita, exames e canhoto</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onSelectCertificate();
            }}
            className="w-full text-left px-3 py-2 text-xs flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer group"
          >
            <div className="w-6 h-6 rounded flex items-center justify-center bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
              <Activity className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-white leading-tight">Atestado Médico</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Afastamento por dias (paciente/acomp.)</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onSelectAttendanceDeclaration();
            }}
            className="w-full text-left px-3 py-2 text-xs flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer group"
          >
            <div className="w-6 h-6 rounded flex items-center justify-center bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-white leading-tight">Declaração de Comparecimento</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Comprovação de presença/horário</div>
            </div>
          </button>

          {onSelectApacReport && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onSelectApacReport();
              }}
              className="w-full text-left px-3 py-2 text-xs flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer group border-t border-slate-100 dark:border-slate-700/60"
            >
              <div className="w-6 h-6 rounded flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                <ClipboardList className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="font-semibold text-slate-900 dark:text-white leading-tight">Laudo APAC</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Solicitação de Procedimento (SUS)</div>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
