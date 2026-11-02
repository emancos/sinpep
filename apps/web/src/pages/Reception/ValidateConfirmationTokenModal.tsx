import React, { useState } from 'react';
import {
  X,
  Key,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { useValidateRegulationToken } from '../../hooks/useRegulation';
import type { RegulationRequest } from '../../services/regulation';
import { toast } from 'sonner';

interface ValidateConfirmationTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPatientValidated?: (request: RegulationRequest) => void;
  executingHealthCenterId?: string;
}

export const ValidateConfirmationTokenModal: React.FC<ValidateConfirmationTokenModalProps> = ({
  isOpen,
  onClose,
  onPatientValidated,
  executingHealthCenterId,
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [validatedRequest, setValidatedRequest] = useState<RegulationRequest | null>(null);

  const validateMutation = useValidateRegulationToken();

  if (!isOpen) return null;

  const handleFormatToken = (value: string) => {
    let clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.startsWith('SB')) {
      clean = clean.substring(2);
    }
    let formatted = 'SB';
    if (clean.length > 0) {
      formatted += '-' + clean.substring(0, 4);
    }
    if (clean.length > 4) {
      formatted += '-' + clean.substring(4, 8);
    }
    return formatted;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.length < tokenInput.length) {
      // Deleting
      setTokenInput(val);
      return;
    }
    setTokenInput(handleFormatToken(val));
  };

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();

    const clean = tokenInput.trim().toUpperCase();
    if (!clean || clean.length < 5) {
      toast.error('Informe a chave de confirmação no formato SB-XXXX-YYYY.');
      return;
    }

    try {
      const result = await validateMutation.mutateAsync({
        token: clean,
        executingHealthCenterId,
      });
      setValidatedRequest(result);
      if (onPatientValidated) onPatientValidated(result);
    } catch (err) {
      // Handled in mutation hook
    }
  };

  const handleReset = () => {
    setTokenInput('');
    setValidatedRequest(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-emerald-50/50 dark:bg-emerald-950/20">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Validar Chave de Confirmação (SINPeP)
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Confirmação de agendamentos emitidos pela Regulação Municipal
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

        {/* Content */}
        <div className="p-6 space-y-5">
          {!validatedRequest ? (
            <form onSubmit={handleValidate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Digite a Chave Alfanumérica de Confirmação impressa ou no celular do munícipe:
                </label>

                <div className="relative">
                  <Key className="absolute left-3.5 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={tokenInput}
                    onChange={handleInputChange}
                    placeholder="SB-XXXX-YYYY"
                    maxLength={13}
                    autoFocus
                    className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-lg font-mono font-bold tracking-widest text-gray-900 dark:text-white uppercase focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  Exemplo: <span className="font-mono font-semibold">SB-8K2A-94YT</span>
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={validateMutation.isPending || tokenInput.length < 5}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-md shadow-emerald-500/20 disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {validateMutation.isPending ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Validando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Validar Atendimento</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Card de Sucesso e Confirmação */
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-4 bg-emerald-500 text-white rounded-2xl shadow-lg flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Chave Confirmada com Sucesso!</h4>
                  <p className="text-xs text-emerald-100 font-mono tracking-wider">
                    {validatedRequest.confirmationToken} • Protocolo: {validatedRequest.protocolNumber}
                  </p>
                </div>
              </div>

              {/* Informações do Paciente e Procedimento */}
              <div className="p-4 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl space-y-3 text-xs">
                <div>
                  <span className="text-gray-500 block">Paciente:</span>
                  <span className="font-bold text-gray-900 dark:text-white text-sm">
                    {validatedRequest.patient?.name}
                  </span>
                  <span className="text-gray-500 block text-[11px]">
                    CPF: {validatedRequest.patient?.cpf || 'S/N'} • CNS: {validatedRequest.patient?.cns || 'S/N'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <span className="text-gray-500 block">Procedimento / Especialidade:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {validatedRequest.procedure ? validatedRequest.procedure.name : validatedRequest.specialty?.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Unidade Solicitante:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {validatedRequest.requestingHealthCenter?.name}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <span className="text-gray-500 block">Data Prevista:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {validatedRequest.scheduledDate} às {validatedRequest.scheduledTime || '08:00'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Prioridade:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {validatedRequest.priority}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-medium"
                >
                  Validar outra chave
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-md shadow-emerald-500/20 flex items-center space-x-1.5"
                >
                  <span>Concluir</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
