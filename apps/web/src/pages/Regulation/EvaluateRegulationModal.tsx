import React, { useState } from 'react';
import {
  X,
  Stethoscope,
  CheckCircle2,
  XCircle,
  RotateCcw,
} from 'lucide-react';
import type { RegulationRequest } from '../../services/regulation';
import { useEvaluateRegulationRequest } from '../../hooks/useRegulation';
import { toast } from 'sonner';

interface EvaluateRegulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: RegulationRequest | null;
}

export const EvaluateRegulationModal: React.FC<EvaluateRegulationModalProps> = ({
  isOpen,
  onClose,
  request,
}) => {
  const [decision, setDecision] = useState<'AUTORIZAR' | 'DEVOLVER' | 'NEGAR'>('AUTORIZAR');
  const [justification, setJustification] = useState('');
  const [adjustedPriority, setAdjustedPriority] = useState<'ELETIVO' | 'PRIORITARIO' | 'URGENCIA'>(
    (request?.priority as any) || 'ELETIVO',
  );

  const evaluateMutation = useEvaluateRegulationRequest();

  if (!isOpen || !request) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!justification || justification.trim().length < 5) {
      toast.error('Informe o parecer técnico / justificativa da decisão (mínimo 5 caracteres).');
      return;
    }

    try {
      await evaluateMutation.mutateAsync({
        id: request.id,
        decision,
        justification: justification.trim(),
        adjustedPriority: decision === 'AUTORIZAR' ? adjustedPriority : undefined,
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/10 dark:bg-blue-500/20 rounded-md text-blue-600 dark:text-blue-400">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Avaliação Técnica Regulatória
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Protocolo: {request.protocolNumber} • Solicitante: {request.requestingHealthCenter?.name}
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
          {/* Card Resumo do Paciente e Demanda */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-md space-y-2 text-xs">
            <div className="flex justify-between">
              <div>
                <span className="text-slate-500">Paciente: </span>
                <span className="font-bold text-slate-900 dark:text-white">{request.patient?.name}</span>
                <span className="text-slate-500 ml-2">(CPF: {request.patient?.cpf || 'S/N'})</span>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                {request.type}
              </span>
            </div>

            <div>
              <span className="text-slate-500">Procedimento/Especialidade: </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {request.procedure ? `${request.procedure.code} - ${request.procedure.name}` : request.specialty?.name}
              </span>
            </div>

            <div>
              <span className="text-slate-500">Hipótese (CID-10): </span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">{request.cid10}</span>
            </div>

            <div className="pt-1 text-slate-700 dark:text-slate-300 italic border-t border-slate-200 dark:border-slate-800">
              "{request.clinicalJustification}"
            </div>
          </div>

          {/* Decisão Regulatória */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Decisão do Médico Regulador <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setDecision('AUTORIZAR')}
                className={`p-3 rounded-md border text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                  decision === 'AUTORIZAR'
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                <span className="text-xs font-bold">Autorizar Pedido</span>
                <span className="text-[10px] text-slate-500">Encaminha para fila de agendamento</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('DEVOLVER')}
                className={`p-3 rounded-md border text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                  decision === 'DEVOLVER'
                    ? 'border-orange-500 bg-orange-50/70 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 ring-1 ring-orange-500'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <RotateCcw className="w-5 h-5 text-orange-600" />
                <span className="text-xs font-bold">Devolver para UBS</span>
                <span className="text-[10px] text-slate-500">Solicita correção ou novos exames</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('NEGAR')}
                className={`p-3 rounded-md border text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                  decision === 'NEGAR'
                    ? 'border-red-500 bg-red-50/70 dark:bg-red-900/30 text-red-700 dark:text-red-300 ring-1 ring-red-500'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="text-xs font-bold">Negar / Indeferir</span>
                <span className="text-[10px] text-slate-500">Não atende aos critérios do SUS</span>
              </button>
            </div>
          </div>

          {/* Reclassificação de Prioridade (apenas se Autorizar) */}
          {decision === 'AUTORIZAR' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Reclassificar Prioridade Clínica (Opcional)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'ELETIVO', label: 'Eletivo' },
                  { id: 'PRIORITARIO', label: 'Prioritário' },
                  { id: 'URGENCIA', label: 'Urgência' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setAdjustedPriority(p.id as any)}
                    className={`py-1.5 text-xs font-bold rounded-md border transition cursor-pointer ${
                      adjustedPriority === p.id
                        ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Parecer do Regulador */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Parecer Técnico & Justificativa Obrigatória <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder={
                decision === 'AUTORIZAR'
                  ? 'Ex: Pedido em conformidade com o protocolo clínico municipal. Encaminhado para agendamento especializado.'
                  : decision === 'DEVOLVER'
                  ? 'Ex: Favor anexar exame de ultrassonografia prévio ou detalhar melhor os sintomas para avaliação da urgência.'
                  : 'Ex: Solicitação não atende à diretriz clínica de encaminhamento para a média complexidade.'
              }
              className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={evaluateMutation.isPending}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 rounded-md transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={evaluateMutation.isPending}
              className={`px-4 py-1.5 text-xs font-bold text-white rounded-md transition shadow-md disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer ${
                decision === 'AUTORIZAR'
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                  : decision === 'DEVOLVER'
                  ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/20'
                  : 'bg-red-600 hover:bg-red-700 shadow-red-500/20'
              }`}
            >
              {evaluateMutation.isPending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processando...</span>
                </>
              ) : (
                <span>Confirmar Avaliação</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
