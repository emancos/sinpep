export interface RegulationStatusMeta {
  label: string;
  historyLabel: string;
  badgeClass: string;
  dotClass: string;
}

const DEFAULT_STATUS_META: RegulationStatusMeta = {
  label: 'Em Análise',
  historyLabel: 'Atualização de Status',
  badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  dotClass: 'bg-slate-400',
};

export const REGULATION_STATUS_META: Record<string, RegulationStatusMeta> = {
  PENDENTE_REGULACAO: {
    label: 'Pendente na Regulação',
    historyLabel: 'Enviada para Regulação',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    dotClass: 'bg-amber-500',
  },
  PENDENTE_AGENDAMENTO: {
    label: 'Autorizada (Aguardando Agendamento)',
    historyLabel: 'Autorizada (Aguardando Agendamento)',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    dotClass: 'bg-blue-500',
  },
  AGENDADA: {
    label: 'Agendada',
    historyLabel: 'Agendada',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    dotClass: 'bg-emerald-500',
  },
  DEVOLVIDA: {
    label: 'Devolvida para Correção',
    historyLabel: 'Devolvida para Correção',
    badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    dotClass: 'bg-orange-500',
  },
  NEGADA: {
    label: 'Indeferida / Negada',
    historyLabel: 'Indeferida / Negada',
    badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    dotClass: 'bg-red-500',
  },
  AGENDAMENTO_CANCELADO: {
    label: 'Agendamento Cancelado',
    historyLabel: 'Agendamento Cancelado',
    badgeClass: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
    dotClass: 'bg-slate-500',
  },
  CANCELADA: {
    label: 'Cancelada pelo Solicitante',
    historyLabel: 'Cancelada pelo Solicitante',
    badgeClass: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    dotClass: 'bg-slate-500',
  },
};

const PRIORITY_LABEL_MAP: Record<string, string> = {
  URGENTE: 'Urgente',
  URGENCIA: 'Urgente',
  VERMELHO: 'Vermelho (Urgente)',
  PRIORITARIO: 'Prioritário',
  AMARELO: 'Amarelo (Prioritário)',
  ELETIVO: 'Eletivo',
  VERDE: 'Verde (Eletivo)',
  AZUL: 'Azul (Não Urgente)',
};

/**
 * Retorna os metadados visuais e textuais amigáveis de um status de regulação.
 */
export function getRegulationStatusMeta(status?: string | null): RegulationStatusMeta {
  if (!status) return DEFAULT_STATUS_META;
  const key = status.trim().toUpperCase();
  return REGULATION_STATUS_META[key] || {
    ...DEFAULT_STATUS_META,
    label: status.replace(/_/g, ' '),
    historyLabel: status.replace(/_/g, ' '),
  };
}

/**
 * Retorna o rótulo legível para um status da solicitação.
 */
export function getRegulationStatusLabel(status?: string | null): string {
  return getRegulationStatusMeta(status).label;
}

/**
 * Retorna um título descritivo e amigável para eventos do histórico de status da solicitação.
 */
export function getStatusHistoryEventLabel(hist: {
  previousStatus?: string | null;
  newStatus: string;
  justification?: string | null;
}): string {
  if (hist.justification?.startsWith('ALTERAÇÃO DE PROCEDIMENTO:')) {
    return 'Alteração de Procedimento';
  }
  if (!hist.previousStatus && hist.newStatus === 'PENDENTE_REGULACAO') {
    return 'Solicitação Registrada (Aguardando Regulação)';
  }
  if (hist.previousStatus === 'DEVOLVIDA' && hist.newStatus === 'PENDENTE_REGULACAO') {
    return 'Corrigida e Reenviada para Regulação';
  }
  if (hist.previousStatus === 'AGENDADA' && hist.newStatus === 'PENDENTE_AGENDAMENTO') {
    return 'Retornada para Fila de Agendamento';
  }
  return getRegulationStatusMeta(hist.newStatus).historyLabel;
}

/**
 * Retorna o rótulo legível em português para prioridade ou risco clínico.
 */
export function getRegulationPriorityLabel(priority?: string | null): string {
  if (!priority) return 'Eletivo';
  const key = priority.trim().toUpperCase();
  return PRIORITY_LABEL_MAP[key] || priority;
}

