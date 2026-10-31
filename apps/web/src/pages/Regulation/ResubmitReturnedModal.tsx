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
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-orange-50/50 dark:bg-orange-950/20">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-orange-500/10 dark:bg-orange-500/20 rounded-xl text-orange-600 dark:text-orange-400">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Reenviar Solicitação Devolvida
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Protocolo: {request.protocolNumber} • Paciente: {request.patient?.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Card Parecer de Devolução do Regulador */}
          <div className="p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 rounded-xl space-y-1">
            <div className="flex items-center space-x-2 text-xs font-bold text-orange-800 dark:text-orange-300 uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
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
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Justificativa das Correções Realizadas <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Explique ao regulador quais ajustes ou informações complementares foram providenciados..."
              className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Justificativa Clínica Atualizada */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Justificativa Clínica (Atualizar se necessário)
            </label>
            <textarea
              rows={3}
              value={clinicalJustification}
              onChange={(e) => setClinicalJustification(e.target.value)}
              className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Histórico Clínico Atualizado */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Histórico Clínico e Tratamentos Prévios (Opcional)
            </label>
            <textarea
              rows={2}
              value={clinicalHistory}
              onChange={(e) => setClinicalHistory(e.target.value)}
              className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Novos Anexos */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Anexar Novos Documentos / Laudos Complementares
            </label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 text-center hover:border-orange-500 transition">
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
                className="inline-block px-3 py-1.5 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 rounded-lg text-xs font-semibold cursor-pointer hover:bg-orange-100 transition"
              >
                + Adicionar Arquivos
              </label>
            </div>

            {files.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {files.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700/60 rounded-lg text-xs"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <Paperclip className="w-3.5 h-3.5 text-gray-500" />
                      <span className="font-medium text-gray-800 dark:text-gray-200 truncate">{file.name}</span>
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
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={resubmitMutation.isPending}
              className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={resubmitMutation.isPending}
              className="px-5 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-xl transition shadow-md shadow-orange-500/20 disabled:opacity-50 flex items-center space-x-2"
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
