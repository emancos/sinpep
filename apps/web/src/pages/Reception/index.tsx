import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getReceptionSchedule, enqueuePatient } from '../../services/reception';
import { getRoomAllocations, deallocateRoom, type RoomAllocation } from '../../services/rooms';
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
  Stethoscope, 
  CheckCircle2, 
  DoorOpen, 
  ArrowLeftRight, 
  LogOut, 
  AlertCircle, 
  Layers 
} from 'lucide-react';
import { toast } from 'sonner';
import { CreatePatientModal } from './CreatePatientModal';
import { EnqueuePriorityModal } from './EnqueuePriorityModal';
import { PriorityRuleSelector } from './PriorityRuleSelector';
import { SelectRoomModal } from './SelectRoomModal';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';

export const Reception: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [date, setDate] = useState(() => searchParams.get('date') || new Date().toISOString().split('T')[0]);
  
  const token = useAuthStore(state => state.token);
  const cnes = '2606712'; // Fallback
  
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  // Dados do médico autenticado (se o usuário logado for um médico)
  const { data: currentDoctor, isLoading: isLoadingDoctor } = useCurrentDoctor();
  const isDoctor = Boolean(currentDoctor?.id);

  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(() => searchParams.get('specialty') || null);
  const [activeTimeSlot, setActiveTimeSlot] = useState<string>(() => searchParams.get('time') || 'ALL');
  const [createModalData, setCreateModalData] = useState<any>(null);
  const [enqueueModalData, setEnqueueModalData] = useState<{ patient: any; specialty: string } | null>(null);
  
  // Controle do modal de vinculação/troca de ambulatório
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isMandatoryRoomModal, setIsMandatoryRoomModal] = useState(false);

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

  useEffect(() => {
    const urlTime = searchParams.get('time');
    if (urlTime && urlTime !== activeTimeSlot) {
      setActiveTimeSlot(urlTime);
    } else if (!urlTime && activeTimeSlot !== 'ALL') {
      setActiveTimeSlot('ALL');
    }
  }, [searchParams]);

  const { data: schedule, isLoading: isLoadingSchedule } = useQuery({
    queryKey: ['reception-schedule', date, cnes],
    queryFn: () => getReceptionSchedule(date, cnes, token!),
    enabled: !!token,
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
  });

  // Busca as alocações de salas/ambulatórios na data
  const { data: allAllocations = [], isLoading: isLoadingAllocations } = useQuery({
    queryKey: ['all-room-allocations', date],
    queryFn: () => getRoomAllocations(date, token!),
    enabled: !!token,
  });

  // Atualização automática em tempo real (ao vivo) via WebSocket quando a fila ou ambulatórios mudarem
  useEffect(() => {
    if (!socket) return;

    const handleQueueUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['reception-schedule'] });
    };

    const handleRoomsUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['all-room-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['rooms-with-occupancy'] });
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

  // Alocação da sala/ambulatório para a especialidade atualmente selecionada
  const currentRoomAllocation = useMemo<RoomAllocation | null>(() => {
    if (!selectedSpecialty || !allAllocations) return null;
    return (
      allAllocations.find(
        (a) => a.specialtyName?.trim().toUpperCase() === selectedSpecialty?.trim().toUpperCase()
      ) || null
    );
  }, [selectedSpecialty, allAllocations]);

  // Mapa de alocações por especialidade para exibição rápida nos cards
  const roomAllocationsMap = useMemo(() => {
    const map: Record<string, RoomAllocation> = {};
    if (allAllocations) {
      allAllocations.forEach((alloc) => {
        if (alloc.specialtyName) {
          map[alloc.specialtyName.trim().toUpperCase()] = alloc;
        }
      });
    }
    return map;
  }, [allAllocations]);

  // Desocupar ambulatório
  const deallocateMutation = useMutation({
    mutationFn: (specialtyName: string) => deallocateRoom({ specialtyName, date }, token!),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['all-room-allocations', date] });
      queryClient.invalidateQueries({ queryKey: ['rooms-with-occupancy', date] });
      toast.success(res.message || 'Ambulatório desocupado com sucesso!');
      // Conforme regra: se desocupou, é necessário vincular outro para prosseguir
      setIsMandatoryRoomModal(true);
      setIsRoomModalOpen(true);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erro ao desocupar ambulatório.');
    },
  });

  const isLoading = isLoadingSchedule || isLoadingDoctor || isLoadingAllocations;

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

  // Regra 4: Sempre que uma especialidade não esteja vinculada a um ambulatório, a vinculação é obrigatória para o recepcionista
  useEffect(() => {
    if (
      !isDoctor &&
      selectedSpecialty &&
      !isLoadingAllocations &&
      !currentRoomAllocation &&
      !isRoomModalOpen
    ) {
      setIsMandatoryRoomModal(true);
      setIsRoomModalOpen(true);
    }
  }, [isDoctor, selectedSpecialty, isLoadingAllocations, currentRoomAllocation, isRoomModalOpen]);

  const handleSelectSpecialty = (specialty: string) => {
    setSelectedSpecialty(specialty);
    setActiveTimeSlot('ALL');
    const newParams = new URLSearchParams(searchParams);
    newParams.set('specialty', specialty);
    newParams.delete('time');
    setSearchParams(newParams);

    // Se o recepcionista selecionou uma especialidade e ela ainda não tem ambulatório hoje, abre o modal obrigatório
    const alloc = roomAllocationsMap[specialty.trim().toUpperCase()];
    if (!isDoctor && !alloc) {
      setIsMandatoryRoomModal(true);
      setIsRoomModalOpen(true);
    }
  };

  const handleBackToSpecialties = () => {
    setSelectedSpecialty(null);
    setActiveTimeSlot('ALL');
    setIsRoomModalOpen(false);
    setIsMandatoryRoomModal(false);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('specialty');
    newParams.delete('time');
    setSearchParams(newParams);
  };

  const handleCloseRoomModal = () => {
    // Se o modal for obrigatório e a especialidade ainda não tiver sala vinculada,
    // ao cancelar, retorna o usuário para a lista de especialidades para evitar estado inconsistente
    if (isMandatoryRoomModal && !currentRoomAllocation) {
      toast.info('Para iniciar e visualizar a fila de atendimentos, é obrigatório vincular um ambulatório.');
      handleBackToSpecialties();
    } else {
      setIsRoomModalOpen(false);
      setIsMandatoryRoomModal(false);
    }
  };

  const handleSelectTimeSlot = (time: string) => {
    setActiveTimeSlot(time);
    const newParams = new URLSearchParams(searchParams);
    if (time === 'ALL') {
      newParams.delete('time');
    } else {
      newParams.set('time', time);
    }
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

  // Ordena a lista de pacientes: primeiro pelo Horário Marcado (ex: 11h antes de 15h)
  // e dentro de cada horário pela ORDEM DE ATENDIMENTO (1º, 2º, 3º...)
  const sortedPatientsInSpecialty = useMemo(() => {
    return [...relevantPatientsInSpecialty].sort((a: any, b: any) => {
      // 1. Horário marcado (11hs antes de 15hs)
      const timeA = a.hrMarcacao || '23:59';
      const timeB = b.hrMarcacao || '23:59';
      if (timeA !== timeB) return timeA.localeCompare(timeB);

      // 2. Pacientes enfileirados primeiro dentro do mesmo horário
      if (a.isQueued && !b.isQueued) return -1;
      if (!a.isQueued && b.isQueued) return 1;

      // 3. Status: AGUARDANDO primeiro, ATENDIDO depois
      if (a.queueStatus === 'AGUARDANDO' && b.queueStatus !== 'AGUARDANDO') return -1;
      if (a.queueStatus !== 'AGUARDANDO' && b.queueStatus === 'AGUARDANDO') return 1;

      // 4. Ordem de atendimento calculada individualmente para o horário (1º, 2º, 3º...)
      const orderA = a.attendanceOrder ?? a.queueOrder ?? 9999;
      const orderB = b.attendanceOrder ?? b.queueOrder ?? 9999;
      if (orderA !== orderB) return orderA - orderB;

      // 5. Nome do paciente para estabilidade de ordenação
      return (a.pacienteNome || '').localeCompare(b.pacienteNome || '');
    });
  }, [relevantPatientsInSpecialty]);

  // Agrupamento por horários preservando a ordem de atendimento
  const { groupedByTime, availableTimes } = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    sortedPatientsInSpecialty.forEach((p: any) => {
      const time = p.hrMarcacao || 'Sem horário';
      if (!grouped[time]) grouped[time] = [];
      grouped[time].push(p);
    });
    return {
      groupedByTime: grouped,
      availableTimes: Object.keys(grouped).sort(),
    };
  }, [sortedPatientsInSpecialty]);

  // Pacientes a serem exibidos com base no filtro de horário selecionado (ou todos)
  const displayedPatients = useMemo(() => {
    if (!activeTimeSlot || activeTimeSlot === 'ALL') {
      return sortedPatientsInSpecialty;
    }
    return sortedPatientsInSpecialty.filter((p: any) => (p.hrMarcacao || 'Sem horário') === activeTimeSlot);
  }, [activeTimeSlot, sortedPatientsInSpecialty]);

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

  const renderPatient = (p: any, idx: number, specialty: string) => {
    const isAttended = p.queueStatus === 'ATENDIDO';
    return (
      <div 
        key={p.coSolicitacao || idx} 
        className={`py-4 px-3 sm:px-4 pl-5 sm:pl-6 rounded-xl my-2 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all relative overflow-hidden group shadow-sm ${
          isAttended
            ? 'bg-emerald-50/75 dark:bg-emerald-950/20 border-2 border-emerald-400/80 dark:border-emerald-800/80 shadow-emerald-500/10'
            : 'bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md'
        }`}
      >
        {/* Detalhe da borda esquerda (barra vertical arredondada) */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors ${
            isAttended
              ? 'bg-emerald-500'
              : p.isQueued
              ? (p.priority === 'PRIORITARIO' ? 'bg-amber-500' : 'bg-blue-600')
              : 'bg-blue-600'
          }`}
        />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
            {/* Posição de atendimento em destaque ANTES do nome do paciente */}
            {p.isQueued && (
              <span
                className={`shrink-0 px-2.5 py-1 text-white font-black text-xs sm:text-sm rounded-lg shadow-sm flex items-center gap-1 tracking-wide ${
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
                    <span>{p.attendanceOrder || p.queueOrder ? `${p.attendanceOrder || p.queueOrder}º` : 'Na Fila'}</span>
                  </>
                )}
              </span>
            )}

            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700/80 px-2.5 py-1 rounded-md">
              {p.hrMarcacao || 'Sem horário'}
            </span>

            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {p.pacienteNome}
            </h3>

            {/* Atalho de atendimento à frente do nome do paciente - EXCLUSIVO PARA O MÉDICO (OCULTO SE ATENDIDO) */}
            {isDoctor && p.patientId && !isAttended && (
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

                <span
                  className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-lg border ${
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
  };

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
              ? 'Acompanhe a sua fila de atendimentos ordenados pela ordem de prioridade.'
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
              const specAllocation = roomAllocationsMap[specialty.trim().toUpperCase()];

              return (
                <button 
                  key={specialty}
                  onClick={() => handleSelectSpecialty(specialty)}
                  className="flex flex-col justify-between p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-blue-300 transition-all text-left group min-h-[140px]"
                >
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {specialty}
                    </h3>

                    {/* Badge do Ambulatório / Sala Alocada no Dia */}
                    <div className="mt-3">
                      {specAllocation?.room ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          <DoorOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>Sala {specAllocation.room.number} • {specAllocation.room.name}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                          <span>Ambulatório pendente</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-5 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-slate-500 dark:text-slate-400">
                    <Users className="w-4 h-4" />
                    <span className="font-medium text-xs">
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
                  if (activeTimeSlot && activeTimeSlot !== 'ALL') params.set('time', activeTimeSlot);
                  navigate(`/reception/queue?${params.toString()}`);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 font-bold rounded-lg transition-colors shadow-sm"
              >
                <ListOrdered className="w-5 h-5" />
                <span>Ver Lista de Espera</span>
              </button>
            </div>

            {/* Banner em Destaque do Ambulatório Vinculado */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50/90 via-white to-slate-50 dark:from-slate-800/90 dark:via-slate-800/60 dark:to-slate-800/40 border border-blue-200/80 dark:border-blue-900/40 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                  <DoorOpen className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs uppercase tracking-wider font-extrabold text-blue-600 dark:text-blue-400">
                      Ambulatório Vinculado
                    </span>
                    {currentRoomAllocation?.room?.number && (
                      <span className="px-2 py-0.5 rounded-md text-xs font-black bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
                        Sala {currentRoomAllocation.room.number}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    {currentRoomAllocation?.room?.name || 'Nenhum ambulatório vinculado'}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {currentRoomAllocation?.room?.sector && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>Setor: <strong className="text-slate-700 dark:text-slate-300">{currentRoomAllocation.room.sector}</strong></span>
                      </span>
                    )}
                    {currentRoomAllocation?.room?.floor && (
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        <span>Andar: <strong className="text-slate-700 dark:text-slate-300">{currentRoomAllocation.room.floor}</strong></span>
                      </span>
                    )}
                    {!currentRoomAllocation && (
                      <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        É obrigatório vincular uma sala para iniciar os atendimentos
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Ações de Ambulatório (Disponíveis apenas para não-médicos) */}
              {!isDoctor && (
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  {currentRoomAllocation ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setIsMandatoryRoomModal(false);
                          setIsRoomModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 text-xs font-bold rounded-xl shadow-sm transition-all"
                        title="Trocar para outro ambulatório"
                      >
                        <ArrowLeftRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>Alterar Sala</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => deallocateMutation.mutate(selectedSpecialty)}
                        disabled={deallocateMutation.isPending}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50"
                        title="Desocupar e liberar esta sala"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>{deallocateMutation.isPending ? 'Liberando...' : 'Desocupar Sala'}</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMandatoryRoomModal(true);
                        setIsRoomModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                    >
                      <DoorOpen className="w-4 h-4" />
                      <span>Vincular Ambulatório</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Abas de seleção de horário e opção Fila Completa / Todos */}
            {sortedPatientsInSpecialty.length > 0 && (
              <div className="w-full overflow-x-auto pb-2">
                <div className="p-1.5 bg-slate-200/70 dark:bg-slate-800/80 rounded-xl inline-flex flex-nowrap min-w-max w-auto shadow-inner border border-slate-300/50 dark:border-slate-700/50 gap-1">
                  {/* Aba TODOS (Fila Completa ordenada) */}
                  <button
                    onClick={() => handleSelectTimeSlot('ALL')}
                    className={`flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${
                      activeTimeSlot === 'ALL'
                        ? 'bg-white dark:bg-slate-900 text-[#003B77] dark:text-blue-400 shadow-md transform scale-[1.02]'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-300/30 dark:hover:bg-slate-700/30'
                    }`}
                  >
                    <ListOrdered className="w-4 h-4" />
                    <span>Fila Completa</span>
                    <span
                      className={`ml-1.5 px-2 py-0.5 rounded-full text-xs ${
                        activeTimeSlot === 'ALL'
                          ? 'bg-blue-100 text-[#003B77] dark:bg-blue-900 dark:text-blue-300'
                          : 'bg-slate-300/50 dark:bg-slate-700 text-slate-500'
                      }`}
                    >
                      {sortedPatientsInSpecialty.length}
                    </span>
                  </button>

                  {/* Abas individuais por horário */}
                  {availableTimes.map(time => {
                    const isActive = activeTimeSlot === time;
                    return (
                      <button
                        key={time}
                        onClick={() => handleSelectTimeSlot(time)}
                        className={`flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${
                          isActive
                            ? 'bg-white dark:bg-slate-900 text-[#003B77] dark:text-blue-400 shadow-md transform scale-[1.02]'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-300/30 dark:hover:bg-slate-700/30'
                        }`}
                      >
                        <Clock className={`w-4 h-4 ${isActive ? 'animate-pulse' : ''}`} />
                        <span>{time}</span>
                        <span
                          className={`ml-1.5 px-2 py-0.5 rounded-full text-xs ${
                            isActive
                              ? 'bg-blue-100 text-[#003B77] dark:bg-blue-900 dark:text-blue-300'
                              : 'bg-slate-300/50 dark:bg-slate-700 text-slate-500'
                          }`}
                        >
                          {groupedByTime[time]?.length || 0}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Lista de pacientes exibida pela ORDEM DE ATENDIMENTO */}
            <div className="space-y-2.5">
              {displayedPatients.length > 0 ? (
                displayedPatients.map((p: any, idx: number) => renderPatient(p, idx, selectedSpecialty))
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center flex flex-col items-center justify-center">
                  <Clock className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
                  <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    {isDoctor ? 'Nenhum paciente aguardando atendimento' : 'Nenhum paciente agendado'}
                  </h4>
                  <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">
                    {isDoctor 
                      ? 'Não há pacientes adicionados à fila de espera para este horário/procedimento no momento.'
                      : 'Não foram encontrados pacientes neste horário.'}
                  </p>
                </div>
              )}
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

      {selectedSpecialty && (
        <SelectRoomModal
          isOpen={isRoomModalOpen}
          onClose={handleCloseRoomModal}
          specialtyName={selectedSpecialty}
          date={date}
          currentAllocation={currentRoomAllocation}
          isMandatory={isMandatoryRoomModal}
          onSuccess={() => {
            setIsMandatoryRoomModal(false);
            queryClient.invalidateQueries({ queryKey: ['all-room-allocations', date] });
          }}
        />
      )}
    </div>
  );
};
