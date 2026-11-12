import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  FileText,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Key,
  Paperclip,
  Activity,
  History,
  Copy,
  Check,
  CalendarCheck,
  ArrowRightLeft,
  Printer,
  ExternalLink,
} from 'lucide-react';
import type { RegulationRequest } from '../../services/regulation';
import { useAuthStore } from '../../store/useAuthStore';
import { BookSlotModal } from './BookSlotModal';
import { RegulationRequestPrintModal } from './RegulationRequestPrintModal';
import { AttachmentViewer } from '../MedicalRecords/AttachmentViewer';
import { RegulationAttachmentRow } from './components/RegulationAttachmentPreview';
import { useAvailableSlots } from '../../hooks/useSchedules';
import { useRegulationRequest } from '../../hooks/useRegulation';
import {
  getRegulationStatusMeta,
  getStatusHistoryEventLabel,
} from '../../utils/regulationStatus';
import {
  formatCPF,
  formatCNS,
  formatBirthDateAndGender,
  formatDateBR,
  formatDateTimeBR,
} from '../../utils/brazilianFormatters';
import { toast } from 'sonner';

interface RequestDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: RegulationRequest | null;
}

export const RequestDetailsModal: React.FC<RequestDetailsModalProps> = ({ isOpen, onClose, request: initialRequest }) => {
  const [copiedToken, setCopiedToken] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<{ url: string; type: string; name: string } | null>(null);

  const permissions = useAuthStore((state) => state.permissions);
  const activeProfile = useAuthStore((state) => state.activeProfile);

  const targetRequestId = isOpen && initialRequest ? initialRequest.id : null;
  const { data: fullRequest } = useRegulationRequest(targetRequestId);
  const request = fullRequest || initialRequest;

  const procedureId = request?.procedureId || request?.procedure?.id || undefined;
  const procedureGroupId = request?.procedureGroupId || request?.procedureGroup?.id || undefined;
  const { data: availableSlots = [] } = useAvailableSlots(procedureId, { procedureGroupId });
  const hasAvailableSlots = availableSlots.length > 0;

  if (!isOpen || !request) return null;

  const isAdmin = permissions.includes('admin:access');
  const isRegulator =
    activeProfile?.name === 'Regulador (Central de Regulação)' ||
    permissions.includes('regulation-operator:read');
  const isCoordinator = activeProfile?.name === 'Coordenador de Unidade';
  const isSolicitor =
    activeProfile?.name?.includes('Solicitante') ||
    permissions.includes('regulation-solicitor:read');

  const requiresRegulation = request.procedure?.requiresRegulation ?? true;

  // Se for procedimento regulado, botão só aparece para regulador, coordenador e admin.
  // Se não for regulado, também é exibido para o solicitante.
  const canBook =
    (request.status === 'PENDENTE_REGULACAO' || request.status === 'PENDENTE_AGENDAMENTO') &&
    (isAdmin || isRegulator || isCoordinator || (!requiresRegulation && isSolicitor));

  const copyToken = () => {
    if (request.confirmationToken) {
      navigator.clipboard.writeText(request.confirmationToken);
      setCopiedToken(true);
      toast.success('Chave de confirmação copiada!');
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDENTE_REGULACAO':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> PENDENTE NA REGULAÇÃO
          </span>
        );
      case 'PENDENTE_AGENDAMENTO':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> AUTORIZADA (AGUARDANDO AGENDAMENTO)
          </span>
        );
      case 'AGENDADA':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> AGENDADA
          </span>
        );
      case 'DEVOLVIDA':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 flex items-center gap-1.5 animate-pulse">
            <RotateCcw className="w-3.5 h-3.5" /> DEVOLVIDA PARA CORREÇÃO
          </span>
        );
      case 'NEGADA':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" /> INDEFERIDA / NEGADA
          </span>
        );
      case 'AGENDAMENTO_CANCELADO':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" /> AGENDAMENTO CANCELADO
          </span>
        );
      case 'CANCELADA':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" /> CANCELADA
          </span>
        );
      default:
        return null;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENCIA':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-700">URGÊNCIA</span>;
      case 'PRIORITARIO':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-700">PRIORITÁRIO</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-700">ELETIVO</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
          <div>
            <div className="flex items-center space-x-3">
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono tracking-wider">
                {request.protocolNumber}
              </span>
              {getStatusBadge(request.status)}
              {getPriorityBadge(request.priority)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Criado em: {formatDateTimeBR(request.createdAt)} • Solicitante: {request.requestingHealthCenter?.name || 'UBS'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={`/regulation/requests/${request.id}`}
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1 text-xs font-semibold"
              title="Abrir Página de Detalhes"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Página Completa</span>
            </Link>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Card Chave de Confirmação (Destaque quando AGENDADA ou com chave gerada) */}
          {Boolean(request.confirmationToken) && (
            <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-700 rounded-md text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-md">
                  <Key className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="text-[11px] uppercase font-semibold text-emerald-100 tracking-wider">
                    Chave de Confirmação Alfanumérica Única
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-mono tracking-widest mt-0.5">
                    {request.confirmationToken}
                  </div>
                  <div className="text-xs text-emerald-100 mt-0.5">
                    Exigida na Recepção da Unidade Executante para validação do atendimento
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={copyToken}
                className="px-3.5 py-2 bg-white text-emerald-800 hover:bg-emerald-50 rounded-md text-xs font-bold transition flex items-center space-x-1.5 shadow-sm cursor-pointer"
              >
                {copiedToken ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedToken ? 'Copiado!' : 'Copiar Chave'}</span>
              </button>
            </div>
          )}

          {/* Dados do Agendamento se Agendada */}
          {request.scheduledDate && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/80 rounded-md">
              <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> Detalhes do Agendamento Confirmado
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Unidade Executante:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {request.executingHealthCenter?.name || 'Não informada'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Data e Horário:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {formatDateBR(request.scheduledDate)} às {request.scheduledTime || '08:00'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Status da Chave:</span>
                  <span className={`font-semibold ${request.tokenValidatedAt ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {request.tokenValidatedAt ? `Validada em ${formatDateTimeBR(request.tokenValidatedAt)}` : 'Aguardando validação na recepção'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Identificação do Paciente */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-md border border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <User className="w-4 h-4 text-blue-500" /> Paciente
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">Nome:</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {request.patient?.name}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">CPF:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {formatCPF(request.patient?.cpf)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">CNS (Cartão SUS):</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {formatCNS(request.patient?.cns)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Nascimento / Sexo:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatBirthDateAndGender(request.patient?.birthDate, request.patient?.gender)}
                </span>
              </div>
            </div>
          </div>

          {/* Procedimento / Especialidade e Diagnóstico */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-md border border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-purple-500" /> Procedimento Requisitado
              </h4>
              <div className="text-xs space-y-1">
                <div>
                  <span className="text-slate-500">Tipo: </span>
                  <span className="font-semibold text-slate-900 dark:text-white">{request.type}</span>
                </div>
                {request.procedureGroup && (
                  <div>
                    <span className="text-slate-500">Grupo: </span>
                    <span className="font-semibold text-slate-900 dark:text-white">{request.procedureGroup.name}</span>
                  </div>
                )}
                {request.groupProcedures && request.groupProcedures.length > 0 ? (
                  <div className="pt-1">
                    <span className="text-slate-500 block mb-1">Procedimentos Solicitados no Grupo:</span>
                    <ul className="space-y-1 pl-2 border-l-2 border-blue-500">
                      {request.groupProcedures.map((gp, idx) => (
                        <li key={idx} className="font-medium text-slate-800 dark:text-slate-200">
                          {idx + 1}. {gp.name} {gp.sigtapCode || gp.code ? `(${gp.sigtapCode || gp.code})` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div>
                    <span className="text-slate-500">Item: </span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {request.procedure ? `${request.procedure.code} - ${request.procedure.name}` : request.specialty?.name}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-md border border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-500" /> Hipótese Diagnóstica (CID-10)
              </h4>
              <div className="text-xs">
                <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm block">
                  {request.cid10}
                </span>
              </div>
            </div>
          </div>

          {/* Justificativa Clínica e Histórico */}
          <div className="space-y-3">
            <div>
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Justificativa Clínica
              </h4>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-md text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed border border-slate-200 dark:border-slate-800">
                {request.clinicalJustification}
              </div>
            </div>

            {request.clinicalHistory && (
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Histórico Clínico e Tratamentos Prévios
                </h4>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-md text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed border border-slate-200 dark:border-slate-800">
                  {request.clinicalHistory}
                </div>
              </div>
            )}
          </div>

          {/* Anexos */}
          {request.attachments && request.attachments.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Paperclip className="w-4 h-4 text-slate-500" /> Documentos e Exames Anexados ({request.attachments.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {request.attachments.map((att) => (
                  <RegulationAttachmentRow
                    key={att.id}
                    attachment={att}
                    onPreview={(a) =>
                      setPreviewAttachment({
                        url: a.fileUrl,
                        type: a.fileType || '',
                        name: a.fileName,
                      })
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* Histórico Completo de Auditoria */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <History className="w-4 h-4 text-blue-500" /> Trilha de Auditoria & Histórico de Trocas de Status
            </h4>

            <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
              {request.statusHistory?.map((hist, idx) => {
                const isProcChange = hist.justification.startsWith('ALTERAÇÃO DE PROCEDIMENTO:');
                const statusMeta = getRegulationStatusMeta(hist.newStatus);

                return (
                  <div key={hist.id || idx} className="relative pl-7 text-xs">
                    <div
                      className={`absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                        isProcChange ? 'bg-indigo-600' : statusMeta.dotClass
                      }`}
                    />
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      {isProcChange ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 flex items-center gap-1">
                          <ArrowRightLeft className="w-3 h-3" /> Alteração de Procedimento
                        </span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${statusMeta.badgeClass}`}>
                          {getStatusHistoryEventLabel(hist)}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400">
                        {formatDateTimeBR(hist.createdAt)}
                      </span>
                      {hist.actionByUser && (
                        <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                          por {hist.actionByUser.name}
                        </span>
                      )}
                    </div>
                    <div
                      className={`mt-1 p-2 rounded-md border text-slate-700 dark:text-slate-300 text-xs italic ${
                        isProcChange
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/50 font-medium not-italic'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      "{hist.justification}"
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            {(isAdmin || isRegulator || isCoordinator) &&
              request.status !== 'CANCELADA' &&
              request.status !== 'NEGADA' && (
                <Link
                  to={`/regulation/requests/${request.id}/change-procedure`}
                  onClick={onClose}
                  className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Alterar Procedimento</span>
                </Link>
              )}

            {canBook && hasAvailableSlots && (
              <button
                type="button"
                onClick={() => setBookingOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-98"
              >
                <CalendarCheck className="w-4 h-4" />
                <span>Agendar Vaga na Escala</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setPrintModalOpen(true)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
            >
              <Printer className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>Imprimir Ficha</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Modal de Agendamento em Vagas Abertas da Escala (Apenas se houver vagas disponíveis) */}
      {bookingOpen && hasAvailableSlots && (
        <BookSlotModal
          isOpen={bookingOpen}
          onClose={() => setBookingOpen(false)}
          request={request}
          onSuccess={() => {
            setBookingOpen(false);
            onClose();
          }}
        />
      )}

      {/* Modal de Impressão da Ficha de Solicitação */}
      {printModalOpen && (
        <RegulationRequestPrintModal
          isOpen={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          request={request}
        />
      )}

      {/* Visualizador autenticado de anexos */}
      {previewAttachment && (
        <AttachmentViewer
          file={previewAttachment}
          onClose={() => setPreviewAttachment(null)}
        />
      )}
    </div>
  );
};
