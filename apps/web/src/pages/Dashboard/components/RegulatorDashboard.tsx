import React from 'react';
import {
  Layers,
  Inbox,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  Sparkles,
  Sliders,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DashboardSummaryResponse } from '../../../hooks/useDashboard';
import { useAuthStore } from '../../../store/useAuthStore';
import { formatDateBR } from '../../../utils/brazilianFormatters';

interface RegulatorDashboardProps {
  summary?: DashboardSummaryResponse;
  isLoading: boolean;
}

export const RegulatorDashboard: React.FC<RegulatorDashboardProps> = ({ summary, isLoading }) => {
  const user = useAuthStore((state) => state.user);
  const kpis = summary?.kpis || {};
  const charts = summary?.charts || {};
  const recentItems = summary?.recentItems || [];

  return (
    <div className="space-y-6">
      {/* Banner da Central de Regulação */}
      <div className="bg-gradient-to-r from-blue-900 via-sky-900 to-indigo-900 text-white p-6 rounded-2xl shadow-md border border-blue-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-2xs font-bold uppercase tracking-wider bg-sky-500/20 text-sky-200 border border-sky-400/30">
              Central Municipal de Regulação
            </span>
            <span className="text-xs text-blue-200">Gestão de Vagas & Acesso SUS</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Olá, Dr(a). {user?.name}
          </h1>
          <p className="text-xs sm:text-sm text-blue-100/90 mt-1 max-w-xl">
            Priorize as solicitações de maior gravidade clínica, acompanhe a fila de espera e otimize a distribuição de consultas e exames na rede.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/regulation/inbox"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-blue-900 text-xs font-bold shadow hover:bg-blue-50 transition-all cursor-pointer"
          >
            <Inbox className="w-4 h-4 text-blue-700" />
            <span>Triagem & Avaliação</span>
          </Link>
          <Link
            to="/regulation/waiting-list"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-700/80 hover:bg-blue-600 text-white text-xs font-bold shadow border border-blue-400/30 transition-all cursor-pointer"
          >
            <Clock className="w-4 h-4" />
            <span>Fila de Espera</span>
          </Link>
          <Link
            to="/regulation/auto-scheduling/rules"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 backdrop-blur-sm transition-all cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
            <span>Regras Auto</span>
          </Link>
        </div>
      </div>

      {/* Grid de KPIs do Fluxo Regulatório */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Pendentes de Avaliação */}
        <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Pendente Triagem</span>
            <Inbox className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-amber-700 dark:text-amber-300">
              {isLoading ? '...' : kpis.toEvaluate || 0}
            </h3>
            <span className="text-2xs text-slate-400">Aguardando parecer médico</span>
          </div>
        </div>

        {/* Fila de Espera Automática */}
        <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/50 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">Fila de Espera</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {isLoading ? '...' : kpis.waitingList || 0}
            </h3>
            <span className="text-2xs text-slate-400">Autorizados s/ vaga</span>
          </div>
        </div>

        {/* Agendadas com Sucesso */}
        <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Agendadas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              {isLoading ? '...' : kpis.scheduled || 0}
            </h3>
            <span className="text-2xs text-slate-400">Vagas confirmadas</span>
          </div>
        </div>

        {/* Devolvidas p/ UBS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">Devolvidas p/ UBS</span>
            <RotateCcw className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {isLoading ? '...' : kpis.returned || 0}
            </h3>
            <span className="text-2xs text-slate-400">Pendência documental</span>
          </div>
        </div>

        {/* Total em Trâmite Ativo */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Total em Trâmite</span>
            <Layers className="w-4 h-4 text-slate-500" />
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {isLoading ? '...' : kpis.totalActive || 0}
            </h3>
            <span className="text-2xs text-slate-400">Triagem + Fila</span>
          </div>
        </div>
      </div>

      {/* Painéis Visuais: Riscos e Top Especialidades Represadas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Classificação de Risco */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Demanda por Classificação de Risco
              </h3>
            </div>
            <span className="text-2xs text-slate-400">Protocolo de Manchester</span>
          </div>

          <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {charts.riskBreakdown?.map((r: any, idx: number) => {
              const riskCardMap: Record<string, string> = {
                VERMELHO: 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/40',
                URGENCIA: 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/40',
                AMARELO: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/40',
                PRIORITARIO: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/40',
                VERDE: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/40',
                ELETIVO: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/40',
                AZUL: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/40',
              };
              const bg = riskCardMap[String(r.risk || '').toUpperCase()] || 'bg-slate-50 text-slate-700 border-slate-200';

              return (
                <div key={idx} className={`p-3 rounded-xl border text-center ${bg}`}>
                  <span className="text-2xs font-bold uppercase tracking-wider block">
                    {r.risk}
                  </span>
                  <strong className="text-xl font-extrabold mt-1 block">
                    {r.count}
                  </strong>
                  <span className="text-3xs opacity-80">pacientes</span>
                </div>
              );
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-2.5">
              Especialidades com Maior Fila de Espera (Aguardando Vagas)
            </span>
            <div className="space-y-2">
              {charts.topWaitingSpecialties?.map((spec: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {spec.specialty_name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <strong className="font-bold text-blue-600 dark:text-blue-400">{spec.count}</strong>
                    <span className="text-2xs text-slate-400">aguardando</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Solicitações Urgentes Recém-Chegadas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Urgências Prioritárias p/ Avaliação
                </h3>
              </div>
              <Link
                to="/regulation/inbox"
                className="text-2xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
              >
                Ver Todas <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="pt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {recentItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Nenhuma solicitação urgente pendente de avaliação.
                </div>
              ) : (
                recentItems.map((item: any) => {
                  const riskBadgeMap: Record<string, string> = {
                    VERMELHO: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
                    URGENCIA: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
                    AMARELO: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
                    PRIORITARIO: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
                    VERDE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
                    ELETIVO: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
                  };
                  const badge = riskBadgeMap[String(item.risk || '').toUpperCase()] || 'bg-slate-100 text-slate-700';

                  return (
                    <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-3xs font-bold uppercase ${badge}`}>
                            {item.risk}
                          </span>
                          <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">
                            {item.patient_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-2xs text-slate-400 mt-0.5">
                          <span>{item.specialty_name}</span>
                          <span>•</span>
                          <span>{item.requesting_unit}</span>
                          <span>•</span>
                          <span>{formatDateBR(item.created_at)}</span>
                        </div>
                      </div>

                      <Link
                        to={`/regulation/inbox`}
                        className="px-2.5 py-1 text-2xs font-bold rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors shrink-0"
                      >
                        Avaliar
                      </Link>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <Link
              to="/regulation/inbox"
              className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <span>Abrir Caixa de Triagem Completa</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
