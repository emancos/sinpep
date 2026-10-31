import React, { useState } from 'react';
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
  Download,
  Paperclip,
  Activity,
  History,
  Copy,
  Check,
} from 'lucide-react';
import type { RegulationRequest } from '../../services/regulation';
import { apiUrl } from '../../services/api';
import { toast } from 'sonner';

interface RequestDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: RegulationRequest | null;
}

export const RequestDetailsModal: React.FC<RequestDetailsModalProps> = ({ isOpen, onClose, request }) => {
  const [copiedToken, setCopiedToken] = useState(false);

  if (!isOpen || !request) return null;

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
      <div className="relative w-full max-w-4xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <div>
            <div className="flex items-center space-x-3">
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono tracking-wider">
                {request.protocolNumber}
              </span>
              {getStatusBadge(request.status)}
              {getPriorityBadge(request.priority)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Criado em: {new Date(request.createdAt).toLocaleString('pt-BR')} • Solicitante: {request.requestingHealthCenter?.name || 'UBS'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Card Chave de Confirmação (Destaque quando AGENDADA) */}
          {request.status === 'AGENDADA' && request.confirmationToken && (
            <div className="p-5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Key className="w-8 h-8 text-white" />
                </div>
                <div>
                  <div className="text-xs uppercase font-semibold text-emerald-100 tracking-wider">
                    Chave de Confirmação Alfanumérica Única
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-mono tracking-widest mt-0.5">
                    {request.confirmationToken}
                  </div>
                  <div className="text-xs text-emerald-100 mt-1">
                    Exigida na Recepção da Unidade Executante para validação do atendimento
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={copyToken}
                className="px-4 py-2 bg-white text-emerald-700 hover:bg-emerald-50 rounded-xl text-xs font-bold transition flex items-center space-x-2 shadow-sm"
              >
                {copiedToken ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedToken ? 'Copiado!' : 'Copiar Chave'}</span>
              </button>
            </div>
          )}

          {/* Dados do Agendamento se Agendada */}
          {request.scheduledDate && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
              <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> Detalhes do Agendamento Confirmado
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-gray-500 block">Unidade Executante:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {request.executingHealthCenter?.name || 'Não informada'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Data e Horário:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {request.scheduledDate} às {request.scheduledTime || '08:00'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Status da Chave:</span>
                  <span className={`font-semibold ${request.tokenValidatedAt ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {request.tokenValidatedAt ? `Validada em ${new Date(request.tokenValidatedAt).toLocaleString('pt-BR')}` : 'Aguardando validação na recepção'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Identificação do Paciente */}
          <div className="p-4 bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-200 dark:border-gray-700">
            <h4 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <User className="w-4 h-4 text-blue-500" /> Paciente
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-gray-500 block">Nome:</span>
                <span className="font-bold text-gray-900 dark:text-white text-sm">
                  {request.patient?.name}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">CPF:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {request.patient?.cpf || 'Não informado'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">CNS (Cartão SUS):</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {request.patient?.cns || 'Não informado'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Nascimento / Sexo:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {request.patient?.birthDate || '-'} ({request.patient?.gender || '-'})
                </span>
              </div>
            </div>
          </div>

          {/* Procedimento / Especialidade e Diagnóstico */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-200 dark:border-gray-700">
              <h4 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-purple-500" /> Procedimento Requisitado
              </h4>
              <div className="text-xs space-y-1">
                <div>
                  <span className="text-gray-500">Tipo: </span>
                  <span className="font-semibold text-gray-900 dark:text-white">{request.type}</span>
                </div>
                {request.procedureGroup && (
                  <div>
                    <span className="text-gray-500">Grupo: </span>
                    <span className="font-semibold text-gray-900 dark:text-white">{request.procedureGroup.name}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Item: </span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {request.procedure ? `${request.procedure.code} - ${request.procedure.name}` : request.specialty?.name}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-200 dark:border-gray-700">
              <h4 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
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
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Justificativa Clínica
              </h4>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed border border-gray-200 dark:border-gray-700">
                {request.clinicalJustification}
              </div>
            </div>

            {request.clinicalHistory && (
              <div>
                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Histórico Clínico e Tratamentos Prévios
                </h4>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed border border-gray-200 dark:border-gray-700">
                  {request.clinicalHistory}
                </div>
              </div>
            )}
          </div>

          {/* Anexos */}
          {request.attachments && request.attachments.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Paperclip className="w-4 h-4 text-gray-500" /> Documentos e Exames Anexados ({request.attachments.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {request.attachments.map((att) => (
                  <a
                    key={att.id}
                    href={`${apiUrl}${att.fileUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20 transition group"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <Paperclip className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                      <span className="font-medium text-gray-800 dark:text-gray-200 truncate">{att.fileName}</span>
                    </div>
                    <Download className="w-4 h-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Histórico Completo de Auditoria */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <History className="w-4 h-4 text-blue-500" /> Trilha de Auditoria & Histórico de Trocas de Status
            </h4>

            <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-700">
              {request.statusHistory?.map((hist, idx) => (
                <div key={hist.id || idx} className="relative pl-8 text-xs">
                  <div className="absolute left-1.5 top-1 w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white dark:border-gray-800" />
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-gray-900 dark:text-white">
                      {hist.newStatus.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {new Date(hist.createdAt).toLocaleString('pt-BR')}
                    </span>
                    {hist.actionByUser && (
                      <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                        por {hist.actionByUser.name}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 p-2 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 italic">
                    "{hist.justification}"
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
