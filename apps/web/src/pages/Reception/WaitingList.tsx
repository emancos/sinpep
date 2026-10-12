import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Clock, 
  User, 
  Activity, 
  ListOrdered, 
  ArrowLeft, 
  Loader2, 
  Calendar, 
  Star, 
  Stethoscope, 
  CheckCircle2, 
  DoorOpen, 
  MapPin, 
  Layers 
} from 'lucide-react';
import { getReceptionSchedule } from '../../services/reception';
import { getRoomAllocations } from '../../services/rooms';
import { useAuthStore } from '../../store/useAuthStore';
import { useCurrentDoctor } from '../../hooks/useDoctors';
import { isProcedureAuthorizedForDoctor } from '../../utils/doctorProcedures';
import { PriorityRuleSelector } from './PriorityRuleSelector';
import { useSocket } from '../../contexts/SocketContext';

export const WaitingList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const specialtyParam = searchParams.get('specialty');
  const timeParam = searchParams.get('time');
  const [date, setDate] = useState(() => searchParams.get('date') || new Date().toISOString().split('T')[0]);

  const queryClient = useQueryClient();
  const { socket } = useSocket();

  const { data: currentDoctor, isLoading: isLoadingDoctor } = useCurrentDoctor();
  const isDoctor = Boolean(currentDoctor?.id);

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

  const { data: schedule, isLoading: isLoadingSchedule } = useQuery({
    queryKey: ['reception-schedule', date, cnes],
    queryFn: () => getReceptionSchedule(date, cnes, token!),
    enabled: !!token,
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
  });

  // Busca alocações de salas para exibir no topo da lista de espera
  const { data: allAllocations = [] } = useQuery({
    queryKey: ['all-room-allocations', date],
    queryFn: () => getRoomAllocations(date, token!),
    enabled: !!token,
  });

  // Atualização em tempo real (ao vivo) via WebSocket
  useEffect(() => {
    if (!socket) return;

    const handleQueueUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['reception-schedule'] });
    };

    const handleRoomsUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['all-room-allocations'] });
    };

    socket.on('queue_updated', handleQueueUpdated);
    socket.on('room_allocated', handleRoomsUpdated);
    socket.on('room_deallocated', handleRoomsUpdated);

    return () => {
      socket.off('queue_updated', handleQueueUpdated);
      socket.off('room_allocated', handleRoomsUpdated);
      socket.off('room_deallocated', handleRoomsUpdated);
    };
  }, [socket, queryClient]);

  const currentAllocation = useMemo(() => {
    if (!specialtyParam || !allAllocations) return null;
    return (
      allAllocations.find(
        (a) => a.specialtyName?.trim().toUpperCase() === specialtyParam?.trim().toUpperCase()
      ) || null
    );
  }, [specialtyParam, allAllocations]);

  const isLoading = isLoadingSchedule || isLoadingDoctor;

  const waitingPatients = Object.entries(schedule || {})
    .filter(([specialty]) => {
      if (specialtyParam && specialty !== specialtyParam) return false;
      // Se for médico, filtra para exibir exclusivamente pacientes de seus procedimentos autorizados
      if (isDoctor && !isProcedureAuthorizedForDoctor(specialty, currentDoctor)) return false;
      return true;
    })
    .flatMap(([specialty, patients]) => 
      (patients as any[])
        .filter((p: any) => p.isQueued)
        .map((p: any) => ({ ...p, specialty }))
    )
    .sort((a, b) => {
      // 1. Horário marcado primeiro (ex: 11hs antes de 15hs)
      const timeA = a.hrMarcacao || '23:59';
      const timeB = b.hrMarcacao || '23:59';
      if (timeA !== timeB) return timeA.localeCompare(timeB);

      // 2. Status: AGUARDANDO primeiro, depois ATENDIDO
      if (a.queueStatus === 'AGUARDANDO' && b.queueStatus !== 'AGUARDANDO') return -1;
      if (a.queueStatus !== 'AGUARDANDO' && b.queueStatus === 'AGUARDANDO') return 1;

      // 3. Ordem de atendimento ascendente dentro de seu respectivo horário
      const orderA = a.attendanceOrder ?? a.queueOrder ?? 9999;
      const orderB = b.attendanceOrder ?? b.queueOrder ?? 9999;
      if (orderA !== orderB) return orderA - orderB;

      return (a.pacienteNome || '').localeCompare(b.pacienteNome || '');
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

      {/* Banner de Identificação do Ambulatório / Sala Ativa */}
      {currentAllocation?.room && (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 via-white to-slate-50 dark:from-slate-800/90 dark:via-slate-800/60 dark:to-slate-800/40 border border-blue-200/80 dark:border-blue-900/40 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
              <DoorOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-extrabold text-blue-600 dark:text-blue-400">
                  Ambulatório em Atendimento
                </span>
                <span className="px-2 py-0.5 rounded-md text-xs font-black bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
                  Sala {currentAllocation.room.number}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {currentAllocation.room.name}
              </h3>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {currentAllocation.room.sector && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>Setor: <strong>{currentAllocation.room.sector}</strong></span>
                  </span>
                )}
                {currentAllocation.room.floor && (
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3 text-slate-400" />
                    <span>Andar: <strong>{currentAllocation.room.floor}</strong></span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : waitingPatients.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-12 text-center border border-slate-200 dark:border-slate-700 shadow-sm">
          <Clock className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">Nenhum paciente na fila</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {isDoctor 
              ? 'Nenhum paciente aguardando atendimento para seus procedimentos autorizados no momento.'
              : 'Todos os pacientes de hoje já foram atendidos ou nenhum foi enfileirado ainda.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {waitingPatients.map((p, idx) => {
            const isAttended = p.queueStatus === 'ATENDIDO';
            return (
              <div
                key={p.queueId || p.coSolicitacao || idx}
                className={`rounded-2xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group flex flex-col justify-between ${
                  isAttended
                    ? 'bg-emerald-50/75 dark:bg-emerald-950/20 border-2 border-emerald-400/80 dark:border-emerald-800/80 shadow-emerald-500/10'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {/* Barra lateral destacando atendimento finalizado (verde), prioridade ou convencional */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                    isAttended
                      ? 'bg-emerald-500'
                      : p.priority === 'PRIORITARIO'
                      ? 'bg-amber-500'
                      : 'bg-blue-600'
                  }`}
                />
                
                <div>
                  {/* Header do Card: Ordem de Atendimento & Status */}
                  <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 shadow-sm tracking-wide ${
                        isAttended ? 'bg-emerald-600 text-white' : 'bg-[#0051A2] text-white'
                      }`}
                    >
                      {isAttended ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Atendimento Concluído</span>
                        </>
                      ) : (
                        <>
                          <ListOrdered className="w-3.5 h-3.5" />
                          <span>
                            {p.attendanceOrder || p.queueOrder ? `${p.attendanceOrder || p.queueOrder}º a ser atendido` : 'Na Fila'}
                          </span>
                        </>
                      )}
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
                          isAttended
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/50 dark:border-emerald-700 dark:text-emerald-300'
                            : p.queueStatus === 'AGUARDANDO'
                            ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800/50'
                            : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800/50'
                        }`}
                      >
                        {isAttended ? 'ATENDIDO' : p.queueStatus || 'NA FILA'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Horário Marcado: <strong className="text-slate-700 dark:text-slate-300">{p.hrMarcacao || 'Sem horário'}</strong></span>
                  </div>

                  {/* Posição de atendimento e nome do paciente */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5 flex-1 min-w-[140px] truncate">
                      <span
                        className={`shrink-0 px-2.5 py-1 text-white font-black text-xs sm:text-sm rounded-lg shadow-sm flex items-center gap-1 ${
                          isAttended ? 'bg-emerald-600' : 'bg-[#0051A2]'
                        }`}
                      >
                        {isAttended ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Atendido</span>
                          </>
                        ) : (
                          <>
                            <ListOrdered className="w-3.5 h-3.5" />
                            <span>{p.attendanceOrder || p.queueOrder ? `${p.attendanceOrder || p.queueOrder}º` : 'Fila'}</span>
                          </>
                        )}
                      </span>

                      <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 truncate" title={p.pacienteNome}>
                        {p.pacienteNome}
                      </h3>
                    </div>

                    {/* Botão de atendimento: exibido exclusivamente para o médico e OCULTO se já atendido */}
                    {isDoctor && p.patientId && !isAttended && (
                      <button
                        onClick={() => navigate(`/medical-records/${p.patientId}/new`)}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-all"
                        title="Iniciar Atendimento Clínico"
                      >
                        <Stethoscope className="w-3.5 h-3.5" />
                        <span>Iniciar Atendimento</span>
                      </button>
                    )}
                  </div>
                  
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
            );
          })}
        </div>
      )}
    </div>
  );
};
