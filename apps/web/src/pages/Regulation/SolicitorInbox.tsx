import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Clock,
  CheckCircle2,
  RotateCcw,
  Eye,
  FileText,
  Ban,
  AlertTriangle,
  Key,
  Calendar,
  Printer,
  ArrowRightLeft,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';
import {
  useRegulationMyCenter,
  useCancelBySolicitor,
} from '../../hooks/useRegulation';
import type { RegulationRequest, RegulationRequestStatus } from '../../services/regulation';
import { RequestDetailsModal } from './RequestDetailsModal';
import { BookSlotModal } from './BookSlotModal';
import { RegulationRequestPrintModal } from './RegulationRequestPrintModal';
import { TablePagination } from '../../components/TablePagination';
import { useAuthStore } from '../../store/useAuthStore';
import { formatCPF, formatCNS, formatDateBR } from '../../utils/brazilianFormatters';
import { toast } from 'sonner';

export const SolicitorInbox: React.FC = () => {
  const navigate = useNavigate();
  const permissions = useAuthStore((state) => state.permissions);
  const activeProfile = useAuthStore((state) => state.activeProfile);
  const isAdmin = permissions.includes('admin:access');
  const isRegulator =
    activeProfile?.name === 'Regulador (Central de Regulação)' ||
    permissions.includes('regulation-operator:read');

  // States
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'RETURNED' | 'SCHEDULED' | 'FINISHED'>('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [selectedDetailsRequest, setSelectedDetailsRequest] = useState<RegulationRequest | null>(null);
  const [bookingSlotRequest, setBookingSlotRequest] = useState<RegulationRequest | null>(null);
  const [printingRequest, setPrintingRequest] = useState<RegulationRequest | null>(null);

  // Cancel modal state
  const [cancelModalRequest, setCancelModalRequest] = useState<RegulationRequest | null>(null);
  const [cancelJustification, setCancelJustification] = useState('');

  // Queries
  const { data: requestsResponse, isLoading, refetch } = useRegulationMyCenter();
  const cancelMutation = useCancelBySolicitor();

  const requests = requestsResponse?.data || [];

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      // 1. Status Filter (Dropdown ou Tab)
      if (statusFilter !== 'ALL') {
        if (req.status !== statusFilter) return false;
      } else {
        if (activeTab === 'PENDING' && req.status !== 'PENDENTE_REGULACAO') return false;
        if (activeTab === 'RETURNED' && req.status !== 'DEVOLVIDA') return false;
        if (activeTab === 'SCHEDULED' && req.status !== 'AGENDADA') return false;
        if (
          activeTab === 'FINISHED' &&
          req.status !== 'NEGADA' &&
          req.status !== 'CANCELADA' &&
          req.status !== 'AGENDAMENTO_CANCELADO'
        )
          return false;
      }

      // 2. Tipo Filter (Consulta, Exame, Cirúrgico, Laboratorial)
      if (typeFilter !== 'ALL') {
        const procName = (req.procedure?.name || '').toUpperCase();
        const procCode = (req.procedure?.code || '').toUpperCase();
        const groupName = (req.procedureGroup?.name || '').toUpperCase();

        if (typeFilter === 'CONSULTA') {
          if (req.type !== 'CONSULTA') return false;
        } else if (typeFilter === 'CIRURGICO') {
          const isSurgical =
            req.type === 'PROCEDIMENTO' ||
            procName.includes('CIRURG') ||
            procCode.startsWith('04') ||
            groupName.includes('CIRURG') ||
            procName.includes('BIOPSIA') ||
            procName.includes('EXERESE');
          if (!isSurgical) return false;
        } else if (typeFilter === 'LABORATORIAL') {
          const isLab =
            procCode.startsWith('0202') ||
            groupName.includes('LABORAT') ||
            procName.includes('LABORAT') ||
            procName.includes('HEMOGRAMA') ||
            procName.includes('SANGUE') ||
            procName.includes('URINA') ||
            procName.includes('FEZES') ||
            procName.includes('GLICEMIA');
          if (!isLab) return false;
        } else if (typeFilter === 'EXAME') {
          const isLab =
            procCode.startsWith('0202') ||
            groupName.includes('LABORAT') ||
            procName.includes('HEMOGRAMA');
          if (req.type !== 'EXAME' || isLab) return false;
        }
      }

      // 3. Search term (busca por protocolo, paciente, cpf, token, procedimento principal, grupo E procedimentos internos do grupo!)
      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase();
        const matchesProtocol = (req.protocolNumber || '').toLowerCase().includes(s);
        const matchesPatient = (req.patient?.name || '').toLowerCase().includes(s);
        const matchesCpf = (req.patient?.cpf || '').includes(s);
        const matchesToken = (req.confirmationToken || '').toLowerCase().includes(s);
        const matchesProcedure = (req.procedure?.name || req.specialty?.name || '').toLowerCase().includes(s);
        const matchesGroup = (req.procedureGroup?.name || '').toLowerCase().includes(s);
        const matchesGroupProcs = (req.groupProcedures || []).some(
          (gp: any) =>
            (gp.name || '').toLowerCase().includes(s) ||
            (gp.code || '').toLowerCase().includes(s) ||
            (gp.sigtapCode || '').toLowerCase().includes(s)
        );
        return (
          matchesProtocol ||
          matchesPatient ||
          matchesCpf ||
          matchesToken ||
          matchesProcedure ||
          matchesGroup ||
          matchesGroupProcs
        );
      }

      return true;
    });
  }, [requests, activeTab, statusFilter, typeFilter, searchTerm]);

  // Sorting & Pagination States (Estilo Listagem de Pacientes)
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  useEffect(() => {
    setPage(1);
  }, [activeTab, statusFilter, typeFilter, searchTerm]);

  // Lista ordenada
  const sortedRequests = useMemo(() => {
    const list = [...filteredRequests];
    list.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'protocolNumber':
          comparison = (a.protocolNumber || '').localeCompare(b.protocolNumber || '');
          break;
        case 'patient':
          comparison = (a.patient?.name || '').localeCompare(b.patient?.name || '');
          break;
        case 'procedure': {
          const nameA = a.procedure?.name || a.specialty?.name || '';
          const nameB = b.procedure?.name || b.specialty?.name || '';
          comparison = nameA.localeCompare(nameB);
          break;
        }
        case 'priority': {
          const priorityWeight: Record<string, number> = {
            URGENCIA: 3,
            PRIORITARIO: 2,
            ELETIVO: 1,
          };
          comparison = (priorityWeight[a.priority] || 0) - (priorityWeight[b.priority] || 0);
          break;
        }
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
        case 'token':
          comparison = (a.confirmationToken || '').localeCompare(b.confirmationToken || '');
          break;
        case 'createdAt':
        default: {
          const timeA = new Date(a.createdAt).getTime();
          const timeB = new Date(b.createdAt).getTime();
          comparison = timeA - timeB;
          break;
        }
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return list;
  }, [filteredRequests, sortBy, sortOrder]);

  const total = sortedRequests.length;

  const paginatedRequests = useMemo(() => {
    const start = (page - 1) * limit;
    return sortedRequests.slice(start, start + limit);
  }, [sortedRequests, page, limit]);

  const renderSortHeader = (label: string, field: string) => {
    const isSorted = sortBy === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className="px-2 py-1.5 lg:px-3 lg:py-2.5 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-white transition-colors duration-150 select-none group"
      >
        <div className="flex items-center gap-1.5">
          <span>{label}</span>
          {isSorted ? (
            sortOrder === 'asc' ? (
              <ArrowUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            )
          ) : (
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-500 dark:text-slate-400 opacity-0 group-hover:opacity-100 transition-all" />
          )}
        </div>
      </th>
    );
  };

  // Counts
  const counts = useMemo(() => {
    return {
      all: requests.length,
      pending: requests.filter((r) => r.status === 'PENDENTE_REGULACAO').length,
      returned: requests.filter((r) => r.status === 'DEVOLVIDA').length,
      scheduled: requests.filter((r) => r.status === 'AGENDADA').length,
      finished: requests.filter((r) => ['NEGADA', 'CANCELADA', 'AGENDAMENTO_CANCELADO'].includes(r.status)).length,
    };
  }, [requests]);

  const handleConfirmCancel = async () => {
    if (!cancelModalRequest) return;
    if (!cancelJustification || cancelJustification.trim().length < 5) {
      toast.error('Informe a justificativa do cancelamento (mínimo 5 caracteres).');
      return;
    }

    try {
      await cancelMutation.mutateAsync({
        id: cancelModalRequest.id,
        justification: cancelJustification.trim(),
      });
      setCancelModalRequest(null);
      setCancelJustification('');
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
            Autorizada (Aguardando)
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
            Devolvida p/ Correção
          </span>
        );
      case 'NEGADA':
        return (
          <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
            Indeferida / Negada
          </span>
        );
      case 'CANCELADA':
        return (
          <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300">
            Cancelada
          </span>
        );
      case 'AGENDAMENTO_CANCELADO':
        return (
          <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300">
            Agendamento Cancelado
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
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
              Atenção Primária / UBS
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Módulo Solicitante</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
            Minhas Solicitações de Regulação
          </h1>
          <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400">
            Acompanhe os pedidos de consultas especializadas e exames encaminhados pela sua unidade.
          </p>
        </div>

        {(permissions.includes('regulation-solicitor:write') || isAdmin) && (
          <button
            onClick={() => navigate('/regulation/solicitor/new')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md text-sm transition shadow-md active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Solicitação</span>
          </button>
        )}
      </div>

      {/* Stats Cards com cantos arredondados padrão (rounded-md) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-4">
        <div className="p-3 lg:p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Solicitado</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white mt-1.5">{counts.all}</div>
        </div>

        <div className="p-3 lg:p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Em Análise</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl lg:text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1.5">{counts.pending}</div>
        </div>

        <div
          onClick={() => setActiveTab('RETURNED')}
          className="p-3 lg:p-4 bg-white dark:bg-slate-900 border border-orange-300 dark:border-orange-800/80 rounded-md shadow-sm cursor-pointer hover:bg-orange-50/30 transition relative overflow-hidden"
        >
          {counts.returned > 0 && (
            <div className="absolute top-2 right-2 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-600 dark:text-orange-400">Devolvidas</span>
            <RotateCcw className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-xl lg:text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1.5">{counts.returned}</div>
        </div>

        <div className="p-3 lg:p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Agendadas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl lg:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1.5">{counts.scheduled}</div>
        </div>
      </div>

      {/* Tabs & Filtros & Search com cantos arredondados padrão e scroll suave em mobile */}
      <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-md p-2.5 lg:p-3 shadow-sm flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1 sm:pb-0 shrink-0">
          {[
            { id: 'ALL', label: 'Todas', count: counts.all },
            { id: 'PENDING', label: 'Aguardando', count: counts.pending },
            { id: 'RETURNED', label: 'Devolvidas', count: counts.returned, alert: counts.returned > 0 },
            { id: 'SCHEDULED', label: 'Agendadas', count: counts.scheduled },
            { id: 'FINISHED', label: 'Encerradas', count: counts.finished },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setStatusFilter('ALL');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === tab.id && statusFilter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  tab.alert
                    ? 'bg-orange-500 text-white font-bold'
                    : activeTab === tab.id && statusFilter === 'ALL'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Espaço entre os filtros e a busca: Dropdown de Status e Dropdown de Tipo */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 flex-1 justify-start xl:justify-center">
          {/* Seletor de Status */}
          <div className="w-full sm:w-auto min-w-[160px]">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                if (e.target.value !== 'ALL') {
                  setActiveTab('ALL');
                }
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-medium"
            >
              <option value="ALL">Status: Todos</option>
              <option value="PENDENTE_REGULACAO">Pendente Regulação</option>
              <option value="PENDENTE_AGENDAMENTO">Autorizada (Aguardando)</option>
              <option value="AGENDADA">Agendada</option>
              <option value="DEVOLVIDA">Devolvida p/ Correção</option>
              <option value="NEGADA">Indeferida / Negada</option>
              <option value="AGENDAMENTO_CANCELADO">Agendamento Cancelado</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </div>

          {/* Seletor de Tipo (Consulta, Exame, Cirúrgico, Laboratorial) */}
          <div className="w-full sm:w-auto min-w-[160px]">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-medium"
            >
              <option value="ALL">Tipo: Todos</option>
              <option value="CONSULTA">Consultas</option>
              <option value="EXAME">Exames</option>
              <option value="CIRURGICO">Procedimentos Cirúrgicos</option>
              <option value="LABORATORIAL">Laboratoriais</option>
            </select>
          </div>
        </div>

        {/* Busca */}
        <div className="relative w-full sm:max-w-xs shrink-0">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por protocolo, paciente, chave, procedimento..."
            className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* LISTAGEM: Visualização Otimizada para Mobile (Cards) e Desktop (Tabela) */}
      {isLoading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-12 text-center text-slate-500 shadow-sm">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Carregando solicitações da unidade...</span>
          </div>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-10 text-center text-slate-500 shadow-sm text-xs">
          Nenhuma solicitação encontrada para o filtro selecionado.
        </div>
      ) : (
        <>
          {/* 1. CARDS PARA MOBILE (md:hidden) */}
          <div className="space-y-3 md:hidden">
            {paginatedRequests.map((req) => (
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

                {/* Dados do Paciente e Procedimento */}
                <div className="space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white text-sm">
                    {req.patient?.name}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {req.patient?.cpf && !req.patient.cpf.toUpperCase().startsWith('SUS') && req.patient.cpf.replace(/\D/g, '').length === 11 ? (
                      <>CPF: {formatCPF(req.patient.cpf)} • </>
                    ) : null}
                    CNS: {formatCNS(req.patient?.cns)}
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
                      {formatDateBR(req.createdAt)}
                    </span>
                  </div>

                  {req.confirmationToken && (
                    <div className="flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-md font-bold">
                      <Key className="w-3 h-3 text-emerald-600" />
                      <span>{req.confirmationToken}</span>
                    </div>
                  )}
                </div>

                {/* Ações no rodapé do card móvel (responsivo e sem extrapolar o card) */}
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

                  {!req.procedure?.requiresRegulation && req.status === 'PENDENTE_REGULACAO' && (
                    <button
                      onClick={() => setBookingSlotRequest(req)}
                      className="px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-md flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Agendar</span>
                    </button>
                  )}

                  {req.status === 'DEVOLVIDA' && (
                    <Link
                      to={`/regulation/requests/${req.id}?edit=true`}
                      className="px-2 py-1 text-[11px] font-semibold text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded-md flex items-center gap-1 shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Corrigir & Reenviar</span>
                    </Link>
                  )}

                  {!['CANCELADA', 'NEGADA'].includes(req.status) && (
                    <button
                      onClick={() => setCancelModalRequest(req)}
                      className="px-2 py-1 text-[11px] font-semibold text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md flex items-center gap-1 shrink-0"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Cancelar</span>
                    </button>
                  )}

                  <Link
                    to={`/regulation/requests/${req.id}`}
                    className="px-2 py-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-md flex items-center gap-1 shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Detalhes</span>
                  </Link>

                  <button
                    onClick={() => setPrintingRequest(req)}
                    title="Imprimir Ficha de Solicitação"
                    className="px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>Imprimir</span>
                  </button>
                </div>
              </div>
            ))}

            {/* Paginação Mobile */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden shadow-sm">
              <TablePagination
                page={page}
                limit={limit}
                total={total}
                onPageChange={setPage}
                onLimitChange={(newLimit) => {
                  setLimit(newLimit);
                  setPage(1);
                }}
              />
            </div>
          </div>

          {/* 2. TABELA PARA DESKTOP COM PAGINAÇÃO E ORDENAÇÃO (Estilo Listagem de Pacientes) */}
          <div className="hidden md:block bg-white shadow-md dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-md overflow-hidden backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    {renderSortHeader('Protocolo', 'protocolNumber')}
                    {renderSortHeader('Paciente', 'patient')}
                    {renderSortHeader('Procedimento / Grupo', 'procedure')}
                    {renderSortHeader('Prioridade', 'priority')}
                    {renderSortHeader('Chave Confirmação', 'token')}
                    {renderSortHeader('Data', 'createdAt')}
                    <th className="px-2 py-1.5 lg:px-3 lg:py-2.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-sm">
                  {paginatedRequests && paginatedRequests.length > 0 ? (
                    paginatedRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-200 dark:bg-slate-800/20 transition-colors duration-150 group">
                        <td className="px-2 py-1.5 lg:px-3 lg:py-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                          <Link to={`/regulation/requests/${req.id}`} className="hover:underline">
                            {req.protocolNumber}
                          </Link>
                        </td>

                        <td className="px-2 py-1.5 lg:px-3 lg:py-2.5">
                          <div className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">
                            {req.patient?.name}
                          </div>
                          <div className="text-xs text-slate-500 font-mono">
                            {req.patient?.cpf && !req.patient.cpf.toUpperCase().startsWith('SUS') && req.patient.cpf.replace(/\D/g, '').length === 11 ? (
                              <>CPF: {formatCPF(req.patient.cpf)} • </>
                            ) : null}
                            CNS: {formatCNS(req.patient?.cns)}
                          </div>
                        </td>

                        <td className="px-2 py-1.5 lg:px-3 lg:py-2.5">
                          {req.procedureGroup ? (
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">
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
                                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
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
                              <div className="text-xs text-slate-500">
                                {req.type}
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="px-2 py-1.5 lg:px-3 lg:py-2.5">{getPriorityBadge(req.priority)}</td>

                        <td className="px-2 py-1.5 lg:px-3 lg:py-2.5 font-mono">
                          {req.confirmationToken ? (
                            <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-md font-bold tracking-wider text-xs">
                              {req.confirmationToken}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>

                        <td className="px-2 py-1.5 lg:px-3 lg:py-2.5 text-slate-500 text-xs whitespace-nowrap">
                          {formatDateBR(req.createdAt)}
                        </td>

                        <td className="px-2 py-1.5 lg:px-3 lg:py-2.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {(isAdmin || isRegulator) && req.status !== 'CANCELADA' && req.status !== 'NEGADA' && (
                              <Link
                                to={`/regulation/requests/${req.id}/change-procedure`}
                                title="Alterar Procedimento"
                                className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition inline-flex items-center cursor-pointer shadow-sm"
                              >
                                <ArrowRightLeft className="w-4 h-4" />
                              </Link>
                            )}

                            {!req.procedure?.requiresRegulation && req.status === 'PENDENTE_REGULACAO' && (
                              <button
                                onClick={() => setBookingSlotRequest(req)}
                                title="Agendar Vaga (Procedimento Não Regulado)"
                                className="p-1.5 text-emerald-600 hover:text-emerald-700 rounded-md bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 transition cursor-pointer shadow-sm"
                              >
                                <Calendar className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              onClick={() => setPrintingRequest(req)}
                              title="Imprimir Ficha de Solicitação"
                              className="p-1.5 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shadow-sm"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            <Link
                              to={`/regulation/requests/${req.id}`}
                              title="Ver Detalhes da Solicitação"
                              className="p-1.5 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition inline-flex items-center cursor-pointer shadow-sm"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>

                            {req.status === 'DEVOLVIDA' && (
                              <Link
                                to={`/regulation/requests/${req.id}?edit=true`}
                                title="Corrigir e Reenviar"
                                className="p-1.5 text-orange-600 hover:text-orange-700 rounded-md bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 transition inline-flex items-center cursor-pointer shadow-sm"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Link>
                            )}

                            {!['CANCELADA', 'NEGADA'].includes(req.status) && (
                              <button
                                onClick={() => setCancelModalRequest(req)}
                                title="Cancelar Solicitação"
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer shadow-sm"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-slate-500 italic">
                        Nenhuma solicitação encontrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <TablePagination
              page={page}
              limit={limit}
              total={total}
              onPageChange={setPage}
              onLimitChange={(newLimit) => {
                setLimit(newLimit);
                setPage(1);
              }}
            />
          </div>
        </>
      )}

      {/* Modais de Detalhes e Reenvio */}
      <RequestDetailsModal
        isOpen={!!selectedDetailsRequest}
        onClose={() => setSelectedDetailsRequest(null)}
        request={selectedDetailsRequest}
      />

      <BookSlotModal
        isOpen={!!bookingSlotRequest}
        onClose={() => {
          setBookingSlotRequest(null);
          refetch();
        }}
        request={bookingSlotRequest}
        onSuccess={() => refetch()}
      />

      {printingRequest && (
        <RegulationRequestPrintModal
          isOpen={!!printingRequest}
          onClose={() => setPrintingRequest(null)}
          request={printingRequest}
        />
      )}

      {/* Modal de Cancelamento com Justificativa Obrigatória e cantos rounded-md */}
      {cancelModalRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-md p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2.5 text-red-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Cancelar Solicitação</h3>
            </div>
            <p className="text-xs text-slate-500">
              Protocolo: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{cancelModalRequest.protocolNumber}</span> • Paciente: {cancelModalRequest.patient?.name}
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Justificativa Obrigatória do Cancelamento <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={cancelJustification}
                onChange={(e) => setCancelJustification(e.target.value)}
                placeholder="Informe o motivo pelo qual o munícipe ou a UBS está cancelando este pedido..."
                className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setCancelModalRequest(null);
                  setCancelJustification('');
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md transition"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelMutation.isPending}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-md transition shadow-md disabled:opacity-50"
              >
                {cancelMutation.isPending ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
