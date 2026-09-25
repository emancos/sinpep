import React, { useState } from 'react';
import { X, FileDown, CheckSquare, Square, Loader2 } from 'lucide-react';
import type { MedicalRecord } from '../../hooks/useMedicalRecords';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { MedicalRecordPDF } from './MedicalRecordPDF';

interface Props {
  patient: any;
  records: MedicalRecord[];
  onClose: () => void;
}

export const ExportRecordModal: React.FC<Props> = ({ patient, records, onClose }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(records.map(r => r.id));

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => setSelectedIds(records.map(r => r.id));
  const deselectAll = () => setSelectedIds([]);

  const selectedRecords = records.filter(r => selectedIds.includes(r.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileDown className="w-5 h-5 text-blue-600" /> Exportar Prontuário em PDF
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Selecione quais atendimentos deseja incluir no relatório PDF.
          </p>

          <div className="flex gap-4 mb-4">
            <button onClick={selectAll} className="text-sm text-blue-600 hover:text-blue-700 font-medium">Selecionar Todos</button>
            <button onClick={deselectAll} className="text-sm text-slate-500 hover:text-slate-700 font-medium">Desmarcar Todos</button>
          </div>

          <div className="space-y-3">
            {records.map(record => {
              const isSelected = selectedIds.includes(record.id);
              return (
                <div 
                  key={record.id} 
                  onClick={() => toggleSelection(record.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors flex items-center gap-3 ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className={`${isSelected ? 'text-blue-600' : 'text-slate-400'}`}>
                    {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {new Date(record.recordDate).toLocaleDateString('pt-BR')} - Dr(a). {record.doctor.name}
                    </div>
                    <div className="text-xs text-slate-500 line-clamp-1">{record.observation}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700">
            Cancelar
          </button>
          
          {selectedRecords.length > 0 ? (
            <PDFDownloadLink
              document={<MedicalRecordPDF patient={patient} records={selectedRecords} />}
              fileName={`Prontuario_${patient.name.replace(/\\s+/g, '_')}.pdf`}
              className="px-6 py-2 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              {/* @ts-ignore */}
              {({ loading }) => loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Gerando Documento...</>
              ) : (
                <><FileDown className="w-5 h-5" /> Baixar PDF ({selectedRecords.length} selecionados)</>
              )}
            </PDFDownloadLink>
          ) : (
            <button disabled className="px-6 py-2 rounded-lg font-medium text-white bg-slate-400 cursor-not-allowed flex items-center gap-2">
              <FileDown className="w-5 h-5" /> Baixar PDF
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
