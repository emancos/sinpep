import React from 'react';
import { X, CalendarOff } from 'lucide-react';
import { toast } from 'sonner';
import { useToggleBlockDate, type Schedule } from '../../hooks/useSchedules';

const DAY_MAP: Record<number, string> = {
  0: 'DOMINGO',
  1: 'SEGUNDA',
  2: 'TERCA',
  3: 'QUARTA',
  4: 'QUINTA',
  5: 'SEXTA',
  6: 'SABADO',
};

const DAY_LABELS: Record<string, string> = {
  DOMINGO: 'Domingo',
  SEGUNDA: 'Segunda-feira',
  TERCA: 'Terça-feira',
  QUARTA: 'Quarta-feira',
  QUINTA: 'Quinta-feira',
  SEXTA: 'Sexta-feira',
  SABADO: 'Sábado',
};

interface BlockDatesModalProps {
  schedule: Schedule;
  isOpen: boolean;
  onClose: () => void;
}

export const BlockDatesModal: React.FC<BlockDatesModalProps> = ({
  schedule,
  isOpen,
  onClose,
}) => {
  const toggleMutation = useToggleBlockDate();

  if (!isOpen) return null;

  // Gera todas as datas de atendimento da vigência
  const dates: { dateStr: string; displayDate: string; dayOfWeek: string; isBlocked: boolean }[] = [];
  const start = new Date(`${schedule.startDate}T00:00:00`);
  const end = new Date(`${schedule.endDate}T00:00:00`);
  const cur = new Date(start);

  const blockedList = schedule.blockedDates || [];

  while (cur <= end) {
    const dayOfWeek = DAY_MAP[cur.getDay()];
    if (schedule.daysOfWeek.includes(dayOfWeek)) {
      const year = cur.getFullYear();
      const month = String(cur.getMonth() + 1).padStart(2, '0');
      const day = String(cur.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const displayDate = `${day}/${month}/${year}`;

      dates.push({
        dateStr,
        displayDate,
        dayOfWeek: DAY_LABELS[dayOfWeek] || dayOfWeek,
        isBlocked: blockedList.includes(dateStr),
      });
    }
    cur.setDate(cur.getDate() + 1);
  }

  const handleToggle = async (dateStr: string, isBlocked: boolean) => {
    try {
      await toggleMutation.mutateAsync({ id: schedule.id, date: dateStr });
      toast.success(
        isBlocked
          ? `Data ${dateStr} liberada para atendimentos!`
          : `Data ${dateStr} suspensa/bloqueada na escala!`,
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao alterar bloqueio da data.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
              <CalendarOff className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                Bloquear Datas Pontuais / Feriados
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Suspenda dias específicos de atendimento (feriados, recessos) sem cancelar a escala inteira.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Schedule Info */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-xs flex flex-wrap gap-x-4 gap-y-1 text-slate-600 dark:text-slate-400">
          <div>
            Médico: <strong className="text-slate-800 dark:text-slate-200">{schedule.doctor?.user?.name}</strong>
          </div>
          <div>
            Procedimento: <strong className="text-slate-800 dark:text-slate-200">{schedule.procedure?.name}</strong>
          </div>
          <div>
            Horário: <strong className="text-slate-800 dark:text-slate-200">{schedule.startTime} às {schedule.endTime}</strong>
          </div>
        </div>

        {/* List of Dates */}
        <div className="p-5 overflow-y-auto flex-1 space-y-2">
          {dates.length === 0 ? (
            <p className="text-xs text-center text-slate-400 py-6">
              Nenhuma data correspondente aos dias da semana nesta vigência.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {dates.map((d) => (
                <div
                  key={d.dateStr}
                  className={`p-3 rounded-lg border flex items-center justify-between transition-all ${
                    d.isBlocked
                      ? 'border-red-200 dark:border-red-900/40 bg-red-50/70 dark:bg-red-950/20 text-red-900 dark:text-red-300'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div>
                    <span className="font-bold text-sm block">{d.displayDate}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      {d.dayOfWeek}
                    </span>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider inline-block mt-0.5 ${
                        d.isBlocked ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {d.isBlocked ? 'Bloqueado / Feriado' : 'Atendimento Ativo'}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={toggleMutation.isPending}
                    onClick={() => handleToggle(d.dateStr, d.isBlocked)}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                      d.isBlocked
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                        : 'bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900'
                    }`}
                  >
                    {d.isBlocked ? 'Liberar' : 'Bloquear'}
                  </button>
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
            className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
