import React, { useState, useMemo } from 'react';
import {
  X,
  Calendar,
  Clock,
  Building2,
  CheckCircle2,
  Check,
  CalendarCheck,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Printer,
} from 'lucide-react';
import { toast } from 'sonner';
import type { RegulationRequest } from '../../services/regulation';
import { useAvailableSlots, useBookSlot, type ScheduleSlot } from '../../hooks/useSchedules';
import { RegulationRequestPrintModal } from './RegulationRequestPrintModal';

interface BookSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: RegulationRequest | null;
  onSuccess?: () => void;
}

const SLOT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  PRIMEIRA_VEZ: { label: '1ª Vez', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  RETORNO: { label: 'Retorno', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  RESERVA_REGULADOR: {
    label: 'Reserva Regulação',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  },
};

export const BookSlotModal: React.FC<BookSlotModalProps> = ({
  isOpen,
  onClose,
  request,
  onSuccess,
}) => {
  const [selectedCenterFilter, setSelectedCenterFilter] = useState<string>('ALL');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('');
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  const procedureId = request?.procedureId || request?.procedure?.id || undefined;
  const procedureGroupId = request?.procedureGroupId || request?.procedureGroup?.id || undefined;

  const { data: availableSlots = [], isLoading } = useAvailableSlots(procedureId, {
    procedureGroupId,
  });
  const bookSlotMutation = useBookSlot();

  // Extrair unidades únicas disponíveis
  const executingCenters = useMemo(() => {
    const map = new Map<string, string>();
    availableSlots.forEach((s) => {
      if (s.schedule?.executingHealthCenter) {
        map.set(s.schedule.executingHealthCenter.id, s.schedule.executingHealthCenter.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [availableSlots]);

  // Filtragem das vagas
  const filteredSlots = useMemo(() => {
    return availableSlots.filter((slot) => {
      if (selectedCenterFilter !== 'ALL' && slot.schedule?.executingHealthCenter?.id !== selectedCenterFilter) {
        return false;
      }
      if (selectedDateFilter && slot.date !== selectedDateFilter) {
        return false;
      }
      return true;
    });
  }, [availableSlots, selectedCenterFilter, selectedDateFilter]);

  // Agrupamento por Data
  const groupedSlots = useMemo(() => {
    const groups: Record<string, ScheduleSlot[]> = {};
    filteredSlots.forEach((slot) => {
      if (!groups[slot.date]) {
        groups[slot.date] = [];
      }
      groups[slot.date].push(slot);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredSlots]);

  const selectedSlot = useMemo(() => {
    return availableSlots.find((s) => s.id === selectedSlotId);
  }, [availableSlots, selectedSlotId]);

  if (!isOpen || !request) return null;

  const handleConfirmBooking = async () => {
    if (!selectedSlotId) {
      toast.error('Selecione uma vaga disponível para agendar o atendimento.');
      return;
    }

    if (selectedSlot?.isProcedureDisabled) {
      toast.error(
        selectedSlot.disabledReason ||
          'Este agendamento não pode ser realizado pois o procedimento solicitado foi desabilitado na configuração desta escala.',
      );
      return;
    }

    try {
      await bookSlotMutation.mutateAsync({
        slotId: selectedSlotId,
        regulationRequestId: request.id,
      });

      toast.success(
        `Agendamento confirmado com sucesso! Paciente agendado para ${selectedSlot?.date} às ${selectedSlot?.time}.`,
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Falha ao reservar vaga na escala.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-emerald-50/70 dark:bg-emerald-950/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-lg text-emerald-600 dark:text-emerald-400">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Agendar Paciente na Escala
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Selecione uma vaga ofertada para a solicitação #{request.protocolNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Request Context Card */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Paciente:</span>
              <span className="font-bold text-slate-900 dark:text-white truncate block">
                {request.patient?.name}
              </span>
              <span className="text-[11px] text-slate-500">CPF: {request.patient?.cpf || 'Não inf.'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Procedimento:</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400 truncate block">
                {request.procedure ? `${request.procedure.code} - ${request.procedure.name}` : request.specialty?.name}
              </span>
              <span className="text-[11px] text-slate-500">
                {request.procedure?.requiresRegulation ? 'Procedimento Regulado' : 'Acesso Direto'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Origem:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                {request.requestingHealthCenter?.name || 'UBS Solicitante'}
              </span>
              <span className="text-[11px] text-amber-600 font-semibold">{request.priority}</span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-2.5 items-center justify-between text-xs">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedCenterFilter}
              onChange={(e) => setSelectedCenterFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full sm:w-64"
            >
              <option value="ALL">Todas as Unidades Executantes</option>
              {executingCenters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="date"
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs w-full sm:w-auto"
            />
            {selectedDateFilter && (
              <button
                type="button"
                onClick={() => setSelectedDateFilter('')}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline shrink-0"
              >
                Limpar data
              </button>
            )}
          </div>
        </div>

        {/* Slots Content */}
        <div className="p-5 max-h-[50vh] overflow-y-auto space-y-4">
          {isLoading ? (
            <div className="py-12 text-center text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500 mb-2" />
              <p className="text-xs">Buscando vagas disponíveis nas escalas ativas...</p>
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <AlertCircle className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                Nenhuma vaga aberta disponível
              </h4>
              <p className="text-xs max-w-sm mx-auto mt-1 mb-4">
                Não há vagas ativas cadastradas para o procedimento solicitado no momento. Solicite a um Coordenador
                de Unidade ou Administrador a abertura de uma nova escala.
              </p>
              <button
                type="button"
                onClick={() => setShowPrintModal(true)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition inline-flex items-center gap-1.5 cursor-pointer active:scale-98"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Ficha de Solicitação</span>
              </button>
            </div>
          ) : filteredSlots.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <p className="text-xs">Nenhuma vaga encontrada com os filtros selecionados.</p>
            </div>
          ) : (
            groupedSlots.map(([date, slots]) => {
              const formattedDate = new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              });

              return (
                <div key={date} className="space-y-2">
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-1">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 capitalize">
                      {formattedDate}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded">
                      {slots.length} vaga(s)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {slots.map((slot) => {
                      const isSelected = selectedSlotId === slot.id;
                      const isProcedureDisabled = Boolean(slot.isProcedureDisabled);
                      const typeBadge = SLOT_TYPE_LABELS[slot.slotType] || {
                        label: slot.slotType,
                        color: 'bg-slate-100 text-slate-700',
                      };

                      return (
                        <div
                          key={slot.id}
                          onClick={() => {
                            if (isProcedureDisabled) {
                              toast.warning(
                                slot.disabledReason ||
                                  'O procedimento desta requisição foi desabilitado na oferta desta escala.',
                              );
                              return;
                            }
                            setSelectedSlotId(slot.id);
                          }}
                          className={`p-3 rounded-lg border text-xs transition relative flex flex-col justify-between ${
                            isProcedureDisabled
                              ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20 opacity-75 cursor-not-allowed'
                              : isSelected
                              ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500/30 cursor-pointer'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-1.5">
                              <Clock
                                className={`w-4 h-4 ${
                                  isProcedureDisabled
                                    ? 'text-rose-400'
                                    : isSelected
                                    ? 'text-emerald-600'
                                    : 'text-slate-400'
                                }`}
                              />
                              <span
                                className={`font-mono font-bold text-sm ${
                                  isProcedureDisabled
                                    ? 'text-slate-500 dark:text-slate-400 line-through'
                                    : 'text-slate-900 dark:text-white'
                                }`}
                              >
                                {slot.time}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              {isProcedureDisabled ? (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                                  Bloqueado
                                </span>
                              ) : (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${typeBadge.color}`}>
                                  {typeBadge.label}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mt-2 text-[11px] space-y-0.5">
                            <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {slot.schedule?.executingHealthCenter?.name || 'Unidade'}
                            </div>
                            <div className="text-slate-500 truncate">
                              Dr(a). {slot.schedule?.doctor?.user?.name || 'Médico'}
                            </div>
                          </div>

                          {/* Alerta de motivo de bloqueio */}
                          {isProcedureDisabled && (
                            <div className="mt-2 text-[10px] text-rose-700 dark:text-rose-300 font-semibold bg-rose-100/70 dark:bg-rose-950/40 p-1.5 rounded border border-rose-200/80 dark:border-rose-900/50 flex items-start gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                              <span>{slot.disabledReason || 'Procedimento desabilitado nesta escala.'}</span>
                            </div>
                          )}

                          {isSelected && !isProcedureDisabled && (
                            <div className="absolute top-2 right-2">
                              <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Slot Summary & Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-600 dark:text-slate-300 w-full sm:w-auto">
            {selectedSlot ? (
              <span className="font-medium">
                Vaga selecionada:{' '}
                <strong className="text-slate-900 dark:text-white font-mono">
                  {selectedSlot.date} às {selectedSlot.time}
                </strong>{' '}
                no {selectedSlot.schedule?.executingHealthCenter?.name}
              </span>
            ) : (
              <span className="text-slate-400 italic">Nenhuma vaga selecionada ainda</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleConfirmBooking}
              disabled={!selectedSlotId || selectedSlot?.isProcedureDisabled || bookSlotMutation.isPending}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer active:scale-98"
            >
              {bookSlotMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Confirmando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar Agendamento</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Impressão da Ficha de Solicitação */}
      {showPrintModal && (
        <RegulationRequestPrintModal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          request={request}
        />
      )}
    </div>
  );
};
