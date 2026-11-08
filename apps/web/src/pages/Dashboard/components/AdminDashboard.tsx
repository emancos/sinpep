import React from 'react';
import {
  Users,
  ClipboardList,
  Layers,
  Calendar,
  Stethoscope,
  Building2,
  TrendingUp,
  ArrowRight,
  UserPlus,
  Send,
  FileSpreadsheet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DashboardSummaryResponse } from '../../../hooks/useDashboard';
import { useAuthStore } from '../../../store/useAuthStore';

interface AdminDashboardProps {
  summary?: DashboardSummaryResponse;
  isLoading: boolean;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ summary, isLoading }) => {
  const user = useAuthStore((state) => state.user);
  const kpis = summary?.kpis || {};
  const charts = summary?.charts || {};

  return (
    <div className="space-y-6">
      {/* Banner de Boas-vindas Executivo */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-2xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
              Gestão Municipal da Saúde
            </span>
            <span className="text-xs text-slate-300">Visão Integrada da Rede</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Painel Executivo, {user?.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Acompanhe em tempo real o fluxo regulatório, produção ambulatorial, capacidade das unidades e indicadores municipais.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/patients"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-slate-900 text-xs font-bold shadow hover:bg-slate-100 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-blue-600" />
            <span>Novo Paciente</span>
          </Link>
          <Link
            to="/regulation/solicitor"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Encaminhar</span>
          </Link>
          <Link
            to="/reports"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 backdrop-blur-sm transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Relatórios & BI</span>
          </Link>
        </div>
      </div>

      {/* Grid de KPIs Chave */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
        {/* Total Pacientes */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pacientes</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isLoading ? '...' : kpis.totalPatients?.toLocaleString('pt-BR') || 0}
            </h3>
            <span className="text-2xs text-slate-400">Cadastros na rede</span>
          </div>
        </div>

        {/* Atendimentos Realizados */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Prontuários</span>
            <ClipboardList className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isLoading ? '...' : kpis.totalRecords?.toLocaleString('pt-BR') || 0}
            </h3>
            <span className="text-2xs text-slate-400">Atendimentos totais</span>
          </div>
        </div>

        {/* Demandas na Regulação */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Regulação</span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isLoading ? '...' : kpis.regulationTotal?.toLocaleString('pt-BR') || 0}
            </h3>
            <span className="text-2xs text-slate-400">Demandas ativas</span>
          </div>
        </div>

        {/* Ocupação de Escalas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Ocupação Escalas</span>
            <Calendar className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isLoading ? '...' : `${kpis.occupancyRate || 0}%`}
            </h3>
            <span className="text-2xs text-slate-400">{kpis.bookedSlotsMonth || 0} de {kpis.totalSlotsMonth || 0} vagas</span>
          </div>
        </div>

        {/* Médicos Ativos */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Corpo Clínico</span>
            <Stethoscope className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isLoading ? '...' : kpis.activeDoctors || 0}
            </h3>
            <span className="text-2xs text-slate-400">Médicos ativos</span>
          </div>
        </div>

        {/* Unidades de Saúde */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Unidades</span>
            <Building2 className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isLoading ? '...' : kpis.activeHealthCenters || 0}
            </h3>
            <span className="text-2xs text-slate-400">Estabelecimentos</span>
          </div>
        </div>
      </div>

      {/* Painéis Gráficos e Analíticos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Distribuição das Solicitações da Regulação */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Situação da Central de Regulação
              </h3>
            </div>
            <Link
              to="/regulation/inbox"
              className="text-2xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
            >
              Abrir Central <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="pt-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-center">
              <span className="text-2xs font-semibold text-amber-700 dark:text-amber-300 block">Triagem</span>
              <strong className="text-lg font-bold text-amber-800 dark:text-amber-200 mt-1 block">
                {kpis.regulationToEvaluate || 0}
              </strong>
            </div>

            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-center">
              <span className="text-2xs font-semibold text-blue-700 dark:text-blue-300 block">Fila Espera</span>
              <strong className="text-lg font-bold text-blue-800 dark:text-blue-200 mt-1 block">
                {kpis.regulationWaitingList || 0}
              </strong>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-center">
              <span className="text-2xs font-semibold text-emerald-700 dark:text-emerald-300 block">Agendadas</span>
              <strong className="text-lg font-bold text-emerald-800 dark:text-emerald-200 mt-1 block">
                {kpis.regulationScheduled || 0}
              </strong>
            </div>

            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-center">
              <span className="text-2xs font-semibold text-rose-700 dark:text-rose-300 block">Devolvidas</span>
              <strong className="text-lg font-bold text-rose-800 dark:text-rose-200 mt-1 block">
                {kpis.regulationReturned || 0}
              </strong>
            </div>

            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
              <span className="text-2xs font-semibold text-slate-600 dark:text-slate-400 block">Total</span>
              <strong className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-1 block">
                {kpis.regulationTotal || 0}
              </strong>
            </div>
          </div>

          {/* Top Especialidades Reguladas */}
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-3">
              Top Especialidades mais Demandadas na Rede
            </span>
            <div className="space-y-2">
              {charts.topSpecialties?.map((spec: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[240px]">
                    {spec.specialty_name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{spec.count}</span>
                    <span className="text-2xs text-slate-400">pedidos</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Produção e Top Unidades */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Encaminhamentos por UBS Solicitante
              </h3>
            </div>
            <Link
              to="/reports"
              className="text-2xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
            >
              Ver BI Completo <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="pt-4 space-y-3">
            {charts.topSolicitors?.map((ubs: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-2xs">
                    {idx + 1}
                  </div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[220px]">
                    {ubs.ubs_name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <strong className="font-bold text-blue-600 dark:text-blue-400">{ubs.count}</strong>
                  <span className="text-2xs text-slate-400">solicitações</span>
                </div>
              </div>
            ))}
          </div>

          {/* Histórico Mensal */}
          {charts.monthlyTrend && charts.monthlyTrend.length > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-2.5">
                Evolução dos Atendimentos (Últimos 6 meses)
              </span>
              <div className="flex items-end gap-2 h-20 pt-2">
                {charts.monthlyTrend.map((m: any, idx: number) => {
                  const maxCount = Math.max(...charts.monthlyTrend.map((x: any) => x.count || 1));
                  const heightPct = Math.round((m.count / maxCount) * 100);
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      <span className="text-2xs font-bold text-slate-700 dark:text-slate-300">{m.count}</span>
                      <div
                        style={{ height: `${Math.max(heightPct, 12)}%` }}
                        className="w-full bg-blue-500/80 rounded-t-md hover:bg-blue-600 transition-colors"
                        title={`${m.month}: ${m.count} prontuários`}
                      />
                      <span className="text-3xs text-slate-400">{m.month?.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
