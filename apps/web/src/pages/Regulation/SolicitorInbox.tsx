import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import {
  useRegulationMyCenter,
  useCancelBySolicitor,
} from '../../hooks/useRegulation';
import type { RegulationRequest, RegulationRequestStatus } from '../../services/regulation';
import { CreateRegulationRequestModal } from './CreateRegulationRequestModal';
import { RequestDetailsModal } from './RequestDetailsModal';
import { ResubmitReturnedModal } from './ResubmitReturnedModal';
import { toast } from 'sonner';

export const SolicitorInbox: React.FC = () => {

  // States
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'RETURNED' | 'SCHEDULED' | 'FINISHED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
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
    } catch (err) {
      // Handled in mutation
    }
  };

  const getStatusBadge = (status: RegulationRequestStatus) => {
    switch (status) {
      case 'PENDENTE_REGULACAO':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            Pendente Regulação
          </span>
        );
      case 'PENDENTE_AGENDAMENTO':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
            Autorizada (Pendente Agendamento)
          </span>
        );
      case 'AGENDADA':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
            Agendada
          </span>
        );
      case 'DEVOLVIDA':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 animate-pulse">
            Devolvida para Correção
          </span>
        );
      case 'NEGADA':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
            Indeferida / Negada
          </span>
        );
      case 'CANCELADA':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
            Cancelada
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              Atenção Básica (UBS)
            </span>
            <span className="text-xs text-gray-500">Módulo Solicitante</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            Minhas Solicitações de Regulação
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Acompanhe os encaminhamentos de consultas e exames especializados solicitados pela sua unidade.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-blue-500/20 flex items-center space-x-2 self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          <span>Nova Solicitação</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Solicitado</span>
            <FileText className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{counts.all}</div>
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Em Análise</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">{counts.pending}</div>
        </div>

        <div
          onClick={() => setActiveTab('RETURNED')}
          className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-orange-300 dark:border-orange-800 shadow-sm cursor-pointer hover:bg-orange-50/30 transition relative overflow-hidden"
        >
          {counts.returned > 0 && (
            <div className="absolute top-2 right-2 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-600 dark:text-orange-400">Devolvidas p/ Correção</span>
            <RotateCcw className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-2">{counts.returned}</div>
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Agendadas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{counts.scheduled}</div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-1 p-1 bg-gray-100 dark:bg-gray-750 rounded-xl overflow-x-auto">
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
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap flex items-center space-x-1.5 ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  tab.alert
                    ? 'bg-orange-500 text-white font-bold'
                    : activeTab === tab.id
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                    : 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative min-w-[260px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por protocolo, paciente, chave..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 uppercase font-semibold">
              <tr>
                <th className="px-5 py-3">Protocolo</th>
                <th className="px-5 py-3">Paciente</th>
                <th className="px-5 py-3">Procedimento / Especialidade</th>
                <th className="px-5 py-3">Prioridade</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Chave Confirmação</th>
                <th className="px-5 py-3">Data</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span>Carregando solicitações da unidade...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-gray-500">
                    Nenhuma solicitação encontrada para o filtro selecionado.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-750/50 transition">
                    <td className="px-5 py-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {req.protocolNumber}
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-gray-900 dark:text-white">{req.patient?.name}</div>
                      <div className="text-[11px] text-gray-500">
                        CPF: {req.patient?.cpf || 'S/N'} • CNS: {req.patient?.cns || 'S/N'}
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="font-medium text-gray-800 dark:text-gray-200">
                        {req.procedure ? req.procedure.name : req.specialty?.name}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {req.type} {req.procedureGroup && `• ${req.procedureGroup.name}`}
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          req.priority === 'URGENCIA'
                            ? 'bg-red-100 text-red-700'
                            : req.priority === 'PRIORITARIO'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {req.priority}
                      </span>
                    </td>

                    <td className="px-5 py-3.5">{getStatusBadge(req.status)}</td>

                    <td className="px-5 py-3.5 font-mono">
                      {req.confirmationToken ? (
                        <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded font-bold tracking-wider">
                          {req.confirmationToken}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-[11px]">—</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-gray-500 text-[11px]">
                      {new Date(req.createdAt).toLocaleDateString('pt-BR')}
                    </td>

                    <td className="px-5 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => setSelectedDetailsRequest(req)}
                        title="Ver Detalhes e Auditoria"
                        className="p-1.5 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {req.status === 'DEVOLVIDA' && (
                        <button
                          onClick={() => setSelectedResubmitRequest(req)}
                          title="Reenviar com Correções"
                          className="p-1.5 text-orange-600 hover:text-orange-700 rounded-lg bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/30 transition"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}

                      {!['CANCELADA', 'NEGADA'].includes(req.status) && (
                        <button
                          onClick={() => setCancelModalRequest(req)}
                          title="Cancelar Solicitação"
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <CreateRegulationRequestModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          refetch();
        }}
      />

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

      {/* Modal de Cancelamento com Justificativa Obrigatória */}
      {cancelModalRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4">
            <div className="flex items-center space-x-3 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Cancelar Solicitação</h3>
            </div>
            <p className="text-xs text-gray-500">
              Protocolo: <span className="font-mono font-bold text-gray-800 dark:text-gray-200">{cancelModalRequest.protocolNumber}</span> • Paciente: {cancelModalRequest.patient?.name}
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Justificativa Obrigatória do Cancelamento <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={cancelJustification}
                onChange={(e) => setCancelJustification(e.target.value)}
                placeholder="Informe o motivo pelo qual o munícipe ou a UBS está cancelando este pedido..."
                className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => {
                  setCancelModalRequest(null);
                  setCancelJustification('');
                }}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelMutation.isPending}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition shadow-md shadow-red-500/20 disabled:opacity-50"
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
