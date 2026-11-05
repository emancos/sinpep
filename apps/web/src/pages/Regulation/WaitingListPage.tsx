import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Sparkles,
  Sliders,
  Clock,
  Printer,
  Eye,
  ArrowRightLeft,
  CalendarCheck,
  AlertTriangle,
  CheckCircle2,
  Download,
} from 'lucide-react';
import { useWaitingList, type WaitingListRequest } from '../../hooks/useAutoScheduling';
import { useProcedures, useProcedureGroups } from '../../hooks/useProcedures';
import { useHealthCenters } from '../../hooks/useHealthCenters';
import { useAuthStore } from '../../store/useAuthStore';
import { formatCPF, formatCNS, formatBirthDateAndGender } from '../../utils/brazilianFormatters';
import { BookSlotModal } from './BookSlotModal';
import { RegulationRequestPrintModal } from './RegulationRequestPrintModal';
import { AutoSchedulingSimulationModal } from './AutoSchedulingSimulationModal';

export const WaitingListPage: React.FC = () => {
  const permissions = useAuthStore((state) => state.permissions);
  const activeProfile = useAuthStore((state) => state.activeProfile);

  const isAdmin = permissions.includes('admin:access');
  const isRegulator =
    activeProfile?.name === 'Regulador (Central de Regulação)' ||
    permissions.includes('regulation-operator:read');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [procedureFilter, setProcedureFilter] = useState('ALL');
  const [procedureGroupFilter, setProcedureGroupFilter] = useState('ALL');
  const [requestingCenterFilter, setRequestingCenterFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [waitingDaysFilter, setWaitingDaysFilter] = useState('ALL');

  // Modals
  const [simulationModalOpen, setSimulationModalOpen] = useState(false);
  const [bookingSlotRequest, setBookingSlotRequest] = useState<WaitingListRequest | null>(null);
  const [printingRequest, setPrintingRequest] = useState<WaitingListRequest | null>(null);

  // Queries
  const { data: proceduresData } = useProcedures({ page: 1, limit: 300 });
  const { data: procedureGroupsData = [] } = useProcedureGroups();
  const { data: healthCentersData } = useHealthCenters({ page: 1, limit: 100 });

  const minWaitingDays = useMemo(() => {
    if (waitingDaysFilter === '15_30') return 15;
    if (waitingDaysFilter === 'ABOVE_30') return 31;
    if (waitingDaysFilter === 'ABOVE_60') return 61;
    return undefined;
  }, [waitingDaysFilter]);

  const maxWaitingDays = useMemo(() => {
    if (waitingDaysFilter === 'BELOW_15') return 14;
    if (waitingDaysFilter === '15_30') return 30;
    return undefined;
  }, [waitingDaysFilter]);

  const {
    data: waitingListData,
    isLoading,
    refetch,
  } = useWaitingList({
    procedureId: procedureFilter !== 'ALL' ? procedureFilter : undefined,
    procedureGroupId: procedureGroupFilter !== 'ALL' ? procedureGroupFilter : undefined,
    priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
    requestingHealthCenterId: requestingCenterFilter !== 'ALL' ? requestingCenterFilter : undefined,
    search: searchTerm.trim() || undefined,
    minWaitingDays,
    maxWaitingDays,
  });

  const requests = waitingListData?.items || [];
  const kpis = waitingListData?.kpis || {
    totalWaiting: 0,
    averageWaitingDays: 0,
    urgencyCount: 0,
    priorityCount: 0,
    availableSlotsCount: 0,
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENCIA':
      case 'URGENTE':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800">
            URGÊNCIA
          </span>
        );
      case 'PRIORITARIO':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            PRIORITÁRIO
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            ELETIVO
          </span>
        );
    }
  };

  const getWaitingDaysBadge = (days: number) => {
    if (days >= 60) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 flex items-center gap-1">
          <Clock className="w-3 h-3 text-red-600" /> {days} dias
        </span>
      );
    }
    if (days >= 30) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 flex items-center gap-1">
          <Clock className="w-3 h-3 text-amber-600" /> {days} dias
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 flex items-center gap-1">
        <Clock className="w-3 h-3 text-emerald-600" /> {days} dias
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Navegação Superior da Regulação */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600" />
              <span>Fila de Espera da Regulação</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
              Solicitações Autorizadas
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Pacientes autorizados pela Central de Regulação aguardando agendamento por ordem de Score Clínico Ponderado.
          </p>
        </div>

        {/* Botões de Ação Regulatório */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setSimulationModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-98"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Simular Agendamento Automático</span>
          </button>

          <Link
            to="/regulation/auto-scheduling/rules"
            className="px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Sliders className="w-4 h-4 text-slate-500" />
            <span>Regras do Motor</span>
          </Link>
        </div>
      </div>

      {/* Abas Rápidas de Navegação */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-bold overflow-x-auto">
        <Link
          to="/regulation/inbox"
          className="px-3 py-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
        >
          Inbox da Regulação (Triagem)
        </Link>
        <span className="px-3 py-1.5 rounded-md bg-blue-600 text-white shrink-0">
          Fila de Espera Autorizada ({kpis.totalWaiting})
        </span>
        <Link
          to="/regulation/auto-scheduling/rules"
          className="px-3 py-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
        >
          Parâmetros de Agendamento Automático
        </Link>
        <Link
          to="/regulation/esus-import"
          className="px-3 py-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0 flex items-center gap-1"
        >
          <Download className="w-3.5 h-3.5 text-blue-500" />
          <span>Importação e-SUS</span>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total na Fila de Espera</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {kpis.totalWaiting}
          </div>
          <p className="text-[11px] text-slate-400">Solicitações prontas para agendar</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Tempo Médio na Fila</span>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {kpis.averageWaitingDays} dias
          </div>
          <p className="text-[11px] text-slate-400">Desde a autorização pelo regulador</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Casos com Prioridade</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-black text-red-600 dark:text-red-400">
            {kpis.urgencyCount + kpis.priorityCount}
          </div>
          <p className="text-[11px] text-slate-400">
            {kpis.urgencyCount} urgências • {kpis.priorityCount} prioritários
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/20 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
            <span>Vagas Ofertadas na Rede</span>
            <CalendarCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
            {kpis.availableSlotsCount}
          </div>
          <p className="text-[11px] text-emerald-600/80">Vagas abertas em escalas futuras</p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Busca por texto */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar paciente, CPF, protocolo..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Filtro Grupo de Procedimento */}
          <div>
            <select
              value={procedureGroupFilter}
              onChange={(e) => setProcedureGroupFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Todos os Grupos</option>
              {procedureGroupsData?.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Procedimento */}
          <div>
            <select
              value={procedureFilter}
              onChange={(e) => setProcedureFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Todos Procedimentos</option>
              {proceduresData?.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code ? `${p.code} - ` : ''}{p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Prioridade */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Todas Prioridades</option>
              <option value="URGENCIA">Urgência</option>
              <option value="PRIORITARIO">Prioritário</option>
              <option value="ELETIVO">Eletivo</option>
            </select>
          </div>

          {/* Filtro Unidade Solicitante (UBS) */}
          <div>
            <select
              value={requestingCenterFilter}
              onChange={(e) => setRequestingCenterFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Todas as UBS</option>
              {healthCentersData?.data?.map((hc) => (
                <option key={hc.id} value={hc.id}>
                  {hc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Faixa de Espera */}
          <div>
            <select
              value={waitingDaysFilter}
              onChange={(e) => setWaitingDaysFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Qualquer Espera</option>
              <option value="BELOW_15">Até 14 dias</option>
              <option value="15_30">De 15 a 30 dias</option>
              <option value="ABOVE_30">Mais de 30 dias</option>
              <option value="ABOVE_60">Mais de 60 dias (Crítico)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista da Fila de Espera Ranqueada */}
      {isLoading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-16 text-center text-slate-500 shadow-xs">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">Carregando e calculando ordenação da fila de espera...</span>
          </div>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center text-slate-400 shadow-xs space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">
            Nenhum paciente aguardando agendamento
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Não existem solicitações autorizadas pendentes de vaga para os filtros selecionados.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3.5 text-center w-14">Pos.</th>
                  <th className="px-4 py-3.5">Score Ponderado</th>
                  <th className="px-4 py-3.5">Tempo Fila</th>
                  <th className="px-4 py-3.5">Protocolo</th>
                  <th className="px-4 py-3.5">Paciente</th>
                  <th className="px-4 py-3.5">Procedimento / Grupo</th>
                  <th className="px-4 py-3.5">UBS Solicitante</th>
                  <th className="px-4 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {requests.map((req) => {
                  const b = req.scoreBreakdown;

                  return (
                    <tr
                      key={req.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                    >
                      {/* Posição na Fila */}
                      <td className="px-4 py-3 text-center">
                        <span className="font-mono font-black text-sm text-slate-700 dark:text-slate-300">
                          #{req.queuePosition}
                        </span>
                      </td>

                      {/* Score Ponderado */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2.5 py-1 rounded-md font-mono font-bold text-xs bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {req.score} pts
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Espera: +{b.waitingPoints} | Prioridade: +{b.priorityPoints}
                          {b.elderlyPoints > 0 && ` | Idoso: +${b.elderlyPoints}`}
                        </div>
                      </td>

                      {/* Tempo de Espera */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getWaitingDaysBadge(req.waitingDays)}
                      </td>

                      {/* Protocolo */}
                      <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        <Link to={`/regulation/requests/${req.id}`} className="hover:underline">
                          {req.protocolNumber}
                        </Link>
                      </td>

                      {/* Paciente */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {req.patient?.name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                          <span>CPF: {formatCPF(req.patient?.cpf)}</span>
                          {req.patient?.cns && <span>• CNS: {formatCNS(req.patient?.cns)}</span>}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {formatBirthDateAndGender(req.patient?.birthDate, req.patient?.gender)}
                          {req.age > 0 && ` (${req.age} anos)`}
                        </div>
                      </td>

                      {/* Procedimento */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {req.procedure ? req.procedure.name : req.specialty?.name}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span>{req.type}</span>
                          {req.procedureGroup && req.procedureGroup.name !== (req.procedure?.name || req.specialty?.name) && (
                            <span>• {req.procedureGroup.name}</span>
                          )}
                          {getPriorityBadge(req.priority)}
                        </div>
                      </td>

                      {/* UBS Solicitante */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {req.requestingHealthCenter?.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(req.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                        {/* Agendar Vaga Direta */}
                        <button
                          type="button"
                          onClick={() => setBookingSlotRequest(req)}
                          className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-xs transition inline-flex items-center gap-1 cursor-pointer active:scale-95"
                          title="Agendar Vaga Manual"
                        >
                          <CalendarCheck className="w-3.5 h-3.5" />
                          <span>Agendar</span>
                        </button>

                        {/* Alterar Procedimento (Apenas ícone para regulador/admin) */}
                        {(isAdmin || isRegulator) && (
                          <Link
                            to={`/regulation/requests/${req.id}/change-procedure`}
                            title="Alterar Procedimento"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition inline-flex items-center cursor-pointer"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </Link>
                        )}

                        {/* Imprimir Ficha */}
                        <button
                          type="button"
                          onClick={() => setPrintingRequest(req)}
                          title="Imprimir Ficha de Solicitação"
                          className="p-1.5 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        {/* Detalhes */}
                        <Link
                          to={`/regulation/requests/${req.id}`}
                          title="Ver Detalhes da Solicitação"
                          className="p-1.5 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition inline-flex items-center cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Agendamento Individual */}
      {bookingSlotRequest && (
        <BookSlotModal
          isOpen={!!bookingSlotRequest}
          onClose={() => {
            setBookingSlotRequest(null);
            refetch();
          }}
          request={bookingSlotRequest}
          onSuccess={() => refetch()}
        />
      )}

      {/* Modal de Impressão */}
      {printingRequest && (
        <RegulationRequestPrintModal
          isOpen={!!printingRequest}
          onClose={() => setPrintingRequest(null)}
          request={printingRequest}
        />
      )}

      {/* Modal de Simulação e Agendamento em Lote */}
      {simulationModalOpen && (
        <AutoSchedulingSimulationModal
          isOpen={simulationModalOpen}
          onClose={() => setSimulationModalOpen(false)}
          procedureId={procedureFilter !== 'ALL' ? procedureFilter : undefined}
          procedureGroupId={procedureGroupFilter !== 'ALL' ? procedureGroupFilter : undefined}
          requestingHealthCenterId={requestingCenterFilter !== 'ALL' ? requestingCenterFilter : undefined}
          onSuccess={() => {
            refetch();
          }}
        />
      )}
    </div>
  );
};
