import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  RotateCcw,
  XCircle,
  Stethoscope,
} from 'lucide-react';
import type { RegulationRequest, RegulationRequestPriority } from '../../services/regulation';
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
  const [adjustedPriority, setAdjustedPriority] = useState<RegulationRequestPriority>(
    request?.priority || 'ELETIVO',
  );

  const evaluateMutation = useEvaluateRegulationRequest();

  if (!isOpen || !request) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!justification || justification.trim().length < 5) {
      toast.error('O parecer técnico/justificativa é estritamente obrigatório (mínimo 5 caracteres).');
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
    } catch (err) {
      // Handled in mutation hook
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl text-blue-600 dark:text-blue-400">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Avaliação Técnica Regulatória
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Protocolo: {request.protocolNumber} • Solicitante: {request.requestingHealthCenter?.name}
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
          {/* Card Resumo do Paciente e Demanda */}
          <div className="p-4 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between">
              <div>
                <span className="text-gray-500">Paciente: </span>
                <span className="font-bold text-gray-900 dark:text-white">{request.patient?.name}</span>
                <span className="text-gray-500 ml-2">(CPF: {request.patient?.cpf || 'S/N'})</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                {request.type}
              </span>
            </div>

            <div>
              <span className="text-gray-500">Procedimento/Especialidade: </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {request.procedure ? `${request.procedure.code} - ${request.procedure.name}` : request.specialty?.name}
              </span>
            </div>

            <div>
              <span className="text-gray-500">Hipótese (CID-10): </span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">{request.cid10}</span>
            </div>

            <div className="pt-1 text-gray-700 dark:text-gray-300 italic border-t border-gray-200 dark:border-gray-700">
              "{request.clinicalJustification}"
            </div>
          </div>

          {/* Decisão Regulatória */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Decisão do Médico Regulador <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setDecision('AUTORIZAR')}
                className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${
                  decision === 'AUTORIZAR'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 text-gray-700 dark:text-gray-300'
                }`}
              >
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                <span className="text-xs font-bold">Autorizar Pedido</span>
                <span className="text-[10px] text-gray-500">Encaminha para fila de agendamento</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('DEVOLVER')}
                className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${
                  decision === 'DEVOLVER'
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 ring-2 ring-orange-500'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 text-gray-700 dark:text-gray-300'
                }`}
              >
                <RotateCcw className="w-5 h-5 text-orange-600" />
                <span className="text-xs font-bold">Devolver para UBS</span>
                <span className="text-[10px] text-gray-500">Solicita correção ou novos exames</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('NEGAR')}
                className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${
                  decision === 'NEGAR'
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 ring-2 ring-red-500'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 text-gray-700 dark:text-gray-300'
                }`}
              >
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="text-xs font-bold">Negar / Indeferir</span>
                <span className="text-[10px] text-gray-500">Não atende aos critérios do SUS</span>
              </button>
            </div>
          </div>

          {/* Reclassificação de Prioridade (apenas se Autorizar) */}
          {decision === 'AUTORIZAR' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
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
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      adjustedPriority === p.id
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
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
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Parecer Técnico & Justificativa Obrigatória <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder={
                decision === 'AUTORIZAR'
                  ? 'Ex: Pedido em conformidade com o protocolo clínico municipal. Encaminhado para agendamento especializado.'
                  : decision === 'DEVOLVER'
                  ? 'Ex: Favor anexar exame de ultrassonografia prévio ou detalhar melhor os sintomas para avaliação da urgência.'
                  : 'Ex: Solicitação não atende à diretriz clínica de encaminhamento para a média complexidade.'
              }
              className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={evaluateMutation.isPending}
              className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={evaluateMutation.isPending}
              className={`px-5 py-2 text-xs font-semibold text-white rounded-xl transition shadow-md disabled:opacity-50 flex items-center space-x-2 ${
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
