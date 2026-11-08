import React, { useState } from 'react';
import {
  X,
  Calendar,
  User,
  Loader2,
  Clock,
  Building2,
} from 'lucide-react';
import { useSchedule, type Schedule, type ScheduleSlot } from '../../hooks/useSchedules';
import { formatDateBR } from '../../utils/brazilianFormatters';

interface ScheduleDetailsModalProps {
  schedule: Schedule;
  isOpen: boolean;
  onClose: () => void;
}

export const ScheduleDetailsModal: React.FC<ScheduleDetailsModalProps> = ({
  schedule,
  isOpen,
  onClose,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>('ALL');

  // Busca a agenda completa contendo os slots reais com pacientes e protocolos
  const { data: fullSchedule, isLoading } = useSchedule(schedule.id);

  if (!isOpen) return null;

  const currentSchedule = fullSchedule || schedule;
  const slots = fullSchedule?.slots || [];

  // Datas únicas disponíveis nos slots
  const uniqueDates = Array.from(new Set(slots.map((s) => s.date))).sort();

  const filteredSlots = selectedDate === 'ALL'
    ? slots
    : slots.filter((s) => s.date === selectedDate);

  const getTypeBadge = (type: ScheduleSlot['slotType']) => {
    switch (type) {
      case 'PRIMEIRA_VEZ':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">1ª Vez</span>;
      case 'RETORNO':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">Retorno</span>;
      case 'RESERVA_REGULADOR':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">Reserva Regulador</span>;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: ScheduleSlot['status']) => {
    switch (status) {
      case 'DISPONIVEL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">Disponível</span>;
      case 'AGENDADO':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">Agendado</span>;
      case 'BLOQUEADO':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">Bloqueado</span>;
      case 'CANCELADO':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700">Cancelado</span>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                Vagas & Detalhes da Escala
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {currentSchedule.procedure?.name || currentSchedule.procedureGroup?.name} • {currentSchedule.doctor?.user?.name} ({currentSchedule.executingHealthCenter?.name})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informações rápidas da escala */}
        <div className="px-5 py-2.5 bg-slate-50/80 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-600 dark:text-slate-300 gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 font-medium">
              <Building2 className="w-3.5 h-3.5 text-blue-500" />
              {currentSchedule.executingHealthCenter?.name}
            </span>
            <span className="flex items-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {currentSchedule.startTime} às {currentSchedule.endTime}
            </span>
          </div>
          <div className="flex items-center gap-3 font-semibold">
            <span className="text-emerald-600 dark:text-emerald-400">
              Disponíveis: {slots.filter((s) => s.status === 'DISPONIVEL').length}
            </span>
            <span className="text-blue-600 dark:text-blue-400">
              Agendadas: {slots.filter((s) => s.status === 'AGENDADO').length}
            </span>
            <span className="text-slate-500">
              Total: {slots.length}
            </span>
          </div>
        </div>

        {/* Filter by Date */}
        {!isLoading && uniqueDates.length > 0 && (
          <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
              Filtrar por data:
            </span>
            <button
              type="button"
              onClick={() => setSelectedDate('ALL')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                selectedDate === 'ALL'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              Todas ({slots.length})
            </button>
            {uniqueDates.map((dateStr) => {
              const count = slots.filter((s) => s.date === dateStr).length;
              const isSelected = selectedDate === dateStr;
              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelectedDate(dateStr)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium shrink-0 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {formatDateBR(dateStr)} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Slots Table / Content */}
        <div className="p-5 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Carregando vagas e ocupação da escala...
              </p>
              <p className="text-2xs text-slate-400 mt-1">
                Sincronizando agendamentos em tempo real
              </p>
            </div>
          ) : filteredSlots.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xs font-medium text-slate-400">
                Nenhuma vaga encontrada para o filtro selecionado.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 min-w-[50px]">
                      {slot.time}
                    </span>
                    <span className="text-slate-600 dark:text-slate-300 font-medium min-w-[80px]">
                      {formatDateBR(slot.date)}
                    </span>
                    {getTypeBadge(slot.slotType)}
                    {getStatusBadge(slot.status)}
                  </div>

                  {slot.patient ? (
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium">
                      <User className="w-3.5 h-3.5" />
                      <span>{slot.patient.name}</span>
                      {slot.regulationRequest && (
                        <span className="text-2xs text-slate-400 font-mono">
                          (Protocolo: {slot.regulationRequest.protocolNumber})
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-2xs text-slate-400 italic">Vaga livre</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
