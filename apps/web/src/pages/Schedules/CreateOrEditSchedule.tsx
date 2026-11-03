import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Calendar,
  Building2,
  Stethoscope,
  Scissors,
  Activity,
  Layers,
  HelpCircle,
  Save,
  ArrowLeft,
  Loader2,
  Info,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useScheduleDependencies,
  useSchedule,
  useCreateSchedule,
  useUpdateSchedule,
} from '../../hooks/useSchedules';
import { useAuthStore } from '../../store/useAuthStore';

const DAYS_OF_WEEK = [
  { id: 'DOMINGO', label: 'DOMINGO' },
  { id: 'SEGUNDA', label: 'SEGUNDA-FEIRA' },
  { id: 'TERCA', label: 'TERÇA-FEIRA' },
  { id: 'QUARTA', label: 'QUARTA-FEIRA' },
  { id: 'QUINTA', label: 'QUINTA-FEIRA' },
  { id: 'SEXTA', label: 'SEXTA-FEIRA' },
  { id: 'SABADO', label: 'SÁBADO' },
];

export const CreateOrEditSchedule: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const user = useAuthStore((state) => state.user);
  const activeProfile = useAuthStore((state) => state.activeProfile);
  const isCoordinator = activeProfile?.name === 'Coordenador de Unidade';

  // Tipo de Escala: CONSULTA | EXAME | PROCEDIMENTO
  const [scheduleType, setScheduleType] = useState<'CONSULTA' | 'EXAME' | 'PROCEDIMENTO'>('CONSULTA');

  // State dos Selects Dependentes
  const [healthCenterId, setHealthCenterId] = useState('');
  const [procedureId, setProcedureId] = useState('');
  const [procedureGroupId, setProcedureGroupId] = useState('');
  const [enabledProcedureIds, setEnabledProcedureIds] = useState<string[]>([]);
  const [doctorId, setDoctorId] = useState('');
  const [cbo, setCbo] = useState('');

  // Vigência & Horários
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Oferta: Dias da Semana
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  // Oferta: Quantidades e Minutos
  const [firstTimeQty, setFirstTimeQty] = useState<number | string>('');
  const [firstTimeMins, setFirstTimeMins] = useState<number | string>('');
  const [returnQty, setReturnQty] = useState<number | string>('');
  const [returnMins, setReturnMins] = useState<number | string>('');
  const [regulatorQty, setRegulatorQty] = useState<number | string>('');
  const [regulatorMins, setRegulatorMins] = useState<number | string>('');

  // Flags
  const [autoSlotSplit, setAutoSlotSplit] = useState(false);
  const [isLocalSchedule, setIsLocalSchedule] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Observações
  const [notes, setNotes] = useState('');

  // Se for Coordenador de Unidade, trava a unidade no seu healthCenterId
  useEffect(() => {
    if (isCoordinator && user?.healthCenterId && !healthCenterId) {
      setHealthCenterId(user.healthCenterId);
    }
  }, [isCoordinator, user?.healthCenterId, healthCenterId]);

  // Consulta das dependências reativas dos 4 selects
  const { data: deps, isLoading: isLoadingDeps } = useScheduleDependencies({
    healthCenterId: healthCenterId || undefined,
    procedureId: procedureId || undefined,
    procedureGroupId: procedureGroupId || undefined,
    doctorId: doctorId || undefined,
    cbo: cbo || undefined,
    scheduleType,
  });

  // Query da escala para edição
  const { data: existingSchedule, isLoading: isLoadingExisting } = useSchedule(id || '');

  // Popula dados ao editar
  useEffect(() => {
    if (existingSchedule && isEditing) {
      setScheduleType((existingSchedule.scheduleType as any) || 'CONSULTA');
      setHealthCenterId(existingSchedule.executingHealthCenterId);
      setProcedureId(existingSchedule.procedureId || '');
      setProcedureGroupId(existingSchedule.procedureGroupId || '');
      setEnabledProcedureIds(existingSchedule.enabledProcedureIds || []);
      setDoctorId(existingSchedule.doctorId);
      setCbo(existingSchedule.cbo);
      setStartDate(existingSchedule.startDate);
      setEndDate(existingSchedule.endDate);
      setStartTime(existingSchedule.startTime);
      setEndTime(existingSchedule.endTime);
      setSelectedDays(existingSchedule.daysOfWeek || []);
      setFirstTimeQty(existingSchedule.firstTimeQuantity);
      setFirstTimeMins(existingSchedule.firstTimeMinutes);
      setReturnQty(existingSchedule.returnQuantity);
      setReturnMins(existingSchedule.returnMinutes);
      setRegulatorQty(existingSchedule.regulatorReservedQuantity);
      setRegulatorMins(existingSchedule.regulatorReservedMinutes);
      setAutoSlotSplit(existingSchedule.autoSlotSplit);
      setIsLocalSchedule(existingSchedule.isLocalSchedule);
      setIsActive(existingSchedule.isActive);
      setNotes(existingSchedule.notes || '');
    }
  }, [existingSchedule, isEditing]);

  // Grupo selecionado atual
  const selectedGroup = useMemo(() => {
    if (!procedureGroupId || !deps?.procedureGroups) return null;
    return deps.procedureGroups.find((g) => g.id === procedureGroupId) || null;
  }, [procedureGroupId, deps?.procedureGroups]);

  // Reconciliação quando as opções dependentes mudam
  useEffect(() => {
    if (!deps) return;

    // Se o estabelecimento selecionado não for mais válido
    if (healthCenterId && !isCoordinator && deps.healthCenters.length > 0 && !deps.healthCenters.some((c) => c.id === healthCenterId)) {
      setHealthCenterId('');
    }

    // Se o procedimento selecionado não for compatível com as opções filtradas
    if (procedureId && deps.procedures.length > 0 && !deps.procedures.some((p) => p.id === procedureId)) {
      setProcedureId('');
    }

    // Se o grupo de procedimento selecionado não for compatível
    if (procedureGroupId && deps.procedureGroups.length > 0 && !deps.procedureGroups.some((g) => g.id === procedureGroupId)) {
      setProcedureGroupId('');
      setEnabledProcedureIds([]);
    }

    // Se o médico selecionado não for compatível com as opções filtradas
    if (doctorId && deps.doctors.length > 0 && !deps.doctors.some((d) => d.id === doctorId)) {
      setDoctorId('');
    }

    // Se o CBO selecionado não for compatível com as opções filtradas
    if (cbo && deps.cbos.length > 0 && !deps.cbos.some((c) => c.cbo === cbo)) {
      setCbo('');
    }
  }, [deps, healthCenterId, procedureId, procedureGroupId, doctorId, cbo, isCoordinator]);

  // Se vigência inicial e final forem iguais, seleciona o dia automaticamente
  useEffect(() => {
    if (startDate && endDate && startDate === endDate && selectedDays.length === 0) {
      const dateObj = new Date(`${startDate}T00:00:00`);
      const dayMap: Record<number, string> = {
        0: 'DOMINGO',
        1: 'SEGUNDA',
        2: 'TERCA',
        3: 'QUARTA',
        4: 'QUINTA',
        5: 'SEXTA',
        6: 'SABADO',
      };
      const dayName = dayMap[dateObj.getDay()];
      if (dayName) {
        setSelectedDays([dayName]);
      }
    }
  }, [startDate, endDate, selectedDays.length]);

  const createMutation = useCreateSchedule();
  const updateMutation = useUpdateSchedule();

  // Handlers para troca de tipo e limpeza dinâmica
  const handleScheduleTypeChange = (newType: 'CONSULTA' | 'EXAME' | 'PROCEDIMENTO') => {
    if (scheduleType === newType) return;
    setScheduleType(newType);
    setProcedureId('');
    setProcedureGroupId('');
    setEnabledProcedureIds([]);
    setDoctorId('');
    setCbo('');
    if (!isCoordinator) {
      setHealthCenterId('');
    }
  };

  const handleClearHealthCenter = () => {
    setHealthCenterId('');
    setProcedureId('');
    setProcedureGroupId('');
    setEnabledProcedureIds([]);
    setDoctorId('');
    setCbo('');
  };

  const handleClearProcedure = () => {
    setProcedureId('');
    setProcedureGroupId('');
    setEnabledProcedureIds([]);
    setDoctorId('');
    setCbo('');
  };

  const handleClearDoctor = () => {
    setDoctorId('');
    setCbo('');
  };

  const handleClearCbo = () => {
    setCbo('');
    setDoctorId('');
  };

  const handleProcedureSelectChange = (val: string) => {
    if (!val) {
      handleClearProcedure();
      return;
    }
    if (val.startsWith('GROUP:')) {
      const gId = val.replace('GROUP:', '');
      setProcedureGroupId(gId);
      setProcedureId('');
      const groupObj = deps?.procedureGroups.find((g) => g.id === gId);
      const procIds = (groupObj?.procedures || []).map((p) => p.id);
      setEnabledProcedureIds(procIds);
    } else {
      const pId = val.replace('PROC:', '');
      setProcedureId(pId);
      setProcedureGroupId('');
      setEnabledProcedureIds([]);
    }
  };

  const handleToggleProcedureItem = (procId: string) => {
    setEnabledProcedureIds((prev) =>
      prev.includes(procId) ? prev.filter((id) => id !== procId) : [...prev, procId],
    );
  };

  const handleSelectAllGroupItems = () => {
    if (!selectedGroup) return;
    setEnabledProcedureIds(selectedGroup.procedures.map((p) => p.id));
  };

  const handleDeselectAllGroupItems = () => {
    setEnabledProcedureIds([]);
  };

  // Cálculo do tempo de turno e vagas em tempo real
  const calculationSummary = useMemo(() => {
    if (!startTime || !endTime) return null;
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const totalTurnMinutes = (endH * 60 + endM) - (startH * 60 + startM);

    const totalSlotsPerDay = Number(firstTimeQty || 0) + Number(returnQty || 0) + Number(regulatorQty || 0);

    const totalConfiguredMinutes =
      Number(firstTimeQty || 0) * Number(firstTimeMins || 0) +
      Number(returnQty || 0) * Number(returnMins || 0) +
      Number(regulatorQty || 0) * Number(regulatorMins || 0);

    // Contagem de dias entre startDate e endDate
    let estimatedDatesCount = 0;
    if (startDate && endDate && selectedDays.length > 0) {
      const cur = new Date(`${startDate}T00:00:00`);
      const end = new Date(`${endDate}T00:00:00`);
      const dayMap: Record<number, string> = {
        0: 'DOMINGO', 1: 'SEGUNDA', 2: 'TERCA', 3: 'QUARTA', 4: 'QUINTA', 5: 'SEXTA', 6: 'SABADO'
      };
      while (cur <= end) {
        if (selectedDays.includes(dayMap[cur.getDay()])) {
          estimatedDatesCount++;
        }
        cur.setDate(cur.getDate() + 1);
      }
    }

    return {
      totalTurnMinutes,
      totalSlotsPerDay,
      totalConfiguredMinutes,
      estimatedDatesCount,
      totalEstimatedSlots: estimatedDatesCount * totalSlotsPerDay,
    };
  }, [startTime, endTime, firstTimeQty, firstTimeMins, returnQty, returnMins, regulatorQty, regulatorMins, startDate, endDate, selectedDays]);

  const handleToggleDay = (dayId: string) => {
    setSelectedDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId],
    );
  };

  const handleReset = () => {
    setScheduleType('CONSULTA');
    if (!isCoordinator) {
      setHealthCenterId('');
    }
    setProcedureId('');
    setProcedureGroupId('');
    setEnabledProcedureIds([]);
    setDoctorId('');
    setCbo('');
    setStartDate('');
    setEndDate('');
    setStartTime('');
    setEndTime('');
    setSelectedDays([]);
    setFirstTimeQty('');
    setFirstTimeMins('');
    setReturnQty('');
    setReturnMins('');
    setRegulatorQty('');
    setRegulatorMins('');
    setAutoSlotSplit(false);
    setIsLocalSchedule(false);
    setIsActive(true);
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!healthCenterId) {
      toast.error('Selecione o Estabelecimento de Saúde.');
      return;
    }
    if (!procedureId && !procedureGroupId) {
      toast.error('Selecione o Procedimento ou Grupo de Procedimentos.');
      return;
    }
    if (procedureGroupId && enabledProcedureIds.length === 0) {
      toast.error('Selecione ao menos um procedimento do grupo para ofertar nesta escala.');
      return;
    }
    if (!doctorId) {
      toast.error('Selecione o Profissional.');
      return;
    }
    if (!cbo) {
      toast.error('Selecione o CBO.');
      return;
    }
    if (!startDate || !endDate) {
      toast.error('Preencha a vigência inicial e final da escala.');
      return;
    }
    if (!startTime || !endTime) {
      toast.error('Informe a hora inicial e final do turno de atendimento.');
      return;
    }
    if (selectedDays.length === 0) {
      toast.error('Selecione ao menos um dia da semana para o atendimento.');
      return;
    }

    const totalSlots = Number(firstTimeQty || 0) + Number(returnQty || 0) + Number(regulatorQty || 0);
    if (totalSlots === 0) {
      toast.error('Informe a quantidade de ao menos um tipo de vaga (1ª Vez, Retorno ou Reserva para Regulador).');
      return;
    }

    const payload = {
      executingHealthCenterId: healthCenterId,
      scheduleType,
      procedureId: procedureId || undefined,
      procedureGroupId: procedureGroupId || undefined,
      enabledProcedureIds: procedureGroupId ? enabledProcedureIds : undefined,
      doctorId,
      cbo,
      startDate,
      endDate,
      startTime,
      endTime,
      daysOfWeek: selectedDays,
      firstTimeQuantity: Number(firstTimeQty) || 0,
      firstTimeMinutes: Number(firstTimeMins) || 0,
      returnQuantity: Number(returnQty) || 0,
      returnMinutes: Number(returnMins) || 0,
      regulatorReservedQuantity: Number(regulatorQty) || 0,
      regulatorReservedMinutes: Number(regulatorMins) || 0,
      autoSlotSplit,
      isLocalSchedule,
      isActive,
      notes: notes.trim() || undefined,
    };

    try {
      if (isEditing && id) {
        await updateMutation.mutateAsync({ id, data: payload });
        toast.success('Escala de atendimento atualizada com sucesso!');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Escala de atendimento criada com sucesso!');
      }
      navigate('/schedules');
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || 'Falha ao salvar a escala de atendimento. Verifique conflitos de horário.',
      );
    }
  };

  if (isLoadingExisting && isEditing) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Monta o valor atual do select de procedimento/grupo
  const currentProcedureValue = procedureGroupId
    ? `GROUP:${procedureGroupId}`
    : procedureId
    ? `PROC:${procedureId}`
    : '';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <Link
            to="/schedules"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {isEditing ? 'Editar Escala de Atendimento' : 'Nova Escala de Atendimento'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {isEditing
                ? 'Atualize os dados e a vigência da escala'
                : 'Defina a oferta de vagas, horário e profissional da unidade executante'}
            </p>
          </div>
        </div>

        {isCoordinator && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-200 dark:border-blue-800">
            <Building2 className="w-3.5 h-3.5" />
            <span>Perfil: Coordenador de Unidade</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ========================================================================= */}
        {/* BLOCO 1: ESCALA (Tipo de Escala + 4 Selects Dependentes + Vigência e Horas) */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              1. ESCALA
            </span>
            {isLoadingDeps && (
              <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Atualizando opções...
              </span>
            )}
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            {/* Seletor do Tipo de Escala: CONSULTA | EXAME | PROCEDIMENTO */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span>Tipo de Escala:</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-200/70 dark:bg-slate-800 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => handleScheduleTypeChange('CONSULTA')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                    scheduleType === 'CONSULTA'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Stethoscope className="w-3.5 h-3.5" />
                  CONSULTA
                </button>
                <button
                  type="button"
                  onClick={() => handleScheduleTypeChange('EXAME')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                    scheduleType === 'EXAME'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  EXAME
                </button>
                <button
                  type="button"
                  onClick={() => handleScheduleTypeChange('PROCEDIMENTO')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                    scheduleType === 'PROCEDIMENTO'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Scissors className="w-3.5 h-3.5" />
                  PROCEDIMENTO
                </button>
              </div>
            </div>

            {/* Linha 1: 4 Selects Dependentes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Estabelecimento */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Estabelecimento *
                </label>
                <div className="relative">
                  <select
                    required
                    disabled={isCoordinator && Boolean(user?.healthCenterId)}
                    value={healthCenterId}
                    onChange={(e) => setHealthCenterId(e.target.value)}
                    className="w-full pl-3 pr-12 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-75 disabled:cursor-not-allowed truncate"
                  >
                    <option value="">Selecione o Estabelecimento...</option>
                    {deps?.healthCenters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  {healthCenterId && !isCoordinator && (
                    <button
                      type="button"
                      onClick={handleClearHealthCenter}
                      className="absolute right-7 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                      title="Limpar seleção"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Procedimento / Grupo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {scheduleType === 'CONSULTA' ? 'Procedimento *' : 'Procedimento / Grupo *'}
                </label>
                <div className="relative">
                  <select
                    required
                    value={currentProcedureValue}
                    onChange={(e) => handleProcedureSelectChange(e.target.value)}
                    className="w-full pl-3 pr-12 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 truncate"
                  >
                    <option value="">
                      {scheduleType === 'CONSULTA'
                        ? 'Selecione o Procedimento...'
                        : 'Selecione o Procedimento ou Grupo...'}
                    </option>

                    {/* Se não for consulta e existirem grupos, lista os grupos primeiro */}
                    {scheduleType !== 'CONSULTA' && deps?.procedureGroups && deps.procedureGroups.length > 0 && (
                      <optgroup label="Grupos de Procedimentos">
                        {deps.procedureGroups.map((g) => (
                          <option key={`GROUP:${g.id}`} value={`GROUP:${g.id}`}>
                            {g.label} ({g.procedures.length} procedimentos)
                          </option>
                        ))}
                      </optgroup>
                    )}

                    {/* Procedimentos Individuais */}
                    <optgroup label={scheduleType !== 'CONSULTA' ? 'Procedimentos Individuais' : 'Consultas'}>
                      {deps?.procedures.map((p) => (
                        <option key={`PROC:${p.id}`} value={`PROC:${p.id}`}>
                          {p.label}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  {currentProcedureValue && (
                    <button
                      type="button"
                      onClick={handleClearProcedure}
                      className="absolute right-7 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                      title="Limpar seleção"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Profissional */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Profissional *
                </label>
                <div className="relative">
                  <select
                    required
                    value={doctorId}
                    onChange={(e) => setDoctorId(e.target.value)}
                    className="w-full pl-3 pr-12 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 truncate"
                  >
                    <option value="">Selecione o Profissional...</option>
                    {deps?.doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                  {doctorId && (
                    <button
                      type="button"
                      onClick={handleClearDoctor}
                      className="absolute right-7 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                      title="Limpar seleção"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* CBO */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  CBO *
                </label>
                <div className="relative">
                  <select
                    required
                    value={cbo}
                    onChange={(e) => setCbo(e.target.value)}
                    className="w-full pl-3 pr-12 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 truncate"
                  >
                    <option value="">Selecione o CBO...</option>
                    {deps?.cbos.map((c) => (
                      <option key={c.cbo} value={c.cbo}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  {cbo && (
                    <button
                      type="button"
                      onClick={handleClearCbo}
                      className="absolute right-7 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                      title="Limpar seleção"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Linha 2: Vigência e Horários */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {/* Vigência Inicial */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vigência inicial *
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Vigência Final */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vigência final *
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">Limite máx. 6 meses</span>
              </div>

              {/* Hora Inicial */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Hora inicial *
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Hora Final */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Hora final *
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BLOCO 2: OFERTA (Dias da Semana + Quotas por Tipo de Vaga + Flags) */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              2. OFERTA
            </span>
          </div>

          <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Coluna Esquerda: DIAS DA SEMANA */}
            <div className="lg:col-span-4 space-y-3">
              <span className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 block pb-1 border-b border-slate-100 dark:border-slate-800">
                Dia da Semana
              </span>

              <div className="space-y-2 pt-1">
                {DAYS_OF_WEEK.map((day) => {
                  const isChecked = selectedDays.includes(day.id);
                  return (
                    <label
                      key={day.id}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                        isChecked
                          ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 font-semibold'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleDay(day.id)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                      />
                      <span className="text-xs tracking-wide">{day.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Coluna Direita: TIPO DE OFERTA / CONSUMO POR PROCEDIMENTO & FLAGS */}
            <div className="lg:col-span-8 space-y-6">
              <div>
                <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800 mb-3">
                  <span className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
                    Tipo de Oferta
                  </span>
                  <span className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
                    Consumo por Procedimento
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Linha 1: 1ª Vez */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                    <div className="w-40 shrink-0">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        1ª Vez
                      </span>
                      <span className="text-2xs text-slate-400 block">Primeira consulta/exame</span>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="flex-1 sm:w-32">
                        <label className="text-2xs text-slate-400 block mb-0.5">Quantidade</label>
                        <input
                          type="number"
                          min="0"
                          value={firstTimeQty}
                          onChange={(e) => setFirstTimeQty(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                          placeholder="0"
                          className="w-full px-3 py-1.5 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-semibold"
                        />
                      </div>
                      <div className="flex-1 sm:w-32">
                        <label className="text-2xs text-slate-400 block mb-0.5">Minutos</label>
                        <input
                          type="number"
                          min="0"
                          value={firstTimeMins}
                          onChange={(e) => setFirstTimeMins(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                          placeholder="0"
                          className="w-full px-3 py-1.5 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Linha 2: Retorno */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                    <div className="w-40 shrink-0">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Retorno
                      </span>
                      <span className="text-2xs text-slate-400 block">Retorno médico ambulatorial</span>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="flex-1 sm:w-32">
                        <label className="text-2xs text-slate-400 block mb-0.5">Quantidade</label>
                        <input
                          type="number"
                          min="0"
                          value={returnQty}
                          onChange={(e) => setReturnQty(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                          placeholder="0"
                          className="w-full px-3 py-1.5 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-semibold"
                        />
                      </div>
                      <div className="flex-1 sm:w-32">
                        <label className="text-2xs text-slate-400 block mb-0.5">Minutos</label>
                        <input
                          type="number"
                          min="0"
                          value={returnMins}
                          onChange={(e) => setReturnMins(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                          placeholder="0"
                          className="w-full px-3 py-1.5 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Linha 3: Reservada Regulador */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                    <div className="w-40 shrink-0">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Reservada Regulador
                      </span>
                      <span className="text-2xs text-slate-400 block">Urgência e encaixes clínicos</span>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="flex-1 sm:w-32">
                        <label className="text-2xs text-slate-400 block mb-0.5">Quantidade</label>
                        <input
                          type="number"
                          min="0"
                          value={regulatorQty}
                          onChange={(e) => setRegulatorQty(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                          placeholder="0"
                          className="w-full px-3 py-1.5 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-semibold"
                        />
                      </div>
                      <div className="flex-1 sm:w-32">
                        <label className="text-2xs text-slate-400 block mb-0.5">Minutos</label>
                        <input
                          type="number"
                          min="0"
                          value={regulatorMins}
                          onChange={(e) => setRegulatorMins(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                          placeholder="0"
                          className="w-full px-3 py-1.5 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Checkboxes de Configuração */}
              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSlotSplit}
                    onChange={(e) => setAutoSlotSplit(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                  />
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    Quebra automática
                    <span
                      title="Divide o intervalo de horas gerando horários fracionados individuais em blocos contínuos (1ª Vez, Retorno, Regulador)"
                      className="text-slate-400 hover:text-slate-600 cursor-help"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                    </span>
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isLocalSchedule}
                    onChange={(e) => setIsLocalSchedule(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                  />
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    Agenda local
                    <span
                      title="Fica disponível apenas para reguladores e coordenadores vinculados à própria unidade executante ofertante"
                      className="text-slate-400 hover:text-slate-600 cursor-help"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                    </span>
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tracking-wide uppercase">
                    ATIVA
                  </span>
                </label>
              </div>

              {/* Card Resumo do Turno / Preview do Cálculo */}
              {calculationSummary && (
                <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-200">
                    <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>Cálculo do Turno & Capacidade Estimada</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-2xs">Tempo de Turno</span>
                      <strong className="text-slate-800 dark:text-slate-100 font-semibold">
                        {Math.floor(calculationSummary.totalTurnMinutes / 60)}h{' '}
                        {calculationSummary.totalTurnMinutes % 60}min
                      </strong>
                    </div>

                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-2xs">Vagas / Dia</span>
                      <strong className="text-blue-600 dark:text-blue-400 font-semibold">
                        {calculationSummary.totalSlotsPerDay} vagas
                      </strong>
                    </div>

                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-2xs">Dias de Atendimento</span>
                      <strong className="text-slate-800 dark:text-slate-100 font-semibold">
                        {calculationSummary.estimatedDatesCount} dia(s)
                      </strong>
                    </div>

                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-2xs">Total Geral Estimado</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                        {calculationSummary.totalEstimatedSlots} atendimentos
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BLOCO 2.5: ITENS DO GRUPO OFERTADOS (Aparece se for selecionado um grupo) */}
        {/* ========================================================================= */}
        {selectedGroup && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-blue-200 dark:border-blue-900/50 shadow-sm overflow-hidden animate-in fade-in duration-200">
            <div className="px-5 py-3.5 bg-blue-50/70 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Itens do Grupo Ofertados Nesta Escala ({selectedGroup.name})
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                  {enabledProcedureIds.length} de {selectedGroup.procedures.length} selecionados
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSelectAllGroupItems}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                >
                  Selecionar Todos
                </button>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <button
                  type="button"
                  onClick={handleDeselectAllGroupItems}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold cursor-pointer"
                >
                  Desmarcar Todos
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-5">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Marque os procedimentos deste grupo que farão parte desta escala. Caso uma solicitação seja de um procedimento desmarcado, ela não poderá ser agendada nesta escala e o regulador será devidamente alertado.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto p-1">
                {selectedGroup.procedures.map((proc) => {
                  const isChecked = enabledProcedureIds.includes(proc.id);
                  return (
                    <label
                      key={proc.id}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition select-none ${
                        isChecked
                          ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/60 text-slate-900 dark:text-white'
                          : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 opacity-60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleProcedureItem(proc.id)}
                        className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400 block">
                          {proc.code}
                        </span>
                        <span className="truncate block font-medium">
                          {proc.name}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* BLOCO 3: OBSERVAÇÃO */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
              3. OBSERVAÇÃO
            </span>
          </div>

          <div className="p-5 sm:p-6">
            <textarea
              rows={4}
              placeholder="Digite orientações de preparo, documentos obrigatórios que o paciente deve portar ou instruções para o atendimento..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* AÇÕES DE RODAPÉ (SALVAR / LIMPAR / VOLTAR - Padrão do Protótipo) */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#28a745] hover:bg-[#218838] text-white font-bold text-sm uppercase tracking-wide shadow-sm hover:shadow transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>SALVAR</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 font-bold text-sm uppercase tracking-wide transition-colors cursor-pointer"
            >
              LIMPAR
            </button>
          </div>

          <Link
            to="/schedules"
            className="w-full sm:w-auto px-4 py-2.5 text-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-bold text-sm uppercase tracking-wide transition-colors"
          >
            VOLTAR
          </Link>
        </div>
      </form>
    </div>
  );
};
