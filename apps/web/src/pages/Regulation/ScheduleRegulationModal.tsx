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
  const [targetDate, setTargetDate] = useState('');
  const [targetTime, setTargetTime] = useState('08:00');
  const [selectedQuotaId, setSelectedQuotaId] = useState('');
  const [justification, setJustification] = useState(
    'Agendamento confirmado conforme disponibilidade de vagas e agenda da unidade executante.',
  );

  const scheduleMutation = useScheduleRegulationRequest();
  const { data: healthCentersData } = useHealthCenters({ page: 1, limit: 100 });

  // Cotas disponíveis para a data selecionada
  const { data: quotas } = useRegulationQuotas({
    targetDate: targetDate || undefined,
    executingHealthCenterId: executingHealthCenterId || undefined,
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
    } catch {
      // Handled in mutation hook
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-emerald-50/60 dark:bg-emerald-950/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-md text-emerald-600 dark:text-emerald-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Agendamento de Consulta / Procedimento
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Protocolo: {request.protocolNumber} • Geração de Chave Única de Confirmação
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
          {/* Card Resumo */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-md space-y-1 text-xs">
            <div className="flex justify-between">
              <div>
                <span className="text-slate-500">Paciente: </span>
                <span className="font-bold text-slate-900 dark:text-white">{request.patient?.name}</span>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                Prioridade: {request.priority}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Procedimento/Especialidade: </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {request.procedure ? `${request.procedure.code} - ${request.procedure.name}` : request.specialty?.name}
              </span>
            </div>
          </div>

          {/* Unidade Executante */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-500" />
              Unidade de Saúde Executante <span className="text-red-500">*</span>
            </label>
            <select
              value={executingHealthCenterId}
              onChange={(e) => setExecutingHealthCenterId(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-500" />
                Data do Atendimento <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-purple-500" />
                Horário Previsto <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={targetTime}
                onChange={(e) => setTargetTime(e.target.value)}
                className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Vínculo opcional com Cota de Vagas */}
          {quotas && quotas.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-500" />
                Vincular à Cota de Vagas da Agenda (Opcional)
              </label>
              <select
                value={selectedQuotaId}
                onChange={(e) => setSelectedQuotaId(e.target.value)}
                className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Justificativa / Observações do Agendamento <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={2}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Card explicativo sobre a chave */}
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-md text-xs flex items-center space-x-3">
            <Key className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div className="text-emerald-900 dark:text-emerald-200">
              <span className="font-bold">Geração Automática de Chave de Confirmação: </span>
              Ao confirmar, o sistema gerará a sequência alfanumérica única (ex: <code className="font-mono font-bold bg-white/70 px-1 rounded">SB-9J2K-78XY</code>) para validação obrigatória na recepção executante.
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={scheduleMutation.isPending}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 rounded-md transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={scheduleMutation.isPending}
              className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition shadow-md disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
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
