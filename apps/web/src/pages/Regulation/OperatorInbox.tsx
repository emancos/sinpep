import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Eye,
  Calendar,
  Ban,
  Stethoscope,
  Key,
  ArrowRightLeft,
  Printer,
  Sparkles,
  Sliders,
  Download,
} from 'lucide-react';
import {
  useRegulationInbox,
  useCancelRegulationSchedule,
} from '../../hooks/useRegulation';
import { useHealthCenters } from '../../hooks/useHealthCenters';
import type {
  RegulationRequest,
  RegulationRequestStatus,
} from '../../services/regulation';
import { EvaluateRegulationModal } from './EvaluateRegulationModal';
import { ScheduleRegulationModal } from './ScheduleRegulationModal';
import { RequestDetailsModal } from './RequestDetailsModal';
import { BookSlotModal } from './BookSlotModal';
import { RegulationRequestPrintModal } from './RegulationRequestPrintModal';
import { useAuthStore } from '../../store/useAuthStore';
import { formatCPF, formatCNS } from '../../utils/brazilianFormatters';
import { toast } from 'sonner';

export const OperatorInbox: React.FC = () => {
  const permissions = useAuthStore((state) => state.permissions);
  const activeProfile = useAuthStore((state) => state.activeProfile);
  const isAdmin = permissions.includes('admin:access');
  const isRegulator =
    activeProfile?.name === 'Regulador (Central de Regulação)' ||
    permissions.includes('regulation-operator:read');

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [requestingCenterFilter, setRequestingCenterFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [evaluatingRequest, setEvaluatingRequest] = useState<RegulationRequest | null>(null);
  const [schedulingRequest, setSchedulingRequest] = useState<RegulationRequest | null>(null);
  const [slotBookingRequest, setSlotBookingRequest] = useState<RegulationRequest | null>(null);
  const [detailsRequest, setDetailsRequest] = useState<RegulationRequest | null>(null);
  const [printingRequest, setPrintingRequest] = useState<RegulationRequest | null>(null);

  // Cancel Schedule Modal
  const [cancelingScheduleRequest, setCancelingScheduleRequest] = useState<RegulationRequest | null>(null);
  const [cancelScheduleJustification, setCancelScheduleJustification] = useState('');
  const [returnToQueue, setReturnToQueue] = useState(true);

  // Queries
  const { data: inboxResponse, isLoading, refetch } = useRegulationInbox();
  const { data: healthCentersData } = useHealthCenters({ page: 1, limit: 100 });
  const cancelScheduleMutation = useCancelRegulationSchedule();

  const requests = inboxResponse?.data || [];

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      if (statusFilter !== 'ALL' && req.status !== statusFilter) return false;
      if (typeFilter !== 'ALL' && req.type !== typeFilter) return false;
      if (priorityFilter !== 'ALL' && req.priority !== priorityFilter) return false;
      if (requestingCenterFilter !== 'ALL' && req.requestingHealthCenterId !== requestingCenterFilter)
        return false;

      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase();
        const matchesProtocol = (req.protocolNumber || '').toLowerCase().includes(s);
        const matchesPatient = (req.patient?.name || '').toLowerCase().includes(s);
        const matchesCpf = (req.patient?.cpf || '').includes(s);
        const matchesToken = (req.confirmationToken || '').toLowerCase().includes(s);
        const matchesItem = (req.procedure?.name || req.specialty?.name || '').toLowerCase().includes(s);
        const matchesGroup = (req.procedureGroup?.name || '').toLowerCase().includes(s);
        const matchesSubProcedures = req.groupProcedures?.some(
          (gp) =>
            gp.name?.toLowerCase().includes(s) ||
            gp.code?.toLowerCase().includes(s) ||
            gp.sigtapCode?.toLowerCase().includes(s)
        );
        return (
          matchesProtocol ||
          matchesPatient ||
          matchesCpf ||
          matchesToken ||
          matchesItem ||
          matchesGroup ||
          Boolean(matchesSubProcedures)
        );
      }

      return true;
    });
  }, [requests, statusFilter, typeFilter, priorityFilter, requestingCenterFilter, searchTerm]);

  // Counts
  const counts = useMemo(() => {
    return {
      all: requests.length,
      toEvaluate: requests.filter((r) => r.status === 'PENDENTE_REGULACAO').length,
      toSchedule: requests.filter((r) => r.status === 'PENDENTE_AGENDAMENTO').length,
      scheduled: requests.filter((r) => r.status === 'AGENDADA').length,
      returned: requests.filter((r) => r.status === 'DEVOLVIDA').length,
      denied: requests.filter((r) => r.status === 'NEGADA').length,
    };
  }, [requests]);

  const handleConfirmCancelSchedule = async () => {
    if (!cancelingScheduleRequest) return;
    if (!cancelScheduleJustification || cancelScheduleJustification.trim().length < 5) {
      toast.error('Informe a justificativa para o cancelamento do agendamento.');
      return;
    }

    try {
      await cancelScheduleMutation.mutateAsync({
        id: cancelingScheduleRequest.id,
        payload: {
          justification: cancelScheduleJustification.trim(),
          returnToQueue,
        },
      });
      setCancelingScheduleRequest(null);
      setCancelScheduleJustification('');
    } catch {
      // Handled in mutation
    }
  };

  const getStatusBadge = (status: RegulationRequestStatus) => {
    switch (status) {
      case 'PENDENTE_REGULACAO':
        return (
          <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            Pendente Regulação
          </span>
        );
      case 'PENDENTE_AGENDAMENTO':
        return (
          <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
            Aguardando Agendamento
          </span>
        );
      case 'AGENDADA':
        return (
          <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
            Agendada
          </span>
        );
      case 'DEVOLVIDA':
        return (
          <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 animate-pulse">
            Devolvida p/ UBS
          </span>
        );
      case 'NEGADA':
        return (
          <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
            Indeferida / Negada
          </span>
        );
      case 'AGENDAMENTO_CANCELADO':
        return (
          <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300">
            Agendamento Cancelado
          </span>
        );
      case 'CANCELADA':
        return (
          <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300">
            Cancelada
          </span>
        );
      default:
        return null;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENCIA':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300">URGÊNCIA</span>;
      case 'PRIORITARIO':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">PRIORITÁRIO</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">ELETIVO</span>;
    }
  };

  return (
    <div className="space-y-4 lg:space-y-5">
      {/* Header com padrão do projeto */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
              Central Municipal de Regulação
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Módulo Operador / Regulador</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
            Fila de Regulação & Agendamento
          </h1>
          <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400">
            Avalie clinicamente as solicitações das UBS, autorize, devolva ou agende vagas nas unidades executantes.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/regulation/esus-import"
            className="px-3 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-md text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-blue-500" />
            <span>Importação e-SUS</span>
          </Link>
          <Link
            to="/regulation/waiting-list"
            className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-md text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Fila de Espera & Auto-Agendamento</span>
          </Link>
          <Link
            to="/regulation/auto-scheduling/rules"
            className="px-3 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-md text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>Regras do Motor</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards com cantos arredondados padrão (rounded-md) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 lg:gap-3">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`p-3 lg:p-4 rounded-md border transition cursor-pointer shadow-sm ${
            statusFilter === 'ALL'
              ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-500 ring-1 ring-blue-500'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total na Rede</span>
          <div className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white mt-1.5">{counts.all}</div>
        </div>

        <div
          onClick={() => setStatusFilter('PENDENTE_REGULACAO')}
          className={`p-3 lg:p-4 rounded-md border transition cursor-pointer shadow-sm ${
            statusFilter === 'PENDENTE_REGULACAO'
              ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-500 ring-1 ring-amber-500'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Pendente Avaliação</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl lg:text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1.5">{counts.toEvaluate}</div>
        </div>

        <div
          onClick={() => setStatusFilter('PENDENTE_AGENDAMENTO')}
          className={`p-3 lg:p-4 rounded-md border transition cursor-pointer shadow-sm ${
            statusFilter === 'PENDENTE_AGENDAMENTO'
              ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-500 ring-1 ring-blue-500'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 dark:text-blue-400">Pendente Agendamento</span>
            <Calendar className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl lg:text-2xl font-bold text-blue-700 dark:text-blue-400 mt-1.5">{counts.toSchedule}</div>
        </div>

        <div
          onClick={() => setStatusFilter('AGENDADA')}
          className={`p-3 lg:p-4 rounded-md border transition cursor-pointer shadow-sm ${
            statusFilter === 'AGENDADA'
              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-500 ring-1 ring-emerald-500'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Agendadas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl lg:text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1.5">{counts.scheduled}</div>
        </div>

        <div
          onClick={() => setStatusFilter('DEVOLVIDA')}
          className={`p-3 lg:p-4 rounded-md border transition cursor-pointer shadow-sm ${
            statusFilter === 'DEVOLVIDA'
              ? 'bg-orange-50/70 dark:bg-orange-950/30 border-orange-500 ring-1 ring-orange-500'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-700 dark:text-orange-400">Devolvidas p/ UBS</span>
            <RotateCcw className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-xl lg:text-2xl font-bold text-orange-700 dark:text-orange-400 mt-1.5">{counts.returned}</div>
        </div>
      </div>

      {/* Filters Bar com cantos arredondados padrão (rounded-md) */}
      <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-sm space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          {/* Busca por texto */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por protocolo, paciente, CPF, chave..."
              className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Filtro Unidade Solicitante (UBS) */}
          <div>
            <select
              value={requestingCenterFilter}
              onChange={(e) => setRequestingCenterFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Todas as UBS</option>
              {healthCentersData?.data?.map((hc) => (
                <option key={hc.id} value={hc.id}>
                  {hc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Status */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Todos os Status</option>
              <option value="PENDENTE_REGULACAO">Pendente Regulação</option>
              <option value="PENDENTE_AGENDAMENTO">Pendente Agendamento</option>
              <option value="AGENDADA">Agendada</option>
              <option value="DEVOLVIDA">Devolvida para UBS</option>
              <option value="NEGADA">Negada / Indeferida</option>
              <option value="AGENDAMENTO_CANCELADO">Agendamento Cancelado</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </div>

          {/* Filtro Tipo */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Todos os Tipos</option>
              <option value="CONSULTA">Consulta Especializada</option>
              <option value="EXAME">Exame</option>
              <option value="PROCEDIMENTO">Procedimento</option>
            </select>
          </div>

          {/* Filtro Prioridade */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Todas as Prioridades</option>
              <option value="URGENCIA">Urgência</option>
              <option value="PRIORITARIO">Prioritário</option>
              <option value="ELETIVO">Eletivo</option>
            </select>
          </div>
        </div>
      </div>

      {/* LISTAGEM: Visualização Otimizada para Mobile (Cards) e Desktop (Tabela) */}
      {isLoading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-12 text-center text-slate-500 shadow-sm">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Carregando fila da regulação municipal...</span>
          </div>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-10 text-center text-slate-500 shadow-sm text-xs">
          Nenhuma solicitação encontrada para os filtros aplicados.
        </div>
      ) : (
        <>
          {/* 1. CARDS PARA MOBILE (md:hidden) */}
          <div className="space-y-3 md:hidden">
            {filteredRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3.5 shadow-sm space-y-3 overflow-hidden"
              >
                {/* Topo do card: Protocolo e Status */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <Link
                    to={`/regulation/requests/${req.id}`}
                    className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    title="Ver página de detalhes da solicitação"
                  >
                    {req.protocolNumber}
                  </Link>
                  <div>{getStatusBadge(req.status)}</div>
                </div>

                {/* Dados do Paciente e UBS de Origem */}
                <div className="space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white text-sm">
                    {req.patient?.name}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {req.patient?.cpf && !req.patient.cpf.toUpperCase().startsWith('SUS') && req.patient.cpf.replace(/\D/g, '').length === 11 ? (
                      <>CPF: {formatCPF(req.patient.cpf)} • </>
                    ) : null}
                    {req.patient?.cns && `CNS: ${formatCNS(req.patient?.cns)} • `}Origem:{' '}
                    <span className="font-medium text-slate-700 dark:text-slate-300 font-sans">
                      {req.requestingHealthCenter?.name}
                    </span>
                  </div>
                  <div className="pt-1">
                    {req.procedureGroup ? (
                      <div>
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 block">
                          {req.procedureGroup.name}
                        </span>
                        {(() => {
                          const groupProcs: Array<{ name: string; code?: string; sigtapCode?: string }> =
                            req.groupProcedures && req.groupProcedures.length > 0
                              ? req.groupProcedures
                              : (req.procedure ? [req.procedure] : []);
                          const firstProcName = groupProcs[0]?.name || req.procedure?.name || 'Procedimento';
                          const extraCount = groupProcs.length > 1 ? groupProcs.length - 1 : 0;
                          const tooltipText = groupProcs
                            .map((p, idx) => `${idx + 1}. ${p.name}${p.sigtapCode || p.code ? ` (${p.sigtapCode || p.code})` : ''}`)
                            .join('\n');

                          return (
                            <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {req.type}
                              </span>
                              <span title={tooltipText} className="font-medium text-slate-800 dark:text-slate-200">
                                {firstProcName}
                              </span>
                              {extraCount > 0 && (
                                <span
                                  title={tooltipText}
                                  className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 cursor-help"
                                >
                                  +{extraCount}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div>
                        <span className="text-xs font-medium text-slate-800 dark:text-slate-200 block">
                          {req.procedure ? req.procedure.name : req.specialty?.name}
                        </span>
                        <span className="text-[11px] text-slate-500">{req.type}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Prioridade, Chave e Data */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    {getPriorityBadge(req.priority)}
                    <span className="text-[11px] text-slate-400">
                      {new Date(req.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  {req.confirmationToken && (
                    <div className="flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-md font-bold">
                      <Key className="w-3 h-3 text-emerald-600" />
                      <span>{req.confirmationToken}</span>
                    </div>
                  )}
                </div>

                {/* Ações Regulatórias no rodapé do card móvel (responsivo e sem extrapolar o card) */}
                <div className="flex flex-wrap items-center justify-end gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {(isAdmin || isRegulator) && req.status !== 'CANCELADA' && req.status !== 'NEGADA' && (
                    <Link
                      to={`/regulation/requests/${req.id}/change-procedure`}
                      title="Alterar Procedimento"
                      className="p-1.5 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-md inline-flex items-center shrink-0"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                    </Link>
                  )}

                  <Link
                    to={`/regulation/requests/${req.id}`}
                    className="px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-md flex items-center gap-1 shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Detalhes</span>
                  </Link>

                  <button
                    onClick={() => setPrintingRequest(req)}
                    className="px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-md flex items-center gap-1 cursor-pointer shrink-0"
                    title="Imprimir Ficha de Solicitação"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>Imprimir</span>
                  </button>

                  {req.status === 'PENDENTE_REGULACAO' && (
                    <button
                      onClick={() => setEvaluatingRequest(req)}
                      className="px-2.5 py-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center gap-1 shadow-sm shrink-0"
                    >
                      <Stethoscope className="w-3.5 h-3.5" />
                      <span>Avaliar</span>
                    </button>
                  )}

                  {req.status === 'PENDENTE_AGENDAMENTO' && (
                    <button
                      onClick={() => setSlotBookingRequest(req)}
                      className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md flex items-center gap-1 shadow-sm transition cursor-pointer shrink-0"
                      title="Agendar vaga na escala de atendimento"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Agendar Vaga</span>
                    </button>
                  )}

                  {req.status === 'AGENDADA' && (
                    <button
                      onClick={() => setCancelingScheduleRequest(req)}
                      className="px-2 py-1 text-[11px] font-semibold text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md flex items-center gap-1 shrink-0"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Cancelar</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 2. TABELA PARA DESKTOP (hidden md:block) */}
          <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Protocolo</th>
                    <th className="px-4 py-3">Paciente</th>
                    <th className="px-4 py-3">Unidade Origem (UBS)</th>
                    <th className="px-4 py-3">Procedimento / Especialidade</th>
                    <th className="px-4 py-3">Prioridade</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Chave Confirmação</th>
                    <th className="px-4 py-3 text-right">Ações Regulatórias</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                        <Link to={`/regulation/requests/${req.id}`} className="hover:underline">
                          {req.protocolNumber}
                        </Link>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-white">{req.patient?.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {req.patient?.cpf && !req.patient.cpf.toUpperCase().startsWith('SUS') && req.patient.cpf.replace(/\D/g, '').length === 11 ? (
                            <>CPF: {formatCPF(req.patient.cpf)} • </>
                          ) : null}
                          {req.patient?.cns && `CNS: ${formatCNS(req.patient?.cns)}`}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {req.requestingHealthCenter?.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(req.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {req.procedureGroup ? (
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {req.procedureGroup.name}
                            </div>
                            {(() => {
                              const groupProcs: Array<{ name: string; code?: string; sigtapCode?: string }> =
                                req.groupProcedures && req.groupProcedures.length > 0
                                  ? req.groupProcedures
                                  : (req.procedure ? [req.procedure] : []);
                              const firstProcName = groupProcs[0]?.name || req.procedure?.name || 'Procedimento';
                              const extraCount = groupProcs.length > 1 ? groupProcs.length - 1 : 0;
                              const tooltipText = groupProcs
                                .map((p, idx) => `${idx + 1}. ${p.name}${p.sigtapCode || p.code ? ` (${p.sigtapCode || p.code})` : ''}`)
                                .join('\n');

                              return (
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                    {req.type}
                                  </span>
                                  <span title={tooltipText} className="font-medium text-slate-700 dark:text-slate-300">
                                    {firstProcName}
                                  </span>
                                  {extraCount > 0 && (
                                    <span
                                      title={tooltipText}
                                      className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 cursor-help"
                                    >
                                      +{extraCount}
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        ) : (
                          <div>
                            <div className="font-medium text-slate-800 dark:text-slate-200">
                              {req.procedure ? req.procedure.name : req.specialty?.name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {req.type}
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">{getPriorityBadge(req.priority)}</td>

                      <td className="px-4 py-3">{getStatusBadge(req.status)}</td>

                      <td className="px-4 py-3 font-mono">
                        {req.confirmationToken ? (
                          <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-md font-bold tracking-wider">
                            {req.confirmationToken}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => setPrintingRequest(req)}
                          title="Imprimir Ficha de Solicitação"
                          className="p-1.5 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        <Link
                          to={`/regulation/requests/${req.id}`}
                          title="Ver Detalhes da Solicitação"
                          className="p-1.5 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition inline-flex items-center cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>

                        {/* Botão Alterar Procedimento (Apenas ícone, somente Regulador/Administrador) */}
                        {(isAdmin || isRegulator) && req.status !== 'CANCELADA' && req.status !== 'NEGADA' && (
                          <Link
                            to={`/regulation/requests/${req.id}/change-procedure`}
                            title="Alterar Procedimento"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition inline-flex items-center cursor-pointer"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </Link>
                        )}

                        {/* Botão Avaliar (quando pendente de regulação) */}
                        {req.status === 'PENDENTE_REGULACAO' && (
                          <button
                            onClick={() => setEvaluatingRequest(req)}
                            className="px-2.5 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Stethoscope className="w-3.5 h-3.5" />
                            <span>Avaliar</span>
                          </button>
                        )}

                        {/* Botão Agendar (quando pendente de agendamento) */}
                        {req.status === 'PENDENTE_AGENDAMENTO' && (
                          <button
                            onClick={() => setSlotBookingRequest(req)}
                            className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-sm transition inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Agendar Vaga</span>
                          </button>
                        )}

                        {/* Botão Cancelar Agendamento (quando já agendada) */}
                        {req.status === 'AGENDADA' && (
                          <button
                            onClick={() => setCancelingScheduleRequest(req)}
                            title="Cancelar Agendamento"
                            className="p-1.5 text-red-500 hover:text-red-700 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modais da Central de Regulação */}
      <EvaluateRegulationModal
        isOpen={!!evaluatingRequest}
        onClose={() => {
          setEvaluatingRequest(null);
          refetch();
        }}
        request={evaluatingRequest}
      />

      <ScheduleRegulationModal
        isOpen={!!schedulingRequest}
        onClose={() => {
          setSchedulingRequest(null);
          refetch();
        }}
        request={schedulingRequest}
      />

      <BookSlotModal
        isOpen={!!slotBookingRequest}
        onClose={() => {
          setSlotBookingRequest(null);
          refetch();
        }}
        request={slotBookingRequest}
        onSuccess={() => refetch()}
      />

      <RequestDetailsModal
        isOpen={!!detailsRequest}
        onClose={() => setDetailsRequest(null)}
        request={detailsRequest}
      />

      {printingRequest && (
        <RegulationRequestPrintModal
          isOpen={!!printingRequest}
          onClose={() => setPrintingRequest(null)}
          request={printingRequest}
        />
      )}

      {/* Modal Cancelar Agendamento com Justificativa Obrigatória e cantos rounded-md */}
      {cancelingScheduleRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-md p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2.5 text-red-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Cancelar Agendamento</h3>
            </div>
            <p className="text-xs text-slate-500">
              Protocolo: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{cancelingScheduleRequest.protocolNumber}</span> • Paciente: {cancelingScheduleRequest.patient?.name}
            </p>

            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/60 rounded-md text-xs text-red-800 dark:text-red-300">
              A chave atual <span className="font-mono font-bold">{cancelingScheduleRequest.confirmationToken}</span> será invalidada.
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="returnQueueCheck"
                checked={returnToQueue}
                onChange={(e) => setReturnToQueue(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700"
              />
              <label htmlFor="returnQueueCheck" className="text-xs text-slate-700 dark:text-slate-300">
                Retornar solicitação para a fila de agendamento (Pendente Agendamento)
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Justificativa Obrigatória do Cancelamento <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={cancelScheduleJustification}
                onChange={(e) => setCancelScheduleJustification(e.target.value)}
                placeholder="Informe o motivo do cancelamento do agendamento (ausência de médico, solicitação do paciente, etc)..."
                className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setCancelingScheduleRequest(null);
                  setCancelScheduleJustification('');
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md transition"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelSchedule}
                disabled={cancelScheduleMutation.isPending}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-md transition shadow-md disabled:opacity-50"
              >
                {cancelScheduleMutation.isPending ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
