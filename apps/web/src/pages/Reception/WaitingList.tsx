import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Clock, User, Activity, ListOrdered, ArrowLeft, Loader2, Calendar, Star } from 'lucide-react';
import { getReceptionSchedule } from '../../services/reception';
import { useAuthStore } from '../../store/useAuthStore';
import { PriorityRuleSelector } from './PriorityRuleSelector';

export const WaitingList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const specialtyParam = searchParams.get('specialty');
  const timeParam = searchParams.get('time');
  const [date, setDate] = useState(() => searchParams.get('date') || new Date().toISOString().split('T')[0]);

  const handleBack = () => {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (specialtyParam) params.set('specialty', specialtyParam);
    if (timeParam) params.set('time', timeParam);
    navigate(`/reception?${params.toString()}`);
  };

  React.useEffect(() => {
    const currentUrlDate = searchParams.get('date');
    if (date && date !== currentUrlDate) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('date', date);
      setSearchParams(newParams, { replace: true });
    }
  }, [date, searchParams, setSearchParams]);

  React.useEffect(() => {
    const urlDate = searchParams.get('date');
    if (urlDate && urlDate !== date) {
      setDate(urlDate);
    }
  }, [searchParams]);

  const token = useAuthStore(state => state.token);
  const cnes = '2606712'; // Fallback

  const { data: schedule, isLoading } = useQuery({
    queryKey: ['reception-schedule', date, cnes],
    queryFn: () => getReceptionSchedule(date, cnes, token!),
    enabled: !!token,
  });

  const waitingPatients = Object.entries(schedule || {})
    .filter(([specialty]) => !specialtyParam || specialty === specialtyParam)
    .flatMap(([specialty, patients]) => 
      (patients as any[])
        .filter((p: any) => p.isQueued)
        .map((p: any) => ({ ...p, specialty }))
    )
    .sort((a, b) => {
      // Sort by status (AGUARDANDO first)
      if (a.queueStatus === 'AGUARDANDO' && b.queueStatus !== 'AGUARDANDO') return -1;
      if (a.queueStatus !== 'AGUARDANDO' && b.queueStatus === 'AGUARDANDO') return 1;

      // Sort by attendance order ascending
      const orderA = a.attendanceOrder ?? a.queueOrder ?? 9999;
      const orderB = b.attendanceOrder ?? b.queueOrder ?? 9999;
      if (orderA !== orderB) return orderA - orderB;

      const timeA = a.hrMarcacao || '23:59';
      const timeB = b.hrMarcacao || '23:59';
      return timeA.localeCompare(timeB);
    });

  return (
    <div className="p-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="flex items-center justify-center w-10 h-10 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ListOrdered className="w-6 h-6 text-blue-500" />
              Lista de Espera {specialtyParam && `- ${specialtyParam}`}
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Pacientes aguardando atendimento ordenados pela regra de prioridade ativa.
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <PriorityRuleSelector />
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
            <Calendar className="w-5 h-5 text-slate-500 ml-1" />
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-slate-700 dark:text-slate-200 cursor-pointer font-medium text-sm"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : waitingPatients.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-12 text-center border border-slate-200 dark:border-slate-700 shadow-sm">
          <Clock className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">Nenhum paciente na fila</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Todos os pacientes de hoje já foram atendidos ou nenhum foi enfileirado ainda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {waitingPatients.map((p, idx) => (
            <div
              key={p.queueId || p.coSolicitacao || idx}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group flex flex-col justify-between"
            >
              {/* Barra lateral destacando prioridade ou convencional */}
              <div
                className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                  p.priority === 'PRIORITARIO' ? 'bg-amber-500' : 'bg-blue-600'
                }`}
              />
              
              <div>
                {/* Header do Card: Ordem de Atendimento & Status */}
                <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                  <span className="px-3 py-1 bg-[#0051A2] text-white rounded-lg text-xs font-black flex items-center gap-1.5 shadow-sm tracking-wide">
                    <ListOrdered className="w-3.5 h-3.5" />
                    <span>
                      {p.attendanceOrder || p.queueOrder ? `${p.attendanceOrder || p.queueOrder}º a ser atendido` : 'Na Fila'}
                    </span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    {p.priority === 'PRIORITARIO' ? (
                      <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        Prioritário
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 px-2.5 py-0.5 rounded-full text-xs font-medium">
                        Convencional
                      </span>
                    )}

                    <span
                      className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border ${
                        p.queueStatus === 'AGUARDANDO'
                          ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800/50'
                          : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800/50'
                      }`}
                    >
                      {p.queueStatus || 'NA FILA'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Horário Marcado: <strong className="text-slate-700 dark:text-slate-300">{p.hrMarcacao || 'Sem horário'}</strong></span>
                </div>

                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-2 truncate" title={p.pacienteNome}>
                  {p.pacienteNome}
                </h3>
                
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-4">
                  <User className="w-4 h-4" />
                  <span>CNS: {p.pacienteNuCns || 'N/A'}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-700/50 space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <Activity className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-700 dark:text-slate-300">{p.specialty}</p>
                    {p.noProcedimentoInterno && p.noProcedimentoInterno !== p.specialty && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{p.noProcedimentoInterno}</p>
                    )}
                  </div>
                </div>
                
                {p.noProfissionalExecutante && (
                  <div className="flex items-start gap-2 text-sm pt-2">
                    <User className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Profissional / Médico</p>
                      <p className="font-semibold text-slate-700 dark:text-slate-300 line-clamp-1">{p.noProfissionalExecutante}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

