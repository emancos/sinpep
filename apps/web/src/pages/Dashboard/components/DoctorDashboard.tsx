import React from 'react';
import {
  Sparkles,
  CalendarCheck,
  ClipboardList,
  Users,
  Clock,
  ArrowRight,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DashboardSummaryResponse } from '../../../hooks/useDashboard';
import { useAuthStore } from '../../../store/useAuthStore';
import { formatDateBR, formatCPF } from '../../../utils/brazilianFormatters';

interface DoctorDashboardProps {
  summary?: DashboardSummaryResponse;
  isLoading: boolean;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({ summary, isLoading }) => {
  const user = useAuthStore((state) => state.user);
  const kpis = summary?.kpis || {};
  const doctorInfo = summary?.doctorInfo || {};
  const recentRecords = summary?.recentRecords || [];

  return (
    <div className="space-y-6">
      {/* Banner Clínico Personalizado */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white p-6 sm:p-8 rounded-2xl shadow-lg border border-blue-700/50">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/30 text-blue-200 border border-blue-400/30 backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                Painel Clínico • Médico
              </span>
              {doctorInfo?.crm && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/20">
                  CRM {doctorInfo.crm}/{doctorInfo.crmState}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Olá, Dr(a). {doctorInfo?.name || user?.name}!
            </h1>
            <p className="text-blue-100/90 text-sm sm:text-base max-w-2xl">
              Acompanhe os atendimentos da sua especialidade, consulte prontuários clínicos e verifique a fila de espera do dia.
            </p>
            {doctorInfo?.specialties && doctorInfo.specialties.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-blue-200 font-medium">Especialidade(s):</span>
                {doctorInfo.specialties.map((spec: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-500/20 text-white border border-blue-400/30"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/reception"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-blue-900 hover:bg-blue-50 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
            >
              <CalendarCheck className="w-5 h-5 text-blue-700" />
              <span>Fila de Atendimento</span>
            </Link>
            <Link
              to="/patients"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-700/60 hover:bg-blue-700 text-white rounded-xl font-medium transition-all border border-blue-500/40 backdrop-blur-sm"
            >
              <Users className="w-5 h-5" />
              <span>Pacientes & Prontuários</span>
            </Link>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Grid de KPIs do Médico */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pacientes Agendados Hoje */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Agendados Hoje</span>
            <CalendarCheck className="w-5 h-5 text-blue-600" />
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {isLoading ? '...' : kpis.scheduledToday || 0}
            </h3>
            <span className="text-2xs text-slate-400">Vagas agendadas no dia</span>
          </div>
        </div>

        {/* Aguardando na Sala */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Aguardando na Recepção</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
              {isLoading ? '...' : kpis.waitingInRoom || 0}
            </h3>
            <span className="text-2xs text-slate-400">Check-in realizado</span>
          </div>
        </div>

        {/* Atendidos Hoje */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Atendidos Hoje</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {isLoading ? '...' : kpis.completedToday || 0}
            </h3>
            <span className="text-2xs text-slate-400">Prontuários no plantão</span>
          </div>
        </div>

        {/* Meus Prontuários no Mês */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Consultas no Mês</span>
            <ClipboardList className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
              {isLoading ? '...' : kpis.recordsMonth || 0}
            </h3>
            <span className="text-2xs text-slate-400">Minha produção mensal</span>
          </div>
        </div>
      </div>

      {/* Prontuários Recentes do Médico */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                Prontuários Recentes Realizados
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Últimos atendimentos clínicos registrados por você
              </p>
            </div>
          </div>
          <Link
            to="/patients"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 self-start sm:self-auto"
          >
            Consultar Todos <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="p-0">
          {recentRecords.length === 0 ? (
            <div className="p-12 text-center">
              <ClipboardList className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
                Nenhum prontuário registrado ainda
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Os prontuários clínicos dos pacientes atendidos aparecerão listados aqui.
              </p>
              <Link
                to="/reception"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <CalendarCheck className="w-4 h-4" />
                <span>Ver Fila de Hoje</span>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {recentRecords.map((record: any) => (
                <div
                  key={record.id}
                  className="p-5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold text-sm">
                      {record.patient_name?.charAt(0)?.toUpperCase() || 'P'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/medical-records/${record.patient_id}`}
                          className="font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          {record.patient_name}
                        </Link>
                        {record.cid10 && (
                          <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded border border-indigo-200 dark:border-indigo-800">
                            CID: {record.cid10}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-mono">CPF: {formatCPF(record.patient_cpf)}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDateBR(record.created_at)}
                        </span>
                      </div>

                      {record.observation && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 line-clamp-2 bg-slate-50 dark:bg-slate-800/60 p-2 rounded border border-slate-100 dark:border-slate-800">
                          <span className="font-medium text-slate-500 dark:text-slate-400">Resumo: </span>
                          {record.observation}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 self-end lg:self-center">
                    <Link
                      to={`/medical-records/${record.patient_id}`}
                      className="px-4 py-2 text-xs font-semibold bg-[#0051A2] hover:bg-[#003B77] text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Abrir Prontuário</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
