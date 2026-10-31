import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  Building2,
  CheckCircle2,
  Key,
  Layers,
} from 'lucide-react';
import type { RegulationRequest } from '../../services/regulation';
import { useScheduleRegulationRequest, useRegulationQuotas } from '../../hooks/useRegulation';
import { useHealthCenters } from '../../hooks/useHealthCenters';
import { toast } from 'sonner';

interface ScheduleRegulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: RegulationRequest | null;
}

export const ScheduleRegulationModal: React.FC<ScheduleRegulationModalProps> = ({
  isOpen,
  onClose,
  request,
}) => {
  const [executingHealthCenterId, setExecutingHealthCenterId] = useState('');
  const [targetDate, setTargetDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [targetTime, setTargetTime] = useState('08:00');
  const [selectedQuotaId, setSelectedQuotaId] = useState('');
  const [justification, setJustification] = useState('Agendamento realizado conforme disponibilidade de vagas e prioridade clínica.');

  const scheduleMutation = useScheduleRegulationRequest();
  const { data: healthCentersData } = useHealthCenters({ page: 1, limit: 100 });

  // Busca cotas disponíveis para a unidade executante selecionada
  const { data: quotas } = useRegulationQuotas({
    executingHealthCenterId: executingHealthCenterId || undefined,
    targetDate: targetDate || undefined,
  });

  if (!isOpen || !request) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!executingHealthCenterId) {
      toast.error('Selecione a unidade de saúde executante.');
      return;
    }
    if (!targetDate) {
      toast.error('Informe a data do agendamento.');
      return;
    }
    if (!justification || justification.trim().length < 5) {
      toast.error('Informe a justificativa do agendamento.');
      return;
    }

    try {
      await scheduleMutation.mutateAsync({
        id: request.id,
        payload: {
          executingHealthCenterId,
          targetDate,
          targetTime,
          quotaId: selectedQuotaId || undefined,
          justification: justification.trim(),
        },
      });
      onClose();
    } catch (err) {
      // Handled in mutation hook
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-emerald-50/50 dark:bg-emerald-950/20">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Agendamento de Consulta / Procedimento
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Protocolo: {request.protocolNumber} • Geração de Chave Única de Confirmação
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
          {/* Card Resumo */}
          <div className="p-4 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl space-y-1.5 text-xs">
            <div className="flex justify-between">
              <div>
                <span className="text-gray-500">Paciente: </span>
                <span className="font-bold text-gray-900 dark:text-white">{request.patient?.name}</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                Prioridade: {request.priority}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Procedimento/Especialidade: </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {request.procedure ? `${request.procedure.code} - ${request.procedure.name}` : request.specialty?.name}
              </span>
            </div>
          </div>

          {/* Unidade Executante */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-500" />
              Unidade de Saúde Executante <span className="text-red-500">*</span>
            </label>
            <select
              value={executingHealthCenterId}
              onChange={(e) => setExecutingHealthCenterId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Selecione a Unidade Executante (Hospital, Centro de Especialidades, Clínica)...</option>
              {healthCentersData?.data?.map((hc) => (
                <option key={hc.id} value={hc.id}>
                  {hc.name} {hc.cnes ? `(CNES: ${hc.cnes})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Data e Horário */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-500" />
                Data do Atendimento <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-purple-500" />
                Horário Previsto <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={targetTime}
                onChange={(e) => setTargetTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Vínculo opcional com Cota de Vagas */}
          {quotas && quotas.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-500" />
                Vincular à Cota de Vagas da Agenda (Opcional)
              </label>
              <select
                value={selectedQuotaId}
                onChange={(e) => setSelectedQuotaId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Não vincular a uma cota específica</option>
                {quotas.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.startTime} - {q.procedure?.name || q.specialty?.name} ({q.reservedSlots}/{q.totalSlots} vagas ocupadas)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Justificativa do Agendamento */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Justificativa / Observações do Agendamento <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={2}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Card explicativo sobre a chave */}
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-xs flex items-center space-x-3">
            <Key className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            <div className="text-emerald-900 dark:text-emerald-200">
              <span className="font-bold">Geração Automática de Chave de Confirmação: </span>
              Ao confirmar, o sistema gerará a sequência alfanumérica única (ex: <code className="font-mono font-bold bg-white/70 px-1 rounded">SB-9J2K-78XY</code>) para validação obrigatória na recepção executante.
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={scheduleMutation.isPending}
              className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={scheduleMutation.isPending}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-md shadow-emerald-500/20 disabled:opacity-50 flex items-center space-x-2"
            >
              {scheduleMutation.isPending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Gerando Chave & Agendando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirmar Agendamento</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
