import React, { useState, useMemo } from 'react';
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
import { toast } from 'sonner';

export const OperatorInbox: React.FC = () => {
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [requestingCenterFilter, setRequestingCenterFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [evaluatingRequest, setEvaluatingRequest] = useState<RegulationRequest | null>(null);
  const [schedulingRequest, setSchedulingRequest] = useState<RegulationRequest | null>(null);
  const [detailsRequest, setDetailsRequest] = useState<RegulationRequest | null>(null);

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
        return matchesProtocol || matchesPatient || matchesCpf || matchesToken || matchesItem;
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
    } catch (err) {
      // Handled in mutation
    }
  };

  const getStatusBadge = (status: RegulationRequestStatus) => {
    switch (status) {
      case 'PENDENTE_REGULACAO':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            Pendente Regulação
          </span>
        );
      case 'PENDENTE_AGENDAMENTO':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
            Aguardando Agendamento
          </span>
        );
      case 'AGENDADA':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
            Agendada
          </span>
        );
      case 'DEVOLVIDA':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
            Devolvida p/ UBS
          </span>
        );
      case 'NEGADA':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
            Indeferida / Negada
          </span>
        );
      case 'AGENDAMENTO_CANCELADO':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
            Agendamento Cancelado
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
            <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
              Central Municipal de Regulação
            </span>
            <span className="text-xs text-gray-500">Módulo Operador / Médico Regulador</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            Fila de Regulação & Agendamento
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Avalie clinicamente as solicitações das UBS, autorize, devolva ou agende vagas nas unidades executantes.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-blue-50/60 dark:bg-blue-900/20 border-blue-400 ring-2 ring-blue-400/50'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
          }`}
        >
          <span className="text-xs font-medium text-gray-500">Total na Rede</span>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{counts.all}</div>
        </div>

        <div
          onClick={() => setStatusFilter('PENDENTE_REGULACAO')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'PENDENTE_REGULACAO'
              ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-400 ring-2 ring-amber-400/50'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Pendente Avaliação</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">{counts.toEvaluate}</div>
        </div>

        <div
          onClick={() => setStatusFilter('PENDENTE_AGENDAMENTO')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'PENDENTE_AGENDAMENTO'
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 ring-2 ring-blue-400/50'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 dark:text-blue-400">Pendente Agendamento</span>
            <Calendar className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-1">{counts.toSchedule}</div>
        </div>

        <div
          onClick={() => setStatusFilter('AGENDADA')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'AGENDADA'
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400 ring-2 ring-emerald-400/50'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Agendadas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">{counts.scheduled}</div>
        </div>

        <div
          onClick={() => setStatusFilter('DEVOLVIDA')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'DEVOLVIDA'
              ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-400 ring-2 ring-orange-400/50'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-700 dark:text-orange-400">Devolvidas p/ UBS</span>
            <RotateCcw className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl font-bold text-orange-700 dark:text-orange-400 mt-1">{counts.returned}</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
          {/* Busca por texto */}
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por protocolo, paciente, CPF, chave..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filtro Unidade Solicitante (UBS) */}
          <div>
            <select
              value={requestingCenterFilter}
              onChange={(e) => setRequestingCenterFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Todas as Prioridades</option>
              <option value="URGENCIA">Urgência</option>
              <option value="PRIORITARIO">Prioritário</option>
              <option value="ELETIVO">Eletivo</option>
            </select>
          </div>
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
                <th className="px-5 py-3">Unidade Origem (UBS)</th>
                <th className="px-5 py-3">Procedimento / Especialidade</th>
                <th className="px-5 py-3">Prioridade</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Chave Confirmação</th>
                <th className="px-5 py-3 text-right">Ações Regulatórias</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span>Carregando fila da regulação municipal...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-gray-500">
                    Nenhuma solicitação encontrada para os filtros aplicados.
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
                      <div className="text-[11px] text-gray-500">CPF: {req.patient?.cpf || 'S/N'}</div>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="font-medium text-gray-800 dark:text-gray-200">
                        {req.requestingHealthCenter?.name}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {new Date(req.createdAt).toLocaleDateString('pt-BR')}
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

                    <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => setDetailsRequest(req)}
                        title="Ver Detalhes e Pareceres"
                        className="p-1.5 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Botão Avaliar (quando pendente de regulação) */}
                      {req.status === 'PENDENTE_REGULACAO' && (
                        <button
                          onClick={() => setEvaluatingRequest(req)}
                          className="px-2.5 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition inline-flex items-center gap-1"
                        >
                          <Stethoscope className="w-3.5 h-3.5" />
                          <span>Avaliar</span>
                        </button>
                      )}

                      {/* Botão Agendar (quando pendente de agendamento) */}
                      {req.status === 'PENDENTE_AGENDAMENTO' && (
                        <button
                          onClick={() => setSchedulingRequest(req)}
                          className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition inline-flex items-center gap-1"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Agendar</span>
                        </button>
                      )}

                      {/* Botão Cancelar Agendamento (quando já agendada) */}
                      {req.status === 'AGENDADA' && (
                        <button
                          onClick={() => setCancelingScheduleRequest(req)}
                          title="Cancelar Agendamento"
                          className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"
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

      <RequestDetailsModal
        isOpen={!!detailsRequest}
        onClose={() => setDetailsRequest(null)}
        request={detailsRequest}
      />

      {/* Modal Cancelar Agendamento com Justificativa Obrigatória */}
      {cancelingScheduleRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4">
            <div className="flex items-center space-x-3 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Cancelar Agendamento</h3>
            </div>
            <p className="text-xs text-gray-500">
              Protocolo: <span className="font-mono font-bold text-gray-800 dark:text-gray-200">{cancelingScheduleRequest.protocolNumber}</span> • Paciente: {cancelingScheduleRequest.patient?.name}
            </p>

            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-800 dark:text-red-300">
              A chave atual <span className="font-mono font-bold">{cancelingScheduleRequest.confirmationToken}</span> será invalidada.
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="returnQueueCheck"
                checked={returnToQueue}
                onChange={(e) => setReturnToQueue(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <label htmlFor="returnQueueCheck" className="text-xs text-gray-700 dark:text-gray-300">
                Retornar solicitação para a fila de agendamento (Pendente Agendamento)
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Justificativa Obrigatória do Cancelamento <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={cancelScheduleJustification}
                onChange={(e) => setCancelScheduleJustification(e.target.value)}
                placeholder="Informe o motivo do cancelamento do agendamento (ausência de médico, solicitação do paciente, etc)..."
                className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => {
                  setCancelingScheduleRequest(null);
                  setCancelScheduleJustification('');
                }}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelSchedule}
                disabled={cancelScheduleMutation.isPending}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition shadow-md shadow-red-500/20 disabled:opacity-50"
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
