import React, { useState } from 'react';
import { X, Star, User, ListOrdered, ShieldAlert, Check } from 'lucide-react';

interface EnqueuePriorityModalProps {
  patient: any;
  specialty: string;
  onClose: () => void;
  onConfirm: (priority: 'PRIORITARIO' | 'CONVENCIONAL') => void;
  isPending: boolean;
}

export const EnqueuePriorityModal: React.FC<EnqueuePriorityModalProps> = ({
  patient,
  specialty,
  onClose,
  onConfirm,
  isPending,
}) => {
  const [selectedPriority, setSelectedPriority] = useState<'PRIORITARIO' | 'CONVENCIONAL' | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPriority) return;
    onConfirm(selectedPriority);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ListOrdered className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Adicionar à Fila de Espera
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Especialidade: <span className="font-semibold text-slate-700 dark:text-slate-300">{specialty}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Dados do Paciente */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
              Paciente
            </p>
            <h3 className="font-bold text-base text-slate-900 dark:text-white mt-0.5">
              {patient.pacienteNome}
            </h3>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span>CPF: <span className="font-mono">{patient.pacienteNuCpf || 'N/A'}</span></span>
              <span>•</span>
              <span>Horário Marcado: <span className="font-semibold text-slate-700 dark:text-slate-300">{patient.hrMarcacao || 'Sem horário'}</span></span>
            </div>
          </div>

          {/* Seleção de Prioridade Obrigatória */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
              Selecione a Classificação de Atendimento <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              A seleção entre paciente prioritário e convencional é obrigatória para definir a ordem na fila.
            </p>

            <div className="space-y-3">
              {/* Opção Prioritário */}
              <button
                type="button"
                onClick={() => setSelectedPriority('PRIORITARIO')}
                className={`w-full p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 ${
                  selectedPriority === 'PRIORITARIO'
                    ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/30 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700/50 bg-white dark:bg-slate-800/60'
                }`}
              >
                <div
                  className={`w-5 h-5 mt-0.5 rounded-full border flex items-center justify-center shrink-0 ${
                    selectedPriority === 'PRIORITARIO'
                      ? 'border-amber-600 bg-amber-600 text-white'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {selectedPriority === 'PRIORITARIO' && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                      Paciente Prioritário
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border border-amber-300/60">
                      Prioridade Legal
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Idosos (60+ anos), gestantes, lactantes, pessoas com deficiência (PCD), pessoas com TEA/autismo e pessoas com crianças de colo.
                  </p>
                </div>
              </button>

              {/* Opção Convencional */}
              <button
                type="button"
                onClick={() => setSelectedPriority('CONVENCIONAL')}
                className={`w-full p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 ${
                  selectedPriority === 'CONVENCIONAL'
                    ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/30 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700/50 bg-white dark:bg-slate-800/60'
                }`}
              >
                <div
                  className={`w-5 h-5 mt-0.5 rounded-full border flex items-center justify-center shrink-0 ${
                    selectedPriority === 'CONVENCIONAL'
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {selectedPriority === 'CONVENCIONAL' && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      <User className="w-4 h-4 text-blue-600" />
                      Paciente Convencional
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      Ordem Geral
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Atendimento padrão por ordem de agendamento e chegada à unidade.
                  </p>
                </div>
              </button>
            </div>

            {!selectedPriority && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                Selecione uma das opções acima para habilitar a confirmação.
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!selectedPriority || isPending}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Adicionando...</span>
                </>
              ) : (
                <>
                  <ListOrdered className="w-4 h-4" />
                  <span>Confirmar e Adicionar à Fila</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
