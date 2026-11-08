import React from 'react';
import {
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  RotateCcw,
  ArrowRight,
  Ticket,
  CalendarCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DashboardSummaryResponse } from '../../../hooks/useDashboard';
import { useAuthStore } from '../../../store/useAuthStore';
import { formatDateBR } from '../../../utils/brazilianFormatters';

interface SolicitorDashboardProps {
  summary?: DashboardSummaryResponse;
  isLoading: boolean;
}

export const SolicitorDashboard: React.FC<SolicitorDashboardProps> = ({ summary, isLoading }) => {
  const user = useAuthStore((state) => state.user);
  const kpis = summary?.kpis || {};
  const alerts = summary?.alerts || [];
  const recentScheduled = summary?.recentScheduled || [];

  return (
    <div className="space-y-6">
      {/* Banner da Atenção Básica (UBS) */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-emerald-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-2xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
              Atenção Básica • Módulo Solicitante (UBS)
            </span>
            <span className="text-xs text-emerald-200">Encaminhamentos & Acesso SUS</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Olá, {user?.name}!
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-xl">
            Acompanhe a situação dos encaminhamentos da sua unidade, resolva pendências clínicas devolvidas e emita comprovantes para os pacientes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/regulation/solicitor"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-emerald-900 text-xs font-bold shadow hover:bg-emerald-50 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4 text-emerald-700" />
            <span>Nova Solicitação</span>
          </Link>
          <Link
            to="/patients"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-bold shadow border border-emerald-500/30 transition-all cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>Pacientes da UBS</span>
          </Link>
        </div>
      </div>

      {/* Grid de KPIs da UBS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total da Unidade */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Minhas Demandas</span>
            <Send className="w-4 h-4 text-slate-500" />
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
              {isLoading ? '...' : kpis.total || 0}
            </h3>
            <span className="text-2xs text-slate-400">Encaminhamentos gerados</span>
          </div>
        </div>

        {/* Aguardando Parecer Regulador */}
        <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Em Triagem</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-amber-700 dark:text-amber-300">
              {isLoading ? '...' : kpis.toEvaluate || 0}
            </h3>
            <span className="text-2xs text-slate-400">Aguardando regulação</span>
          </div>
        </div>

        {/* Fila de Espera */}
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
            <span className="text-2xs text-slate-400">Prontas p/ emissão de guia</span>
          </div>
        </div>

        {/* Devolvidas para Correção */}
        <div className={`rounded-xl p-4 shadow-sm flex flex-col justify-between border ${
          (kpis.returned || 0) > 0
            ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${
              (kpis.returned || 0) > 0 ? 'text-rose-700 dark:text-rose-300 font-bold' : 'text-slate-500'
            }`}>
              Devolvidas (Ação)
            </span>
            <RotateCcw className={`w-4 h-4 ${(kpis.returned || 0) > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
          </div>
          <div className="mt-2">
            <h3 className={`text-2xl font-bold ${(kpis.returned || 0) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-100'}`}>
              {isLoading ? '...' : kpis.returned || 0}
            </h3>
            <span className="text-2xs text-slate-400">Exige retificação da UBS</span>
          </div>
        </div>
      </div>

      {/* Painéis: Solicitações Devolvidas vs Agendamentos Confirmados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Alerta de Devolvidas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Devolvidas para Correção pela Central
                </h3>
              </div>
              <span className="text-2xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full">
                Exigem Ação
              </span>
            </div>

            <div className="pt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {alerts.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Nenhuma solicitação devolvida com pendência no momento. Excelente trabalho!
                </div>
              ) : (
                alerts.map((item: any) => (
                  <div key={item.id} className="py-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                        {item.patient_name}
                      </span>
                      <span className="text-3xs font-mono text-slate-400">
                        Protocolo: {item.protocol}
                      </span>
                    </div>

                    <div className="text-2xs text-slate-500">
                      <span>Especialidade: <strong>{item.specialty_name}</strong></span>
                      <span className="mx-1">•</span>
                      <span>Devolvido em: {formatDateBR(item.updated_at || item.created_at)}</span>
                    </div>

                    {item.reason && (
                      <p className="text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30 p-2 rounded-lg border border-rose-200 dark:border-rose-900/40 leading-relaxed">
                        <strong className="font-semibold">Parecer do Regulador: </strong>
                        {item.reason}
                      </p>
                    )}

                    <div className="pt-1 flex justify-end">
                      <Link
                        to="/regulation/solicitor"
                        className="px-2.5 py-1 text-2xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center gap-1 shadow-sm"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Corrigir & Reenviar</span>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Agendamentos Confirmados (Prontos para Retirada de Guia) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Agendamentos Confirmados Recentes
                </h3>
              </div>
              <span className="text-2xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                Prontos para Retirada
              </span>
            </div>

            <div className="pt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {recentScheduled.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Nenhum agendamento recente para exibir.
                </div>
              ) : (
                recentScheduled.map((item: any) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">
                          {item.patient_name}
                        </span>
                        {item.token && (
                          <span className="px-1.5 py-0.2 rounded text-3xs font-mono font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            Chave: {item.token}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-2xs text-slate-400 mt-0.5">
                        <span className="text-slate-600 dark:text-slate-300 font-medium">
                          {formatDateBR(item.scheduled_date)} às {item.scheduled_time || '—'}
                        </span>
                        <span>•</span>
                        <span>{item.specialty_name}</span>
                        <span>•</span>
                        <span>{item.executing_unit || 'Unidade Executante'}</span>
                      </div>
                    </div>

                    <Link
                      to="/regulation/solicitor"
                      className="px-2.5 py-1 text-2xs font-bold rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors shrink-0 flex items-center gap-1"
                      title="Emitir comprovante de agendamento"
                    >
                      <Ticket className="w-3.5 h-3.5" />
                      <span>Guia</span>
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <Link
              to="/regulation/solicitor"
              className="w-full py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <span>Acompanhar Todos os Encaminhamentos da UBS</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
