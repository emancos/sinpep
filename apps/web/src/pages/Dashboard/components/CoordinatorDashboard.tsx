import React from 'react';
import {
  Building2,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  Plus,
  ArrowRight,
  Stethoscope,
  Activity,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DashboardSummaryResponse } from '../../../hooks/useDashboard';
import { useAuthStore } from '../../../store/useAuthStore';

interface CoordinatorDashboardProps {
  summary?: DashboardSummaryResponse;
  isLoading: boolean;
}

export const CoordinatorDashboard: React.FC<CoordinatorDashboardProps> = ({ summary, isLoading }) => {
  const user = useAuthStore((state) => state.user);
  const kpis = summary?.kpis || {};
  const todayFlow = summary?.todayFlow || {};
  const activeSchedules = summary?.activeSchedules || [];

  return (
    <div className="space-y-6">
      {/* Banner da Coordenação de Unidade */}
      <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-purple-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-2xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-400/30">
              Gestão Ambulatorial • Coordenador de Unidade
            </span>
            <span className="text-xs text-purple-200">Unidade Executante</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Olá, {user?.name}!
          </h1>
          <p className="text-xs sm:text-sm text-purple-200/90 mt-1 max-w-xl">
            Monitore as escalas médicas ativas, a taxa de ocupação dos consultórios e o fluxo de acolhimento dos pacientes na unidade hoje.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/schedules/create"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-purple-950 text-xs font-bold shadow hover:bg-purple-50 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-purple-700" />
            <span>Nova Escala</span>
          </Link>
          <Link
            to="/reception"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-700/80 hover:bg-purple-600 text-white text-xs font-bold shadow border border-purple-500/30 transition-all cursor-pointer"
          >
            <Clock className="w-4 h-4" />
            <span>Fila Recepção</span>
          </Link>
          <Link
            to="/rooms"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 backdrop-blur-sm transition-all cursor-pointer"
          >
            <Building2 className="w-4 h-4" />
            <span>Ambulatórios</span>
          </Link>
        </div>
      </div>

      {/* Grid de KPIs da Unidade */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Agendados Hoje */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Previstos Hoje</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isLoading ? '...' : kpis.scheduledToday || 0}
            </h3>
            <span className="text-2xs text-slate-400">Pacientes marcados hoje</span>
          </div>
        </div>

        {/* Escalas Ativas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Escalas Ativas</span>
            <Calendar className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isLoading ? '...' : kpis.activeSchedules || 0}
            </h3>
            <span className="text-2xs text-slate-400">Grades ambulatoriais</span>
          </div>
        </div>

        {/* Ocupação no Mês */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Ocupação no Mês</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {isLoading ? '...' : `${kpis.occupancyRate || 0}%`}
            </h3>
            <span className="text-2xs text-slate-400">{kpis.bookedSlotsMonth || 0} de {kpis.totalSlotsMonth || 0} vagas</span>
          </div>
        </div>

        {/* Atendidos Hoje */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Concluídos Hoje</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isLoading ? '...' : todayFlow.completed || 0}
            </h3>
            <span className="text-2xs text-slate-400">Consultas finalizadas</span>
          </div>
        </div>

        {/* Faltas Hoje */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Faltas (No-Show)</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {isLoading ? '...' : todayFlow.noShow || 0}
            </h3>
            <span className="text-2xs text-slate-400">Não compareceram</span>
          </div>
        </div>
      </div>

      {/* Painéis: Fluxo da Recepção Hoje e Grade de Escalas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Fluxo em Tempo Real na Recepção */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Fluxo de Recepção & Sala de Espera (Hoje)
              </h3>
            </div>
            <Link
              to="/reception"
              className="text-2xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
            >
              Abrir Recepção <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-center">
              <span className="text-2xs font-semibold text-blue-700 dark:text-blue-300 block">Aguardando</span>
              <strong className="text-xl font-bold text-blue-800 dark:text-blue-200 mt-1 block">
                {todayFlow.waiting || 0}
              </strong>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-center">
              <span className="text-2xs font-semibold text-amber-700 dark:text-amber-300 block">Em Consulta</span>
              <strong className="text-xl font-bold text-amber-800 dark:text-amber-200 mt-1 block">
                {todayFlow.inAttendance || 0}
              </strong>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-center">
              <span className="text-2xs font-semibold text-emerald-700 dark:text-emerald-300 block">Concluídos</span>
              <strong className="text-xl font-bold text-emerald-800 dark:text-emerald-200 mt-1 block">
                {todayFlow.completed || 0}
              </strong>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-center">
              <span className="text-2xs font-semibold text-rose-700 dark:text-rose-300 block">Faltas</span>
              <strong className="text-xl font-bold text-rose-800 dark:text-rose-200 mt-1 block">
                {todayFlow.noShow || 0}
              </strong>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
            <p>
              Os pacientes agendados pelo SINPeP e pelo e-SUS Regulação são consolidados automaticamente na fila diária de recepção.
            </p>
          </div>
        </div>

        {/* Escalas Médicas Ativas na Unidade */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Escalas Ambulatoriais Vigentes
                </h3>
              </div>
              <Link
                to="/schedules"
                className="text-2xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
              >
                Gerenciar Escalas <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="pt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {activeSchedules.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Nenhuma escala médica ativa cadastrada para hoje nesta unidade.
                </div>
              ) : (
                activeSchedules.map((sch: any) => (
                  <div key={sch.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {sch.doctor_name}
                        </span>
                        {sch.crm && (
                          <span className="text-2xs text-slate-400">CRM {sch.crm}</span>
                        )}
                      </div>
                      <div className="text-2xs text-slate-500 mt-0.5">
                        <span>{sch.specialty_name || 'Ambulatório Geral'}</span>
                        <span className="mx-1">•</span>
                        <span>{sch.start_time} às {sch.end_time}</span>
                        <span className="mx-1">•</span>
                        <span>{sch.slots_per_turn || 0} vagas/dia</span>
                      </div>
                    </div>

                    <Link
                      to="/schedules"
                      className="px-2.5 py-1 text-2xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      Detalhes
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <Link
              to="/schedules/create"
              className="w-full py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <span>Cadastrar Nova Escala Médica</span>
              <Plus className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
