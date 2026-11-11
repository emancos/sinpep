import { describe, expect, it } from 'vitest';
import {
  getRegulationPriorityLabel,
  getRegulationStatusLabel,
  getRegulationStatusMeta,
  getStatusHistoryEventLabel,
} from '../regulationStatus';

describe('regulationStatus utils', () => {
  it('mapeia status do fluxo de regulação para rótulos amigáveis em português', () => {
    expect(getRegulationStatusLabel('PENDENTE_REGULACAO')).toBe('Pendente na Regulação');
    expect(getRegulationStatusLabel('PENDENTE_AGENDAMENTO')).toBe('Autorizada (Aguardando Agendamento)');
    expect(getRegulationStatusLabel('AGENDADA')).toBe('Agendada');
    expect(getRegulationStatusLabel('DEVOLVIDA')).toBe('Devolvida para Correção');
    expect(getRegulationStatusLabel('NEGADA')).toBe('Indeferida / Negada');
    expect(getRegulationStatusLabel('AGENDAMENTO_CANCELADO')).toBe('Agendamento Cancelado');
    expect(getRegulationStatusLabel('CANCELADA')).toBe('Cancelada pelo Solicitante');
  });

  it('retorna metadados consistentes para exibição de badges e timeline', () => {
    const devMeta = getRegulationStatusMeta('DEVOLVIDA');
    expect(devMeta.label).toBe('Devolvida para Correção');
    expect(devMeta.badgeClass).toContain('bg-orange-100');
    expect(devMeta.dotClass).toContain('bg-orange-500');

    const unknownMeta = getRegulationStatusMeta('STATUS_CUSTOM');
    expect(unknownMeta.label).toBe('STATUS CUSTOM');
    expect(getRegulationStatusLabel(null)).toBe('Em Análise');
  });

  it('gera descrições amigáveis para eventos específicos do histórico de tramitação', () => {
    expect(
      getStatusHistoryEventLabel({
        previousStatus: null,
        newStatus: 'PENDENTE_REGULACAO',
      }),
    ).toBe('Solicitação Registrada (Aguardando Regulação)');

    expect(
      getStatusHistoryEventLabel({
        previousStatus: 'DEVOLVIDA',
        newStatus: 'PENDENTE_REGULACAO',
        justification: 'CID corrigido',
      }),
    ).toBe('Corrigida e Reenviada para Regulação');

    expect(
      getStatusHistoryEventLabel({
        previousStatus: 'AGENDADA',
        newStatus: 'PENDENTE_AGENDAMENTO',
      }),
    ).toBe('Retornada para Fila de Agendamento');

    expect(
      getStatusHistoryEventLabel({
        previousStatus: 'PENDENTE_REGULACAO',
        newStatus: 'PENDENTE_REGULACAO',
        justification: 'ALTERAÇÃO DE PROCEDIMENTO: Consulta A -> Consulta B',
      }),
    ).toBe('Alteração de Procedimento');

    expect(
      getStatusHistoryEventLabel({
        previousStatus: 'PENDENTE_REGULACAO',
        newStatus: 'DEVOLVIDA',
        justification: 'Falta laudo médico',
      }),
    ).toBe('Devolvida para Correção');
  });

  it('traduz prioridades incluindo URGENTE e URGENCIA', () => {
    expect(getRegulationPriorityLabel('URGENTE')).toBe('Urgente');
    expect(getRegulationPriorityLabel('URGENCIA')).toBe('Urgente');
    expect(getRegulationPriorityLabel('PRIORITARIO')).toBe('Prioritário');
    expect(getRegulationPriorityLabel('ELETIVO')).toBe('Eletivo');
    expect(getRegulationPriorityLabel('VERMELHO')).toBe('Vermelho (Urgente)');
  });
});
