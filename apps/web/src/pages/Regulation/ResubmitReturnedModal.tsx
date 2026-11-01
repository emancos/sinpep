import React, { useState } from 'react';
import {
  X,
  RotateCcw,
  AlertTriangle,
  Paperclip,
  Trash2,
} from 'lucide-react';
import type { RegulationRequest } from '../../services/regulation';
import { useResubmitRegulationRequest } from '../../hooks/useRegulation';
import { toast } from 'sonner';

interface ResubmitReturnedModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: RegulationRequest | null;
}

export const ResubmitReturnedModal: React.FC<ResubmitReturnedModalProps> = ({
  isOpen,
  onClose,
  request,
}) => {
  const [justification, setJustification] = useState('');
  const [clinicalJustification, setClinicalJustification] = useState(request?.clinicalJustification || '');
  const [clinicalHistory, setClinicalHistory] = useState(request?.clinicalHistory || '');
  const [files, setFiles] = useState<File[]>([]);

  const resubmitMutation = useResubmitRegulationRequest();

  if (!isOpen || !request) return null;

  // Encontra o último motivo de devolução no histórico
  const lastReturnHistory = request.statusHistory?.find((h) => h.newStatus === 'DEVOLVIDA');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!justification || justification.trim().length < 5) {
      toast.error('Informe a justificativa das alterações realizadas para a regulação.');
      return;
    }

    const formData = new FormData();
    formData.append('justification', justification.trim());
    formData.append('clinicalJustification', clinicalJustification.trim());
    if (clinicalHistory) formData.append('clinicalHistory', clinicalHistory.trim());

    files.forEach((file) => {
      formData.append('attachments', file);
    });

    try {
      await resubmitMutation.mutateAsync({ id: request.id, formData });
      onClose();
    } catch (err) {
      // Handled in mutation hook
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-orange-50/60 dark:bg-orange-950/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-500/10 dark:bg-orange-500/20 rounded-md text-orange-600 dark:text-orange-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Reenviar Solicitação Devolvida
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Protocolo: {request.protocolNumber} • Paciente: {request.patient?.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Card Parecer de Devolução do Regulador */}
          <div className="p-3.5 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 rounded-md space-y-1">
            <div className="flex items-center space-x-2 text-xs font-bold text-orange-800 dark:text-orange-300 uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
              <span>Motivo da Devolução (Médico Regulador)</span>
            </div>
            <p className="text-xs text-orange-950 dark:text-orange-200 italic pt-1">
              "{lastReturnHistory?.justification || 'Informações clínicas complementares solicitadas pela regulação.'}"
            </p>
            {lastReturnHistory?.actionByUser && (
              <p className="text-[11px] text-orange-700 dark:text-orange-400 pt-1">
                Regulador: {lastReturnHistory.actionByUser.name} • {new Date(lastReturnHistory.createdAt).toLocaleString('pt-BR')}
              </p>
            )}
          </div>

          {/* Justificativa das alterações realizadas */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Justificativa das Correções Realizadas <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Explique ao regulador quais ajustes ou informações complementares foram providenciados..."
              className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          {/* Justificativa Clínica Atualizada */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Justificativa Clínica (Atualizar se necessário)
            </label>
            <textarea
              rows={3}
              value={clinicalJustification}
              onChange={(e) => setClinicalJustification(e.target.value)}
              className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          {/* Histórico Clínico Atualizado */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Histórico Clínico e Tratamentos Prévios (Opcional)
            </label>
            <textarea
              rows={2}
              value={clinicalHistory}
              onChange={(e) => setClinicalHistory(e.target.value)}
              className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          {/* Novos Anexos */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Anexar Novos Documentos / Laudos Complementares
            </label>
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-md p-3 text-center hover:border-orange-500 transition">
              <input
                type="file"
                multiple
                accept=".pdf,image/png,image/jpeg,image/jpg"
                onChange={handleFileChange}
                className="hidden"
                id="resubmit-file-upload"
              />
              <label
                htmlFor="resubmit-file-upload"
                className="inline-block px-3 py-1 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 rounded-md text-xs font-semibold cursor-pointer hover:bg-orange-100 transition"
              >
                + Adicionar Arquivos
              </label>
            </div>

            {files.length > 0 && (
              <div className="space-y-1 mt-2">
                {files.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-md text-xs"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{file.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="p-1 text-red-500 hover:text-red-700 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={resubmitMutation.isPending}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={resubmitMutation.isPending}
              className="px-4 py-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-md transition shadow-md disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
            >
              {resubmitMutation.isPending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Reenviando...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reenviar para Regulação</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
