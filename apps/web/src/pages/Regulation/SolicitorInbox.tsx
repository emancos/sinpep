import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import {
  useRegulationMyCenter,
  useCancelBySolicitor,
} from '../../hooks/useRegulation';
import type { RegulationRequest, RegulationRequestStatus } from '../../services/regulation';
import { RequestDetailsModal } from './RequestDetailsModal';
import { ResubmitReturnedModal } from './ResubmitReturnedModal';
import { toast } from 'sonner';

export const SolicitorInbox: React.FC = () => {
  const navigate = useNavigate();

  // States
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'RETURNED' | 'SCHEDULED' | 'FINISHED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [selectedDetailsRequest, setSelectedDetailsRequest] = useState<RegulationRequest | null>(null);
  const [selectedResubmitRequest, setSelectedResubmitRequest] = useState<RegulationRequest | null>(null);

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
      // Tab filter
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

      // Search term
      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase();
        const matchesProtocol = (req.protocolNumber || '').toLowerCase().includes(s);
        const matchesPatient = (req.patient?.name || '').toLowerCase().includes(s);
        const matchesCpf = (req.patient?.cpf || '').includes(s);
        const matchesToken = (req.confirmationToken || '').toLowerCase().includes(s);
        const matchesProcedure = (req.procedure?.name || req.specialty?.name || '').toLowerCase().includes(s);
        return matchesProtocol || matchesPatient || matchesCpf || matchesToken || matchesProcedure;
      }

      return true;
    });
  }, [requests, activeTab, searchTerm]);

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

        <button
          onClick={() => navigate('/regulation/solicitor/new')}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md text-sm transition shadow-md active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Solicitação</span>
        </button>
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

      {/* Tabs & Search com cantos arredondados padrão e scroll suave em mobile */}
      <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-md p-2.5 lg:p-3 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'Todas', count: counts.all },
            { id: 'PENDING', label: 'Aguardando', count: counts.pending },
            { id: 'RETURNED', label: 'Devolvidas', count: counts.returned, alert: counts.returned > 0 },
            { id: 'SCHEDULED', label: 'Agendadas', count: counts.scheduled },
            { id: 'FINISHED', label: 'Encerradas', count: counts.finished },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  tab.alert
                    ? 'bg-orange-500 text-white font-bold'
                    : activeTab === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Busca */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por protocolo, paciente, chave..."
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
            {filteredRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3.5 shadow-sm space-y-3"
              >
                {/* Topo do card: Protocolo e Status */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                    {req.protocolNumber}
                  </span>
                  <div>{getStatusBadge(req.status)}</div>
                </div>

                {/* Dados do Paciente e Procedimento */}
                <div className="space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white text-sm">
                    {req.patient?.name}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    CPF: {req.patient?.cpf || 'S/N'} • CNS: {req.patient?.cns || 'S/N'}
                  </div>
                  <div className="pt-1">
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200 block">
                      {req.procedure ? req.procedure.name : req.specialty?.name}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {req.type} {req.procedureGroup && `• ${req.procedureGroup.name}`}
                    </span>
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

                {/* Ações no rodapé do card móvel */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {req.status === 'DEVOLVIDA' && (
                    <button
                      onClick={() => setSelectedResubmitRequest(req)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded-md flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reenviar</span>
                    </button>
                  )}

                  {!['CANCELADA', 'NEGADA'].includes(req.status) && (
                    <button
                      onClick={() => setCancelModalRequest(req)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md flex items-center gap-1"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Cancelar</span>
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedDetailsRequest(req)}
                    className="px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-md flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Detalhes</span>
                  </button>
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
                    <th className="px-4 py-3">Procedimento / Especialidade</th>
                    <th className="px-4 py-3">Prioridade</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Chave Confirmação</th>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {req.protocolNumber}
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-white">{req.patient?.name}</div>
                        <div className="text-[11px] text-slate-500">
                          CPF: {req.patient?.cpf || 'S/N'} • CNS: {req.patient?.cns || 'S/N'}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {req.procedure ? req.procedure.name : req.specialty?.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {req.type} {req.procedureGroup && `• ${req.procedureGroup.name}`}
                        </div>
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

                      <td className="px-4 py-3 text-slate-500 text-[11px]">
                        {new Date(req.createdAt).toLocaleDateString('pt-BR')}
                      </td>

                      <td className="px-4 py-3 text-right space-x-1.5">
                        <button
                          onClick={() => setSelectedDetailsRequest(req)}
                          title="Ver Detalhes e Auditoria"
                          className="p-1.5 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {req.status === 'DEVOLVIDA' && (
                          <button
                            onClick={() => setSelectedResubmitRequest(req)}
                            title="Reenviar com Correções"
                            className="p-1.5 text-orange-600 hover:text-orange-700 rounded-md bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 transition"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}

                        {!['CANCELADA', 'NEGADA'].includes(req.status) && (
                          <button
                            onClick={() => setCancelModalRequest(req)}
                            title="Cancelar Solicitação"
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition"
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

      {/* Modais de Detalhes e Reenvio */}
      <RequestDetailsModal
        isOpen={!!selectedDetailsRequest}
        onClose={() => setSelectedDetailsRequest(null)}
        request={selectedDetailsRequest}
      />

      <ResubmitReturnedModal
        isOpen={!!selectedResubmitRequest}
        onClose={() => {
          setSelectedResubmitRequest(null);
          refetch();
        }}
        request={selectedResubmitRequest}
      />

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
