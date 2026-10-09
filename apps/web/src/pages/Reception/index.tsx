import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getReceptionSchedule, enqueuePatient } from '../../services/reception';
import { useAuthStore } from '../../store/useAuthStore';
import { Loader2, Calendar, UserPlus, ListOrdered, Activity, MapPin, ChevronLeft, Clock, Users } from 'lucide-react';
import { toast } from 'sonner';
import { CreatePatientModal } from './CreatePatientModal';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const Reception: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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
  
  const queryClient = useQueryClient();
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [activeTimeSlot, setActiveTimeSlot] = useState<string | null>(null);
  const [createModalData, setCreateModalData] = useState<any>(null);

  const { data: schedule, isLoading } = useQuery({
    queryKey: ['reception-schedule', date, cnes],
    queryFn: () => getReceptionSchedule(date, cnes, token!),
    enabled: !!token,
  });

  React.useEffect(() => {
    if (selectedSpecialty && schedule && schedule[selectedSpecialty]) {
      const patients = schedule[selectedSpecialty];
      const times = Array.from(new Set(patients.map((p:any) => p.hrMarcacao || 'Sem horário'))).sort() as string[];
      if (times.length > 0 && (!activeTimeSlot || !times.includes(activeTimeSlot))) {
        setActiveTimeSlot(times[0]);
      }
    }
  }, [selectedSpecialty, schedule]);

  // We no longer auto-select a specialty to allow the user to see the grid

  const enqueueMutation = useMutation({
    mutationFn: async (vars: { patientId: string, spec: string, esusId: string, esusData: any }) => {
      await enqueuePatient(vars.patientId, vars.spec, date, vars.esusId, vars.esusData, token!);
    },
    onSuccess: () => {
      toast.success('Paciente adicionado à fila!');
      queryClient.invalidateQueries({ queryKey: ['reception-schedule'] });
    },
    onError: () => toast.error('Erro ao adicionar paciente à fila.')
  });

  const renderPatient = (p: any, idx: number, specialty: string) => (
    <div key={p.coSolicitacao || idx} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-sm font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
            {p.hrMarcacao}
          </span>
          <h3 className="text-base font-medium text-slate-800 dark:text-slate-200">
            {p.pacienteNome}
          </h3>
          {p.isRegistered ? (
            <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full">
              Cadastrado
            </span>
          ) : (
            <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full">
              Novo
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400 mt-2">
          <span>CPF: {p.pacienteNuCpf || 'N/A'}</span>
          <span>CNS: {p.pacienteNuCns || 'N/A'}</span>
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/> {p.pacienteNoMunicipioResidencia || 'Desconhecido'}</span>
        </div>
      </div>
      
      <div>
        {p.isRegistered ? (
          p.isQueued ? (
            <div className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-sm font-medium rounded-md flex items-center gap-2">
              <ListOrdered className="w-4 h-4" />
              Na Fila
            </div>
          ) : (
            <button 
              onClick={() => enqueueMutation.mutate({ patientId: p.patientId, spec: specialty, esusId: p.coSolicitacao, esusData: p })}
              disabled={enqueueMutation.isPending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2 shadow-sm shadow-blue-500/20"
            >
              <ListOrdered className="w-4 h-4" />
              Colocar na Fila
            </button>
          )
        ) : (
          <button 
            onClick={() => setCreateModalData({ patient: p, specialty })}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2 shadow-sm shadow-amber-500/20"
          >
            <UserPlus className="w-4 h-4" />
            Criar Prontuário
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-500" />
            Recepção e Fila (e-SUS)
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Gerencie os atendimentos agendados via Central de Regulação.
          </p>
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
      ) : schedule && Object.keys(schedule).length > 0 ? (
        !selectedSpecialty ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(schedule).map(([specialty, patients]: [string, any]) => (
              <button 
                key={specialty}
                onClick={() => setSelectedSpecialty(specialty)}
                className="flex flex-col p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-blue-300 transition-all text-left group"
              >
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {specialty}
                </h3>
                <div className="flex items-center gap-2 mt-4 text-slate-500 dark:text-slate-400">
                  <Users className="w-4 h-4" />
                  <span className="font-medium">{patients.length} pacientes</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSelectedSpecialty(null)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-500 dark:text-slate-400"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedSpecialty}</h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
                  {schedule[selectedSpecialty]?.length} pacientes agendados
                </p>
              </div>
              <button
                onClick={() => navigate(`/reception/queue?specialty=${encodeURIComponent(selectedSpecialty)}&date=${date}`)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 font-bold rounded-lg transition-colors shadow-sm"
              >
                <ListOrdered className="w-5 h-5" />
                <span>Ver Lista de Espera</span>
              </button>
            </div>

            <div className="w-full overflow-x-auto pb-2">
              {(() => {
                const patients = schedule[selectedSpecialty] || [];
                const groupedByTime: Record<string, any[]> = {};
                patients.forEach((p: any) => {
                  const time = p.hrMarcacao || 'Sem horário';
                  if (!groupedByTime[time]) groupedByTime[time] = [];
                  groupedByTime[time].push(p);
                });
                
                const times = Object.keys(groupedByTime).sort();
                
                return (
                  <div className="p-1.5 bg-slate-200/70 dark:bg-slate-800/80 rounded-xl inline-flex flex-nowrap min-w-max w-auto shadow-inner border border-slate-300/50 dark:border-slate-700/50">
                    {times.map(time => {
                      const isActive = activeTimeSlot === time;
                      return (
                        <button
                          key={time}
                          onClick={() => setActiveTimeSlot(time)}
                          className={`flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all duration-300 ${isActive ? 'bg-white dark:bg-slate-900 text-[#003B77] dark:text-blue-400 shadow-md transform scale-[1.02]' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-300/30 dark:hover:bg-slate-700/30'}`}
                        >
                          <Clock className={`w-4 h-4 ${isActive ? 'animate-pulse' : ''}`} />
                          {time}
                          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${isActive ? 'bg-blue-100 text-[#003B77] dark:bg-blue-900 dark:text-blue-300' : 'bg-slate-300/50 dark:bg-slate-700 text-slate-500'}`}>
                            {groupedByTime[time].length}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                );
              })()}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50 px-2 sm:px-6">
                {(() => {
                  const patients = schedule[selectedSpecialty] || [];
                  const groupedByTime: Record<string, any[]> = {};
                  patients.forEach((p: any) => {
                    const time = p.hrMarcacao || 'Sem horário';
                    if (!groupedByTime[time]) groupedByTime[time] = [];
                    groupedByTime[time].push(p);
                  });
                  
                  const activePatients = activeTimeSlot && groupedByTime[activeTimeSlot] ? groupedByTime[activeTimeSlot] : [];
                  
                  return activePatients.length > 0 ? (
                    activePatients.map((p: any, idx: number) => renderPatient(p, idx, selectedSpecialty))
                  ) : (
                    <div className="p-12 text-center flex flex-col items-center justify-center">
                      <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
                      <p className="text-slate-500 dark:text-slate-400 font-medium">Nenhum paciente neste horário.</p>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-12 text-center border border-slate-200 dark:border-slate-700 shadow-sm">
          <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">Nenhum agendamento</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Não foram encontrados agendamentos no e-SUS Regulação para a data selecionada.
          </p>
        </div>
      )}

      {createModalData && (
        <CreatePatientModal 
          data={createModalData} 
          onClose={() => setCreateModalData(null)}
          onSuccess={() => {
            setCreateModalData(null);
            queryClient.invalidateQueries({ queryKey: ['reception-schedule'] });
          }}
        />
      )}
    </div>
  );
};
