import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Calendar,
  Building2,
  Activity,
  HelpCircle,
  ArrowLeft,
  Save,
  Loader2,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useScheduleDependencies,
  useCreateSchedule,
  useUpdateSchedule,
  useSchedule,
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

  // State dos 4 Selects Dependentes
  const [healthCenterId, setHealthCenterId] = useState('');
  const [procedureId, setProcedureId] = useState('');
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
    doctorId: doctorId || undefined,
    cbo: cbo || undefined,
  });

  // Query da escala para edição
  const { data: existingSchedule, isLoading: isLoadingExisting } = useSchedule(id || '');

  // Popula dados ao editar
  useEffect(() => {
    if (existingSchedule && isEditing) {
      setHealthCenterId(existingSchedule.executingHealthCenterId);
      setProcedureId(existingSchedule.procedureId);
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
    if (!isCoordinator) {
      setHealthCenterId('');
    }
    setProcedureId('');
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
    if (!procedureId) {
      toast.error('Selecione o Procedimento.');
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
      procedureId,
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
      notes,
    };

    try {
      if (isEditing && id) {
        await updateMutation.mutateAsync({ id, data: payload });
        toast.success('Agenda atualizada com sucesso!');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Agenda e escala de atendimento criadas com sucesso!');
      }
      navigate('/schedules');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao salvar escala de atendimento.';
      toast.error(msg);
    }
  };

  if (isEditing && isLoadingExisting) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Carregando dados da agenda...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            to="/schedules"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Voltar para a listagem"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {isEditing ? 'Editar Escala de Atendimento' : 'Nova Escala de Atendimento'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Defina o profissional, procedimento, dias de vigência e as cotas de vagas para agendamento.
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
        {/* BLOCO 1: ESCALA (Cabeçalho com 4 Selects Dependentes + Vigência e Horas) */}
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
                    className="w-full pl-3 pr-8 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-75 disabled:cursor-not-allowed truncate"
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
                      onClick={() => setHealthCenterId('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer font-bold"
                      title="Limpar seleção"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Procedimento */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Procedimento *
                </label>
                <div className="relative">
                  <select
                    required
                    value={procedureId}
                    onChange={(e) => setProcedureId(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 truncate"
                  >
                    <option value="">Selecione o Procedimento...</option>
                    {deps?.procedures.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  {procedureId && (
                    <button
                      type="button"
                      onClick={() => setProcedureId('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer font-bold"
                      title="Limpar seleção"
                    >
                      ×
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
                    className="w-full pl-3 pr-8 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 truncate"
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
                      onClick={() => setDoctorId('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer font-bold"
                      title="Limpar seleção"
                    >
                      ×
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
                    className="w-full pl-3 pr-8 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 truncate"
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
                      onClick={() => setCbo('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer font-bold"
                      title="Limpar seleção"
                    >
                      ×
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
