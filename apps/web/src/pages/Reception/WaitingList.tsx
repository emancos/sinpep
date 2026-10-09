import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Clock, User, Activity, ListOrdered, ArrowLeft, Loader2, Calendar } from 'lucide-react';
import { getReceptionSchedule } from '../../services/reception';
import { useAuthStore } from '../../store/useAuthStore';

export const WaitingList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const specialtyParam = searchParams.get('specialty');
  const [date, setDate] = useState(() => searchParams.get('date') || new Date().toISOString().split('T')[0]);

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
      // Sort by status (AGUARDANDO first), then by hrMarcacao
      if (a.queueStatus === 'AGUARDANDO' && b.queueStatus !== 'AGUARDANDO') return -1;
      if (a.queueStatus !== 'AGUARDANDO' && b.queueStatus === 'AGUARDANDO') return 1;
      const timeA = a.hrMarcacao || '23:59';
      const timeB = b.hrMarcacao || '23:59';
      return timeA.localeCompare(timeB);
    });

  return (
    <div className="p-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/reception?date=${date}`)}
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
              Pacientes aguardando atendimento{specialtyParam ? ` para ${specialtyParam}` : ''}.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
          <Calendar className="w-5 h-5 text-slate-500 ml-2" />
          <input 
            type="date" 
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-slate-700 dark:text-slate-200 cursor-pointer font-medium"
          />
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
            <div key={idx} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${p.queueStatus === 'AGUARDANDO' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
              
              <div className="flex justify-between items-start mb-4">
                <div className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded text-sm font-bold flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {p.hrMarcacao || 'Sem horário'}
                </div>
                <span className={`text-[11px] uppercase tracking-wider font-bold px-3 py-1 rounded-full border ${p.queueStatus === 'AGUARDANDO' ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800/50' : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800/50'}`}>
                  {p.queueStatus || 'NA FILA'}
                </span>
              </div>

              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-2 truncate" title={p.pacienteNome}>
                {p.pacienteNome}
              </h3>
              
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-4">
                <User className="w-4 h-4" />
                <span>CNS: {p.pacienteNuCns || 'N/A'}</span>
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
