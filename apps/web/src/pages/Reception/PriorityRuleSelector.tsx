import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowUpDown, Check } from 'lucide-react';
import { toast } from 'sonner';
import { getQueueSettings, updateQueueSettings } from '../../services/reception';
import { useAuthStore } from '../../store/useAuthStore';

interface PriorityRuleSelectorProps {
  className?: string;
}

export const PriorityRuleSelector: React.FC<PriorityRuleSelectorProps> = ({ className = '' }) => {
  const token = useAuthStore(state => state.token);
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['queue-settings'],
    queryFn: () => getQueueSettings(token!),
    enabled: !!token,
  });

  const currentRule = settings?.rule || 'PRIORITY_FIRST';

  const ruleMutation = useMutation({
    mutationFn: (newRule: 'PRIORITY_FIRST' | 'INTERLEAVED') =>
      updateQueueSettings(newRule, token!),
    onSuccess: (_, newRule) => {
      queryClient.invalidateQueries({ queryKey: ['queue-settings'] });
      queryClient.invalidateQueries({ queryKey: ['reception-schedule'] });
      toast.success(
        newRule === 'PRIORITY_FIRST'
          ? 'Ordem configurada: Todas as prioridades primeiro'
          : 'Ordem configurada: Intercalar (1 prioritário / 1 convencional)'
      );
    },
    onError: () => toast.error('Falha ao atualizar regra da fila.'),
  });

  return (
    <div
      className={`flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm ${className}`}
      title="Configuração da ordem de atendimento das prioridades na fila"
    >
      <div className="flex items-center gap-1 px-2 text-slate-500 dark:text-slate-400 text-xs font-semibold">
        <ArrowUpDown className="w-3.5 h-3.5 text-blue-500" />
        <span className="hidden sm:inline">Ordem:</span>
      </div>

      <button
        type="button"
        onClick={() => ruleMutation.mutate('PRIORITY_FIRST')}
        disabled={ruleMutation.isPending}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
          currentRule === 'PRIORITY_FIRST'
            ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-sm'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        {currentRule === 'PRIORITY_FIRST' && <Check className="w-3 h-3 stroke-[3]" />}
        <span>Prioridades 1º</span>
      </button>

      <button
        type="button"
        onClick={() => ruleMutation.mutate('INTERLEAVED')}
        disabled={ruleMutation.isPending}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
          currentRule === 'INTERLEAVED'
            ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-sm'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        {currentRule === 'INTERLEAVED' && <Check className="w-3 h-3 stroke-[3]" />}
        <span>Intercalar (1x1)</span>
      </button>
    </div>
  );
};
