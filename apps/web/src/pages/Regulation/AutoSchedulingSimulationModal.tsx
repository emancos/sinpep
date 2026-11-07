import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  Building2,
  Stethoscope,
  Info,
  Loader2,
  Calendar,
} from 'lucide-react';
import {
  useSimulateAutoScheduling,
  useExecuteAutoScheduling,
  type SimulationResponse,
  type SimulationMatch,
} from '../../hooks/useAutoScheduling';
import { formatCPF, formatDateBR } from '../../utils/brazilianFormatters';
import { toast } from 'sonner';

interface AutoSchedulingSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  procedureId?: string;
  procedureGroupId?: string;
  requestingHealthCenterId?: string;
  onSuccess?: () => void;
}

export const AutoSchedulingSimulationModal: React.FC<AutoSchedulingSimulationModalProps> = ({
  isOpen,
  onClose,
  procedureId,
  procedureGroupId,
  requestingHealthCenterId,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'MATCHES' | 'UNMATCHED'>('MATCHES');
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<string>>(new Set());

  const simulateMutation = useSimulateAutoScheduling();
  const executeMutation = useExecuteAutoScheduling();

  // Executa a simulação ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      simulateMutation.mutate(
        {
          procedureId: procedureId || undefined,
          procedureGroupId: procedureGroupId || undefined,
          requestingHealthCenterId: requestingHealthCenterId || undefined,
        },
        {
          onSuccess: (data: SimulationResponse) => {
            // Seleciona todos os matches propostos por padrão
            const allIds = new Set<string>(data.matches.map((m: SimulationMatch) => m.matchId));
            setSelectedMatchIds(allIds);
          },
        },
      );
    }
  }, [isOpen, procedureId, procedureGroupId, requestingHealthCenterId]);

  const simulationData = simulateMutation.data;
  const matches = simulationData?.matches || [];
  const unmatched = simulationData?.unmatched || [];

  const toggleSelectMatch = (matchId: string) => {
    const next = new Set(selectedMatchIds);
    if (next.has(matchId)) {
      next.delete(matchId);
    } else {
      next.add(matchId);
    }
    setSelectedMatchIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedMatchIds.size === matches.length) {
      setSelectedMatchIds(new Set());
    } else {
      setSelectedMatchIds(new Set<string>(matches.map((m: SimulationMatch) => m.matchId)));
    }
  };

  const handleConfirmBatch = async () => {
    if (selectedMatchIds.size === 0) {
      toast.error('Selecione ao menos um paciente para confirmar o agendamento.');
      return;
    }

    const matchesToExecute = matches
      .filter((m) => selectedMatchIds.has(m.matchId))
      .map((m) => ({
        regulationRequestId: m.regulationRequestId,
        scheduleSlotId: m.scheduleSlotId,
        calculatedScore: m.score,
        scoreBreakdownJson: JSON.stringify(m.scoreBreakdown),
      }));

    try {
      await executeMutation.mutateAsync({
        mode: 'EFETIVO_MANUAL',
        matches: matchesToExecute,
        notes: `Agendamento em lote aprovado pelo regulador: ${matchesToExecute.length} vagas.`,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch {
      // toast disparado pelo hook
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-600 to-indigo-700 text-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-xs">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold leading-tight">
                Simulação de Agendamento Automático (Dry-Run)
              </h2>
              <p className="text-xs text-blue-100 mt-0.5">
                Revise os casamentos calculados pelo algoritmo de Score Ponderado antes de efetivar os agendamentos.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loading State */}
        {simulateMutation.isPending ? (
          <div className="p-16 flex flex-col items-center justify-center space-y-3 text-center">
            <Loader2 className="w-9 h-9 text-blue-600 animate-spin" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Executando simulação de agendamento em lote...
            </p>
            <p className="text-xs text-slate-500">
              Avaliando pontuação dos pacientes na fila, cotas municipais e compatibilidade das escalas.
            </p>
          </div>
        ) : simulateMutation.isError ? (
          <div className="p-12 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              Falha ao processar simulação
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {simulateMutation.error?.response?.data?.message ||
                'Não foi possível rodar o algoritmo de agendamento automático.'}
            </p>
            <button
              onClick={() =>
                simulateMutation.mutate({
                  procedureId,
                  procedureGroupId,
                  requestingHealthCenterId,
                })
              }
              className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-700"
            >
              Tentar Novamente
            </button>
          </div>
        ) : (
          <>
            {/* Summary KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 shrink-0 text-xs">
              <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Avaliados na Fila</span>
                <span className="text-lg font-black text-slate-800 dark:text-white">
                  {simulationData?.summary.totalRequestsEvaluated || 0}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Vagas Ofertadas</span>
                <span className="text-lg font-black text-slate-800 dark:text-white">
                  {simulationData?.summary.totalSlotsAvailable || 0}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/30">
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase block">Casamentos Propostos</span>
                <span className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                  {simulationData?.summary.totalMatchesProposed || 0}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Sem Vaga Imediata</span>
                <span className="text-lg font-black text-slate-600 dark:text-slate-400">
                  {simulationData?.summary.totalUnmatched || 0}
                </span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-4 px-6 pt-3 border-b border-slate-200 dark:border-slate-800 shrink-0 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('MATCHES')}
                className={`pb-2.5 flex items-center gap-1.5 transition border-b-2 cursor-pointer ${
                  activeTab === 'MATCHES'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Casamentos Sugeridos ({matches.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('UNMATCHED')}
                className={`pb-2.5 flex items-center gap-1.5 transition border-b-2 cursor-pointer ${
                  activeTab === 'UNMATCHED'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <AlertCircle className="w-4 h-4" />
                <span>Pacientes Sem Vaga ({unmatched.length})</span>
              </button>
            </div>

            {/* Tab Contents (Scrollable) */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3">
              {activeTab === 'MATCHES' ? (
                matches.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Nenhuma vaga compatível encontrada para os pacientes da fila no período selecionado.
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-xs pb-1 text-slate-500">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="select-all-matches"
                          checked={selectedMatchIds.size === matches.length && matches.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <label htmlFor="select-all-matches" className="font-semibold cursor-pointer">
                          Selecionar Todos ({selectedMatchIds.size} de {matches.length} selecionados)
                        </label>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Janela: de {simulationData?.summary.minDateConsidered} até {simulationData?.summary.maxDateConsidered}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {matches.map((item) => {
                        const isChecked = selectedMatchIds.has(item.matchId);
                        const b = item.scoreBreakdown;
                        const dateFormatted = formatDateBR(item.slot.date);

                        return (
                          <div
                            key={item.matchId}
                            onClick={() => toggleSelectMatch(item.matchId)}
                            className={`p-3.5 rounded-lg border text-xs transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                              isChecked
                                ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 shadow-xs'
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-60 hover:opacity-100'
                            }`}
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleSelectMatch(item.matchId)}
                                onClick={(e) => e.stopPropagation()}
                                className="mt-1 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />

                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                                    {item.request.patient?.name}
                                  </span>
                                  <span className="font-mono text-[11px] text-slate-500">
                                    CPF: {formatCPF(item.request.patient?.cpf)}
                                  </span>
                                  {b.age > 0 && (
                                    <span className="text-[11px] text-slate-500">
                                      ({b.age} anos)
                                    </span>
                                  )}
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      item.request.priority === 'URGENCIA'
                                        ? 'bg-red-100 text-red-800'
                                        : item.request.priority === 'PRIORITARIO'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {item.request.priority}
                                  </span>
                                </div>

                                <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                  <span>
                                    <strong>Protocolo:</strong> {item.request.protocolNumber}
                                  </span>
                                  <span>
                                    <strong>Procedimento:</strong>{' '}
                                    {item.request.procedure?.name || item.request.procedureGroup?.name}
                                  </span>
                                  <span>
                                    <strong>Origem:</strong> {item.request.requestingHealthCenter?.name}
                                  </span>
                                </div>

                                {/* Score Breakdown Pills */}
                                <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[10px]">
                                  <span className="px-2 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                                    Score Total: {item.score} pts
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                    {b.waitingDays}d de espera (+{b.waitingPoints} pts)
                                  </span>
                                  {b.elderlyPoints > 0 && (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 font-semibold">
                                      {b.age >= 80 ? 'Superprioridade 80+' : 'Idoso 60+'} (+{b.elderlyPoints} pts)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Vaga Proposta */}
                            <div className="border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-2 md:pt-0 md:pl-4 min-w-[240px] text-xs space-y-1 shrink-0">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                                Vaga Proposta:
                              </span>
                              <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{dateFormatted} às {item.slot.time}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{item.slot.schedule?.executingHealthCenter?.name}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                                <Stethoscope className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">Dr(a). {item.slot.schedule?.doctor?.user?.name || 'Profissional'}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )
              ) : unmatched.length === 0 ? (
                <div className="py-12 text-center text-emerald-600 text-xs font-semibold">
                  Todos os pacientes elegíveis na fila de espera conseguiram uma vaga compatível na simulação!
                </div>
              ) : (
                <div className="space-y-2">
                  {unmatched.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-lg text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {item.patientName || 'Paciente'}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">
                          {item.protocolNumber}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Procedimento: {item.procedureName}
                      </p>
                      <div className="text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1 pt-0.5">
                        <Info className="w-3.5 h-3.5 shrink-0" />
                        <span>{item.reason}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 shrink-0">
              <div className="text-xs text-slate-600 dark:text-slate-400">
                {selectedMatchIds.size > 0 ? (
                  <span>
                    Pronto para agendar <strong>{selectedMatchIds.size}</strong> de {matches.length} paciente(s).
                  </span>
                ) : (
                  <span>Nenhum paciente selecionado.</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={selectedMatchIds.size === 0 || executeMutation.isPending}
                  onClick={handleConfirmBatch}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-98"
                >
                  {executeMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Efetivando Agendamentos...</span>
                    </>
                  ) : (
                    <>
                      <CalendarCheck className="w-4 h-4" />
                      <span>Confirmar {selectedMatchIds.size} Agendamento(s)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
