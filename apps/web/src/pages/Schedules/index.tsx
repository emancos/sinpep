import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Plus,
  Search,
  Building2,
  Clock,
  CheckCircle2,
  Power,
  Trash2,
  Edit,
  Eye,
  CalendarDays,
  Layers,
  Ban,
  RefreshCw,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useSchedules,
  useToggleScheduleActive,
  useDeleteSchedule,
  type Schedule,
} from '../../hooks/useSchedules';
import { useAuthStore } from '../../store/useAuthStore';
import { useConfirm } from '../../contexts/ConfirmContext';
import { ScheduleDetailsModal } from './ScheduleDetailsModal';
import { BlockDatesModal } from './BlockDatesModal';

const DAY_LABELS: Record<string, string> = {
  DOMINGO: 'Dom',
  SEGUNDA: 'Seg',
  TERCA: 'Ter',
  QUARTA: 'Qua',
  QUINTA: 'Qui',
  SEXTA: 'Sex',
  SABADO: 'Sáb',
};

export const SchedulesPage: React.FC = () => {
  const navigate = useNavigate();
  const permissions = useAuthStore((state) => state.permissions);
  const activeProfile = useAuthStore((state) => state.activeProfile);
  const confirm = useConfirm();

  const canWrite =
    permissions.includes('schedules:write') ||
    permissions.includes('admin:access') ||
    activeProfile?.name === 'Coordenador de Unidade';

  const canDelete =
    permissions.includes('schedules:delete') ||
    permissions.includes('admin:access');

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modals
  const [detailsSchedule, setDetailsSchedule] = useState<Schedule | null>(null);
  const [blockDatesSchedule, setBlockDatesSchedule] = useState<Schedule | null>(null);

  // Queries & Mutations
  const { data: schedules = [], isLoading, refetch } = useSchedules();
  const toggleActiveMutation = useToggleScheduleActive();
  const deleteMutation = useDeleteSchedule();

  // Filtered list
  const filteredSchedules = useMemo(() => {
    return schedules.filter((sch) => {
      if (statusFilter === 'ACTIVE' && !sch.isActive) return false;
      if (statusFilter === 'INACTIVE' && sch.isActive) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const centerName = sch.executingHealthCenter?.name?.toLowerCase() || '';
        const procName = sch.procedure?.name?.toLowerCase() || '';
        const procCode = sch.procedure?.code?.toLowerCase() || '';
        const docName = sch.doctor?.user?.name?.toLowerCase() || '';
        const cbo = sch.cbo?.toLowerCase() || '';

        return (
          centerName.includes(term) ||
          procName.includes(term) ||
          procCode.includes(term) ||
          docName.includes(term) ||
          cbo.includes(term)
        );
      }

      return true;
    });
  }, [schedules, statusFilter, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const total = schedules.length;
    const active = schedules.filter((s) => s.isActive).length;
    const totalSlots = schedules.reduce((acc, s) => acc + (s.totalSlots || 0), 0);
    const bookedSlots = schedules.reduce((acc, s) => acc + (s.bookedSlots || 0), 0);
    const availableSlots = schedules.reduce((acc, s) => acc + (s.availableSlots || 0), 0);

    return { total, active, totalSlots, bookedSlots, availableSlots };
  }, [schedules]);

  const handleToggleActive = async (sch: Schedule) => {
    try {
      await toggleActiveMutation.mutateAsync(sch.id);
      toast.success(
        sch.isActive
          ? 'Agenda desativada com sucesso. Novas vagas estão ocultas.'
          : 'Agenda ativada com sucesso. Vagas disponíveis para agendamento.',
      );
    } catch {
      toast.error('Erro ao alternar status da agenda.');
    }
  };

  const handleDelete = async (sch: Schedule) => {
    const hasBooked = (sch.bookedSlots || 0) > 0;
    const confirmationText = hasBooked
      ? `Atenção: Esta escala possui ${sch.bookedSlots} paciente(s) agendado(s)! Ao excluí-la, todos os agendamentos serão cancelados e as solicitações retornarão ao status PENDENTE NA REGULAÇÃO no histórico do paciente. Confirma a exclusão definitiva?`
      : 'Tem certeza que deseja excluir esta escala de atendimento? Esta ação é irreversível.';

    const confirmed = await confirm({
      title: 'Excluir Escala de Atendimento',
      description: confirmationText,
      confirmText: 'Excluir Escala',
      cancelText: 'Cancelar',
      variant: 'danger',
    });

    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(sch.id);
        toast.success(
          hasBooked
            ? 'Escala excluída e pacientes agendados retornados para a regulação com sucesso.'
            : 'Escala excluída com sucesso.',
        );
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Erro ao excluir escala.');
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                Agendas & Escalas de Atendimento
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gestão de escalas médicas, parâmetros de oferta e capacidade assistencial municipal
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => refetch()}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            title="Atualizar listagem"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {canWrite && (
            <button
              type="button"
              onClick={() => navigate('/schedules/new')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Escala</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total de Escalas
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {stats.total}
            </div>
          </div>
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Escalas Ativas
            </span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {stats.active}
            </div>
          </div>
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Vagas Disponíveis
            </span>
            <div className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-0.5">
              {stats.availableSlots}
            </div>
          </div>
          <div className="p-2.5 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 rounded-xl">
            <CalendarDays className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Vagas Ocupadas
            </span>
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-0.5">
              {stats.bookedSlots}
            </div>
          </div>
          <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por unidade, médico, procedimento ou CBO..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">Status:</span>
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                statusFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Todas ({schedules.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                statusFilter === 'ACTIVE'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Ativas ({stats.active})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                statusFilter === 'INACTIVE'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Inativas ({schedules.length - stats.active})
            </button>
          </div>
        </div>
      </div>

      {/* Loading & Empty State */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-blue-500 mb-3" />
          <p className="text-sm font-semibold">Carregando escalas e capacidade assistencial...</p>
        </div>
      ) : filteredSchedules.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <Calendar className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
            Nenhuma escala encontrada
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchTerm || statusFilter !== 'ALL'
              ? 'Tente ajustar os filtros de busca para encontrar as escalas desejadas.'
              : 'Comece criando uma nova escala de atendimento para ofertar vagas na rede.'}
          </p>
          {canWrite && !searchTerm && statusFilter === 'ALL' && (
            <button
              type="button"
              onClick={() => navigate('/schedules/new')}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Primeira Escala</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* =========================================================================
              DESKTOP VIEW: Tabela com layout expandido
             ========================================================================= */}
          <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                  <tr>
                    <th className="px-4 py-3">Unidade Executante & Procedimento</th>
                    <th className="px-4 py-3">Profissional & CBO</th>
                    <th className="px-4 py-3">Vigência & Horários</th>
                    <th className="px-4 py-3">Dias da Semana</th>
                    <th className="px-4 py-3 text-center">Capacidade de Vagas</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredSchedules.map((sch) => {
                    const totalVagas = sch.totalSlots || 0;
                    const ocupadas = sch.bookedSlots || 0;
                    const livres = sch.availableSlots || 0;
                    const percentOcupado = totalVagas > 0 ? Math.round((ocupadas / totalVagas) * 100) : 0;
                    const blockedCount = sch.blockedDates?.length || 0;

                    return (
                      <tr
                        key={sch.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                      >
                        {/* Unidade & Procedimento */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-start gap-2.5">
                            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg shrink-0 mt-0.5">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 dark:text-white truncate">
                                {sch.executingHealthCenter?.name || 'Unidade Executante'}
                              </div>
                              <div className="text-blue-600 dark:text-blue-400 font-medium truncate mt-0.5">
                                {sch.procedure
                                  ? `${sch.procedure.code} - ${sch.procedure.name}`
                                  : 'Procedimento'}
                              </div>
                              <div className="flex items-center gap-1.5 mt-1">
                                {sch.isLocalSchedule && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                                    Agenda Local
                                  </span>
                                )}
                                {sch.autoSlotSplit && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
                                    Quebra Automática
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Profissional & CBO */}
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {sch.doctor?.user?.name || 'Profissional'}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                            CRM: {sch.doctor?.crm || '-'} • CBO: {sch.cbo}
                          </div>
                        </td>

                        {/* Vigência & Horários */}
                        <td className="px-4 py-3.5">
                          <div className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
                            {sch.startDate} até {sch.endDate}
                          </div>
                          <div className="flex items-center gap-1 text-slate-500 text-[11px] mt-0.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {sch.startTime} às {sch.endTime}
                            </span>
                          </div>
                          {blockedCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-1">
                              <Ban className="w-3 h-3" /> {blockedCount} data(s) bloqueada(s)
                            </span>
                          )}
                        </td>

                        {/* Dias da Semana */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1 flex-wrap">
                            {['DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO'].map(
                              (day) => {
                                const isSelected = sch.daysOfWeek?.includes(day);
                                return (
                                  <span
                                    key={day}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      isSelected
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                                        : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 opacity-60'
                                    }`}
                                  >
                                    {DAY_LABELS[day]}
                                  </span>
                                );
                              },
                            )}
                          </div>
                        </td>

                        {/* Capacidade de Vagas */}
                        <td className="px-4 py-3.5 text-center">
                          <div className="inline-block text-left w-28">
                            <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                              <span className="text-emerald-600 dark:text-emerald-400">
                                {livres} livres
                              </span>
                              <span className="text-slate-400 font-mono">
                                {ocupadas}/{totalVagas}
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-blue-600 h-1.5 rounded-full"
                                style={{ width: `${percentOcupado}%` }}
                              />
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                              <span>1ªV: {sch.firstTimeQuantity}</span>
                              <span>Ret: {sch.returnQuantity}</span>
                              <span>Reg: {sch.regulatorReservedQuantity}</span>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 text-center">
                          {sch.isActive ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60 px-2.5 py-1 rounded-full">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Ativa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200/80 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60 px-2.5 py-1 rounded-full">
                              <Power className="w-3.5 h-3.5" />
                              Inativa
                            </span>
                          )}
                        </td>

                        {/* Ações */}
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setDetailsSchedule(sch)}
                              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition cursor-pointer"
                              title="Ver Vagas Ofertadas"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {canWrite && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setBlockDatesSchedule(sch)}
                                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition cursor-pointer"
                                  title="Bloquear Datas / Recesso"
                                >
                                  <CalendarDays className="w-4 h-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => navigate(`/schedules/${sch.id}/edit`)}
                                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition cursor-pointer"
                                  title="Editar Escala"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleToggleActive(sch)}
                                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                                    sch.isActive
                                      ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                      : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                  }`}
                                  title={sch.isActive ? 'Desativar Escala' : 'Ativar Escala'}
                                >
                                  <Power className="w-4 h-4" />
                                </button>
                              </>
                            )}

                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDelete(sch)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                                title="Excluir Escala"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* =========================================================================
              MOBILE & TABLET VIEW: Cards responsivos modernos
             ========================================================================= */}
          <div className="lg:hidden space-y-3.5">
            {filteredSchedules.map((sch) => {
              const totalVagas = sch.totalSlots || 0;
              const ocupadas = sch.bookedSlots || 0;
              const livres = sch.availableSlots || 0;
              const percentOcupado = totalVagas > 0 ? Math.round((ocupadas / totalVagas) * 100) : 0;
              const blockedCount = sch.blockedDates?.length || 0;

              return (
                <div
                  key={sch.id}
                  className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
                >
                  {/* Top: Unidade, Status, Badges */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg shrink-0 mt-0.5">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight break-words">
                          {sch.executingHealthCenter?.name || 'Unidade Executante'}
                        </h4>
                        <div className="text-blue-600 dark:text-blue-400 font-semibold text-xs mt-0.5 break-words">
                          {sch.procedure
                            ? `${sch.procedure.code} - ${sch.procedure.name}`
                            : 'Procedimento'}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {sch.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          Ativa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200/80 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60 px-2.5 py-0.5 rounded-full">
                          <Power className="w-3 h-3" />
                          Inativa
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Badges de recursos */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {sch.isLocalSchedule && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                        Agenda Local
                      </span>
                    )}
                    {sch.autoSlotSplit && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
                        Quebra Automática
                      </span>
                    )}
                    {blockedCount > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50">
                        <Ban className="w-3 h-3" /> {blockedCount} Bloqueio(s)
                      </span>
                    )}
                  </div>

                  {/* Informações detalhadas */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400">
                        Profissional
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white block truncate">
                        {sch.doctor?.user?.name || 'Profissional'}
                      </span>
                      <span className="text-[10px] text-slate-500 block truncate">
                        CRM: {sch.doctor?.crm || '-'} • {sch.cbo}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400">
                        Horário & Vigência
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white block font-mono text-[11px]">
                        {sch.startTime} às {sch.endTime}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {sch.startDate} ~ {sch.endDate}
                      </span>
                    </div>
                  </div>

                  {/* Dias da Semana */}
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Dias Ofertados
                    </span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {['DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO'].map((day) => {
                        const isSelected = sch.daysOfWeek?.includes(day);
                        return (
                          <span
                            key={day}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isSelected
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                                : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 opacity-60'
                            }`}
                          >
                            {DAY_LABELS[day]}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Capacidade e barra de progresso */}
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {livres} Vagas Disponíveis
                      </span>
                      <span className="text-slate-500 font-mono">
                        {ocupadas}/{totalVagas} ocupadas ({percentOcupado}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full"
                        style={{ width: `${percentOcupado}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                      <span>1ª Vez: {sch.firstTimeQuantity}</span>
                      <span>Retorno: {sch.returnQuantity}</span>
                      <span>Reserva Regulação: {sch.regulatorReservedQuantity}</span>
                    </div>
                  </div>

                  {/* Barra de Ações Mobile */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setDetailsSchedule(sch)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/50 transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Vagas</span>
                    </button>

                    {canWrite && (
                      <>
                        <button
                          type="button"
                          onClick={() => setBlockDatesSchedule(sch)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/50 transition cursor-pointer"
                        >
                          <CalendarDays className="w-3.5 h-3.5" />
                          <span>Bloqueios</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => navigate(`/schedules/${sch.id}/edit`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/50 transition cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleActive(sch)}
                          className={`p-1.5 rounded-lg border transition cursor-pointer ${
                            sch.isActive
                              ? 'border-amber-200 dark:border-amber-800/60 text-amber-600 dark:text-amber-400 hover:bg-amber-50'
                              : 'border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50'
                          }`}
                          title={sch.isActive ? 'Desativar Escala' : 'Ativar Escala'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(sch)}
                        className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        title="Excluir Escala"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modal: Detalhes das Vagas da Agenda */}
      {detailsSchedule && (
        <ScheduleDetailsModal
          schedule={detailsSchedule}
          isOpen={!!detailsSchedule}
          onClose={() => setDetailsSchedule(null)}
        />
      )}

      {/* Modal: Bloquear / Desbloquear Datas Pontuais */}
      {blockDatesSchedule && (
        <BlockDatesModal
          schedule={blockDatesSchedule}
          isOpen={!!blockDatesSchedule}
          onClose={() => setBlockDatesSchedule(null)}
        />
      )}
    </div>
  );
};
