import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getReceptionSchedule, enqueuePatient } from '../../services/reception';
import { useAuthStore } from '../../store/useAuthStore';
import { useCurrentDoctor } from '../../hooks/useDoctors';
import { 
  isProcedureAuthorizedForDoctor, 
  getDoctorAuthorizedProceduresCount, 
  getDoctorAuthorizedProcedureNames 
} from '../../utils/doctorProcedures';
import { 
  Loader2, 
  Calendar, 
  UserPlus, 
  ListOrdered, 
  Activity, 
  MapPin, 
  ChevronLeft, 
  Clock, 
  Users, 
  Star,
  Stethoscope
} from 'lucide-react';
import { toast } from 'sonner';
import { CreatePatientModal } from './CreatePatientModal';
import { EnqueuePriorityModal } from './EnqueuePriorityModal';
import { PriorityRuleSelector } from './PriorityRuleSelector';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const Reception: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [date, setDate] = useState(() => searchParams.get('date') || new Date().toISOString().split('T')[0]);
  
  const token = useAuthStore(state => state.token);
  const cnes = '2606712'; // Fallback
  
  const queryClient = useQueryClient();

  // Dados do médico autenticado (se o usuário logado for um médico)
  const { data: currentDoctor, isLoading: isLoadingDoctor } = useCurrentDoctor();
  const isDoctor = Boolean(currentDoctor?.id);

  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(() => searchParams.get('specialty') || null);
  const [activeTimeSlot, setActiveTimeSlot] = useState<string | null>(() => searchParams.get('time') || null);
  const [createModalData, setCreateModalData] = useState<any>(null);
  const [enqueueModalData, setEnqueueModalData] = useState<{ patient: any; specialty: string } | null>(null);

  useEffect(() => {
    const currentUrlDate = searchParams.get('date');
    if (date && date !== currentUrlDate) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('date', date);
      setSearchParams(newParams, { replace: true });
    }
  }, [date, searchParams, setSearchParams]);

  useEffect(() => {
    const urlDate = searchParams.get('date');
    if (urlDate && urlDate !== date) {
      setDate(urlDate);
    }
  }, [searchParams]);

  useEffect(() => {
    const urlSpecialty = searchParams.get('specialty');
    if (urlSpecialty !== selectedSpecialty) {
      setSelectedSpecialty(urlSpecialty || null);
    }
  }, [searchParams]);

  const { data: schedule, isLoading: isLoadingSchedule } = useQuery({
    queryKey: ['reception-schedule', date, cnes],
    queryFn: () => getReceptionSchedule(date, cnes, token!),
    enabled: !!token,
  });

  const isLoading = isLoadingSchedule || isLoadingDoctor;

  // Filtra as especialidades/procedimentos autorizados para o médico
  const authorizedScheduleEntries = useMemo(() => {
    if (!schedule) return [];
    const entries = Object.entries(schedule);
    if (!isDoctor) return entries;
    return entries.filter(([spec]) => isProcedureAuthorizedForDoctor(spec, currentDoctor));
  }, [schedule, isDoctor, currentDoctor]);

  // Total de procedimentos configurados no cadastro do médico
  const totalDoctorProceduresConfigured = useMemo(() => {
    return getDoctorAuthorizedProceduresCount(currentDoctor);
  }, [currentDoctor]);

  // Se o médico tem apenas um procedimento autorizado (no perfil ou no agendamento)
  const hasSingleAuthorizedProcedure = useMemo(() => {
    if (!isDoctor) return false;
    return totalDoctorProceduresConfigured === 1 || authorizedScheduleEntries.length === 1;
  }, [isDoctor, totalDoctorProceduresConfigured, authorizedScheduleEntries]);

  // Nome do procedimento único autorizado
  const singleAuthorizedProcedureName = useMemo(() => {
    if (!hasSingleAuthorizedProcedure) return null;
    if (authorizedScheduleEntries.length === 1) return authorizedScheduleEntries[0][0];
    const procNames = getDoctorAuthorizedProcedureNames(currentDoctor);
    if (procNames.length === 1) return procNames[0];
    return currentDoctor?.doctorSpecialties?.[0]?.specialty?.name || null;
  }, [hasSingleAuthorizedProcedure, authorizedScheduleEntries, currentDoctor]);

  // Se o médico tem apenas um procedimento autorizado, seleciona automaticamente e exibe a fila
  useEffect(() => {
    if (hasSingleAuthorizedProcedure && singleAuthorizedProcedureName) {
      if (selectedSpecialty !== singleAuthorizedProcedureName) {
        setSelectedSpecialty(singleAuthorizedProcedureName);
        const newParams = new URLSearchParams(searchParams);
        newParams.set('specialty', singleAuthorizedProcedureName);
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [hasSingleAuthorizedProcedure, singleAuthorizedProcedureName, selectedSpecialty, searchParams, setSearchParams]);

  const handleSelectSpecialty = (specialty: string) => {
    setSelectedSpecialty(specialty);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('specialty', specialty);
    newParams.delete('time');
    setSearchParams(newParams);
  };

  const handleBackToSpecialties = () => {
    setSelectedSpecialty(null);
    setActiveTimeSlot(null);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('specialty');
    newParams.delete('time');
    setSearchParams(newParams);
  };

  const handleSelectTimeSlot = (time: string) => {
    setActiveTimeSlot(time);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('time', time);
    setSearchParams(newParams, { replace: true });
  };

  // Pacientes do procedimento selecionado
  // O médico verá EXCLUSIVAMENTE pacientes que já estão na fila (p.isQueued === true)
  const allPatientsInSpecialty = useMemo(() => {
    return (selectedSpecialty && schedule && schedule[selectedSpecialty]) || [];
  }, [selectedSpecialty, schedule]);

  const relevantPatientsInSpecialty = useMemo(() => {
    if (!isDoctor) return allPatientsInSpecialty;
    return allPatientsInSpecialty.filter((p: any) => p.isQueued);
  }, [allPatientsInSpecialty, isDoctor]);

  // Horários disponíveis com base nos pacientes relevantes
  useEffect(() => {
    if (selectedSpecialty && relevantPatientsInSpecialty.length > 0) {
      const times = Array.from(new Set(relevantPatientsInSpecialty.map((p: any) => p.hrMarcacao || 'Sem horário'))).sort() as string[];
      if (times.length > 0) {
        const urlTime = searchParams.get('time');
        if (urlTime && times.includes(urlTime)) {
          setActiveTimeSlot(urlTime);
        } else if (!activeTimeSlot || !times.includes(activeTimeSlot)) {
          setActiveTimeSlot(times[0]);
        }
      }
    } else {
      setActiveTimeSlot(null);
    }
  }, [selectedSpecialty, relevantPatientsInSpecialty, searchParams]);

  const enqueueMutation = useMutation({
    mutationFn: async (vars: {
      patientId: string;
      spec: string;
      esusId: string;
      esusData: any;
      priority: 'PRIORITARIO' | 'CONVENCIONAL';
    }) => {
      await enqueuePatient(vars.patientId, vars.spec, date, vars.esusId, vars.esusData, token!, vars.priority);
    },
    onSuccess: () => {
      toast.success('Paciente adicionado à fila!');
      setEnqueueModalData(null);
      queryClient.invalidateQueries({ queryKey: ['reception-schedule'] });
    },
    onError: () => toast.error('Erro ao adicionar paciente à fila.')
  });

  const renderPatient = (p: any, idx: number, specialty: string) => (
    <div key={p.coSolicitacao || idx} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-3 mb-1">
          <span className="text-sm font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
            {p.hrMarcacao}
          </span>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            {p.pacienteNome}
          </h3>

          {/* Atalho de atendimento à frente do nome do paciente - EXCLUSIVO PARA O MÉDICO */}
          {isDoctor && p.patientId && (
            <button
              onClick={() => navigate(`/medical-records/${p.patientId}/new`)}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-all"
              title="Iniciar Atendimento Clínico"
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Iniciar Atendimento</span>
            </button>
          )}

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
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm">
                <ListOrdered className="w-3.5 h-3.5" />
                {p.attendanceOrder || p.queueOrder ? `${p.attendanceOrder || p.queueOrder}º na Fila` : 'Na Fila'}
              </span>

              {p.priority === 'PRIORITARIO' ? (
                <span className="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 text-xs font-bold rounded-lg flex items-center gap-1 shadow-sm">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  Prioritário
                </span>
              ) : (
                <span className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 text-xs font-medium rounded-lg">
                  Convencional
                </span>
              )}
            </div>
          ) : (
            // Médicos NÃO podem adicionar pacientes à fila
            !isDoctor && (
              <button 
                onClick={() => setEnqueueModalData({ patient: p, specialty })}
                disabled={enqueueMutation.isPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2 shadow-sm shadow-blue-500/20"
              >
                <ListOrdered className="w-4 h-4" />
                Colocar na Fila
              </button>
            )
          )
        ) : (
          // Médicos NÃO criam prontuários a partir da fila da recepção
          !isDoctor && (
            <button 
              onClick={() => setCreateModalData({ patient: p, specialty })}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2 shadow-sm shadow-amber-500/20"
            >
              <UserPlus className="w-4 h-4" />
              Criar Prontuário
            </button>
          )
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
            {isDoctor 
              ? 'Acompanhe a sua fila de atendimentos autorizados.'
              : 'Gerencie os atendimentos agendados via Central de Regulação.'}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor de regra de prioridade disponível apenas para a recepção/administração */}
          {!isDoctor && <PriorityRuleSelector />}
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
      ) : isDoctor && authorizedScheduleEntries.length === 0 && !hasSingleAuthorizedProcedure ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-12 text-center border border-slate-200 dark:border-slate-700 shadow-sm">
          <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">
            Nenhum agendamento para seus procedimentos autorizados
          </h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Não foram encontrados agendamentos no e-SUS para seus procedimentos autorizados na data selecionada.
          </p>
        </div>
      ) : schedule && (Object.keys(schedule).length > 0 || hasSingleAuthorizedProcedure) ? (
        !selectedSpecialty ? (
          /* Visualização em grade: exibe EXCLUSIVAMENTE os procedimentos autorizados do médico (ou todos para recepção) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {authorizedScheduleEntries.map(([specialty, patients]: [string, any]) => {
              const queuedCount = (patients as any[]).filter((p: any) => p.isQueued).length;
              return (
                <button 
                  key={specialty}
                  onClick={() => handleSelectSpecialty(specialty)}
                  className="flex flex-col p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-blue-300 transition-all text-left group"
                >
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {specialty}
                  </h3>
                  <div className="flex items-center gap-2 mt-4 text-slate-500 dark:text-slate-400">
                    <Users className="w-4 h-4" />
                    <span className="font-medium">
                      {isDoctor
                        ? `${queuedCount} na fila (${patients.length} agendados)`
                        : `${patients.length} pacientes`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              {/* O botão voltar só aparece caso o médico tenha mais de 1 procedimento autorizado ou para a recepção */}
              {(!isDoctor || !hasSingleAuthorizedProcedure) && (
                <button 
                  onClick={handleBackToSpecialties}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-500 dark:text-slate-400"
                  title="Voltar para a seleção de procedimentos"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedSpecialty}</h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
                  {isDoctor
                    ? `${relevantPatientsInSpecialty.length} ${relevantPatientsInSpecialty.length === 1 ? 'paciente aguardando na fila' : 'pacientes aguardando na fila'}`
                    : `${allPatientsInSpecialty.length} ${allPatientsInSpecialty.length === 1 ? 'paciente agendado' : 'pacientes agendados'}`}
                </p>
              </div>
              <button
                onClick={() => {
                  const params = new URLSearchParams();
                  if (selectedSpecialty) params.set('specialty', selectedSpecialty);
                  if (date) params.set('date', date);
                  if (activeTimeSlot) params.set('time', activeTimeSlot);
                  navigate(`/reception/queue?${params.toString()}`);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 font-bold rounded-lg transition-colors shadow-sm"
              >
                <ListOrdered className="w-5 h-5" />
                <span>Ver Lista de Espera</span>
              </button>
            </div>

            {/* Abas de horários */}
            {relevantPatientsInSpecialty.length > 0 && (
              <div className="w-full overflow-x-auto pb-2">
                {(() => {
                  const groupedByTime: Record<string, any[]> = {};
                  relevantPatientsInSpecialty.forEach((p: any) => {
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
                            onClick={() => handleSelectTimeSlot(time)}
                            className={`flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all duration-300 ${isActive ? 'bg-white dark:bg-slate-900 text-[#003B77] dark:text-blue-400 shadow-md transform scale-[1.02]' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-300/30 dark:hover:bg-slate-700/30'}`}
                          >
                            <Clock className={`w-4 h-4 ${isActive ? 'animate-pulse' : ''}`} />
                            {time}
                            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${isActive ? 'bg-blue-100 text-[#003B77] dark:bg-blue-900 dark:text-blue-300' : 'bg-slate-300/50 dark:bg-slate-700 text-slate-500'}`}>
                              {groupedByTime[time].length}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Lista de pacientes */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50 px-2 sm:px-6">
                {(() => {
                  if (relevantPatientsInSpecialty.length === 0) {
                    return (
                      <div className="p-12 text-center flex flex-col items-center justify-center">
                        <Clock className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
                        <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
                          {isDoctor ? 'Nenhum paciente aguardando atendimento' : 'Nenhum paciente agendado'}
                        </h4>
                        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">
                          {isDoctor 
                            ? 'Não há pacientes adicionados à fila de espera para este procedimento no momento.'
                            : 'Não foram encontrados pacientes neste procedimento.'}
                        </p>
                      </div>
                    );
                  }

                  const groupedByTime: Record<string, any[]> = {};
                  relevantPatientsInSpecialty.forEach((p: any) => {
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

      {enqueueModalData && (
        <EnqueuePriorityModal
          patient={enqueueModalData.patient}
          specialty={enqueueModalData.specialty}
          onClose={() => setEnqueueModalData(null)}
          isPending={enqueueMutation.isPending}
          onConfirm={(priority) => {
            enqueueMutation.mutate({
              patientId: enqueueModalData.patient.patientId,
              spec: enqueueModalData.specialty,
              esusId: enqueueModalData.patient.coSolicitacao,
              esusData: enqueueModalData.patient,
              priority,
            });
          }}
        />
      )}
    </div>
  );
};
