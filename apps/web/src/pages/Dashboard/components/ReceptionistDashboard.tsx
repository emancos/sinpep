import React, { useState } from 'react';
import {
  CalendarCheck,
  Clock,
  UserCheck,
  CheckCircle2,
  XCircle,
  Search,
  UserPlus,
  ArrowRight,
  Building2,
  Stethoscope,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { DashboardSummaryResponse } from '../../../hooks/useDashboard';
import { useAuthStore } from '../../../store/useAuthStore';

interface ReceptionistDashboardProps {
  summary?: DashboardSummaryResponse;
  isLoading: boolean;
}

export const ReceptionistDashboard: React.FC<ReceptionistDashboardProps> = ({ summary, isLoading }) => {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const kpis = summary?.kpis || {};
  const activeRooms = summary?.activeRooms || [];

  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    navigate(`/reception?search=${encodeURIComponent(searchTerm.trim())}`);
  };

  return (
    <div className="space-y-6">
      {/* Banner da Recepção */}
      <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-indigo-950 text-white p-6 rounded-2xl shadow-md border border-rose-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-2xs font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-400/30">
              Acolhimento & Guichê • Recepção
            </span>
            <span className="text-xs text-rose-200">Porta de Entrada da Unidade</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Olá, {user?.name}!
          </h1>
          <p className="text-xs sm:text-sm text-rose-100/90 mt-1 max-w-xl">
            Realize o acolhimento e check-in dos pacientes do dia, acompanhe a sala de espera e oriente o fluxo para os consultórios médicos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/reception"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-rose-950 text-xs font-bold shadow hover:bg-rose-50 transition-all cursor-pointer"
          >
            <CalendarCheck className="w-4 h-4 text-rose-700" />
            <span>Fila de Atendimento</span>
          </Link>
          <Link
            to="/patients"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-700/80 hover:bg-rose-600 text-white text-xs font-bold shadow border border-rose-500/30 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Novo Paciente</span>
          </Link>
        </div>
      </div>

      {/* Grid de KPIs do Dia da Recepção */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
        {/* Total Agendados Hoje */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Agendados Hoje</span>
            <CalendarCheck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isLoading ? '...' : kpis.totalScheduledToday || 0}
            </h3>
            <span className="text-2xs text-slate-400">Na grade da unidade</span>
          </div>
        </div>

        {/* Check-ins Realizados */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Check-ins</span>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {isLoading ? '...' : kpis.totalCheckedIn || 0}
            </h3>
            <span className="text-2xs text-slate-400">Acolhidos na recepção</span>
          </div>
        </div>

        {/* Aguardando na Sala */}
        <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/50 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">Aguardando</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {isLoading ? '...' : kpis.waiting || 0}
            </h3>
            <span className="text-2xs text-slate-400">Na sala de espera</span>
          </div>
        </div>

        {/* Em Consulta */}
        <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Em Atendimento</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-amber-700 dark:text-amber-300">
              {isLoading ? '...' : kpis.inAttendance || 0}
            </h3>
            <span className="text-2xs text-slate-400">No consultório</span>
          </div>
        </div>

        {/* Concluídos */}
        <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Concluídos</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              {isLoading ? '...' : kpis.completed || 0}
            </h3>
            <span className="text-2xs text-slate-400">Finalizados no dia</span>
          </div>
        </div>

        {/* Faltas */}
        <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">Faltas</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {isLoading ? '...' : kpis.noShow || 0}
            </h3>
            <span className="text-2xs text-slate-400">Não compareceram</span>
          </div>
        </div>
      </div>

      {/* Busca Rápida de Acolhimento e Consultórios Ativos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Guichê: Busca de Paciente */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Search className="w-4 h-4 text-rose-600" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Acolhimento Rápido no Guichê
            </h3>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400">
            Digite o Nome, CPF ou Protocolo do paciente para localizar seu agendamento na grade do dia e efetuar o check-in imediato na fila:
          </p>

          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por Nome, CPF ou Protocolo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
            >
              Localizar
            </button>
          </form>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-2xs text-slate-500">
            <span>Dúvidas com agendamento do e-SUS?</span>
            <Link
              to="/reception"
              className="font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1"
            >
              Abrir Fila de Atendimento Completa <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Consultórios e Médicos Ativos Hoje */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Consultórios e Especialidades Ativas Hoje
                </h3>
              </div>
              <span className="text-2xs text-slate-400">Escalas vigentes</span>
            </div>

            <div className="pt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {activeRooms.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Nenhum ambulatório com atendimento ativo cadastrado hoje.
                </div>
              ) : (
                activeRooms.map((room: any, idx: number) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {room.room_name || 'Consultório Ambulatorial'}
                        </span>
                        <span className="text-2xs font-medium text-slate-500 dark:text-slate-400">
                          ({room.specialty_name || 'Geral'})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-2xs text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                          <Stethoscope className="w-3 h-3 text-blue-500" />
                          Dr(a). {room.doctor_name}
                        </span>
                        <span>•</span>
                        <span>{room.start_time} às {room.end_time}</span>
                      </div>
                    </div>

                    <Link
                      to="/reception"
                      className="px-2.5 py-1 text-2xs font-semibold rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      Ver Fila
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <Link
              to="/reception"
              className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <span>Gerenciar Recepção em Tempo Real</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
