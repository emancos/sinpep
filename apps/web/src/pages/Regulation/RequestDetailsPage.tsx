import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Download,
  Paperclip,
  History,
  Copy,
  Check,
  CalendarCheck,
  ArrowRightLeft,
  Printer,
  FileText,
  Building2,
  Stethoscope,
  ExternalLink,
  AlertTriangle,
  Loader2,
  ZoomIn,
  X,
} from 'lucide-react';
import { useRegulationRequest } from '../../hooks/useRegulation';
import { useAvailableSlots } from '../../hooks/useSchedules';
import { useAuthStore } from '../../store/useAuthStore';
import { apiUrl } from '../../services/api';
import { BookSlotModal } from './BookSlotModal';
import { RegulationRequestPrintModal } from './RegulationRequestPrintModal';
import {
  formatCPF,
  formatCNS,
  formatBirthDateAndGender,
  calculateAge,
} from '../../utils/brazilianFormatters';
import { toast } from 'sonner';

export const RequestDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [copiedToken, setCopiedToken] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  const permissions = useAuthStore((state) => state.permissions);
  const activeProfile = useAuthStore((state) => state.activeProfile);

  const { data: request, isLoading, isError, refetch } = useRegulationRequest(id || null);

  const procedureId = request?.procedureId || request?.procedure?.id || undefined;
  const procedureGroupId = request?.procedureGroupId || request?.procedureGroup?.id || undefined;
  const { data: availableSlots = [] } = useAvailableSlots(procedureId, { procedureGroupId });
  const hasAvailableSlots = availableSlots.length > 0;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Carregando detalhes da solicitação...</p>
      </div>
    );
  }

  if (isError || !request) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center space-y-4">
        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">
          Solicitação não encontrada
        </h2>
        <p className="text-xs text-slate-500">
          Não foi possível carregar os dados desta solicitação de regulação.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-slate-800 text-white rounded-md text-xs font-semibold hover:bg-slate-700 transition"
        >
          Voltar
        </button>
      </div>
    );
  }

  const isAdmin = permissions.includes('admin:access');
  const isRegulator =
    activeProfile?.name === 'Regulador (Central de Regulação)' ||
    permissions.includes('regulation-operator:read');
  const isCoordinator = activeProfile?.name === 'Coordenador de Unidade';
  const isSolicitor =
    activeProfile?.name?.includes('Solicitante') ||
    permissions.includes('regulation-solicitor:read');

  const requiresRegulation = request.procedure?.requiresRegulation ?? true;
  const canBook =
    (request.status === 'PENDENTE_REGULACAO' || request.status === 'PENDENTE_AGENDAMENTO') &&
    (isAdmin || isRegulator || isCoordinator || (!requiresRegulation && isSolicitor));

  const canChangeProcedure =
    (isAdmin || isRegulator) &&
    request.status !== 'CANCELADA' &&
    request.status !== 'NEGADA';

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
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" /> DEVOLVIDA PARA CORREÇÃO
          </span>
        );
      case 'NEGADA':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" /> INDEFERIDA / NEGADA
          </span>
        );
      case 'CANCELADA':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" /> CANCELADA
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENCIA':
        return (
          <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800">
            URGÊNCIA
          </span>
        );
      case 'PRIORITARIO':
        return (
          <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            PRIORITÁRIO
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            ELETIVO
          </span>
        );
    }
  };

  const isImageFile = (att: { fileName: string; fileType?: string }) => {
    const type = (att.fileType || '').toLowerCase();
    const name = att.fileName.toLowerCase();
    return (
      type.startsWith('image/') ||
      name.endsWith('.png') ||
      name.endsWith('.jpg') ||
      name.endsWith('.jpeg') ||
      name.endsWith('.webp') ||
      name.endsWith('.gif')
    );
  };

  const isPdfFile = (att: { fileName: string; fileType?: string }) => {
    const type = (att.fileType || '').toLowerCase();
    const name = att.fileName.toLowerCase();
    return type.includes('pdf') || name.endsWith('.pdf');
  };

  const patientAge = calculateAge(request.patient?.birthDate);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Barra de Navegação Superior */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
            title="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Solicitação #{request.protocolNumber}
              </h1>
              {getStatusBadge(request.status)}
              {getPriorityBadge(request.priority)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Protocolada em {new Date(request.createdAt).toLocaleDateString('pt-BR')} às{' '}
              {new Date(request.createdAt).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>

        {/* Ações da Solicitação */}
        <div className="flex items-center gap-2 flex-wrap">
          {canChangeProcedure && (
            <Link
              to={`/regulation/requests/${request.id}/change-procedure`}
              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
              title="Alterar Procedimento"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Alterar Procedimento</span>
            </Link>
          )}

          {canBook && hasAvailableSlots && (
            <button
              type="button"
              onClick={() => setBookingOpen(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-98"
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal (Esquerda - 2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. DADOS DO PACIENTE FORMATADOS NO PADRÃO BRASILEIRO */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <User className="w-5 h-5 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Identificação do Paciente
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Nome Completo:</span>
                <span className="text-base font-bold text-slate-900 dark:text-white uppercase block">
                  {request.patient?.name}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">CPF:</span>
                <span className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200">
                  {formatCPF(request.patient?.cpf)}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Cartão SUS (CNS):</span>
                <span className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">
                  {formatCNS(request.patient?.cns)}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Nascimento / Sexo:</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {formatBirthDateAndGender(request.patient?.birthDate, request.patient?.gender)}
                  {patientAge && ` • ${patientAge}`}
                </span>
              </div>

              {request.patient?.address && (
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase block">Endereço:</span>
                  <span className="text-xs text-slate-700 dark:text-slate-300">
                    {request.patient.address}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 2. DADOS CLÍNICOS E PROCEDIMENTO */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Stethoscope className="w-5 h-5 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Procedimento Solicitado & Dados Clínicos
              </h2>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase block">Procedimento:</span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400 block mt-0.5">
                    {request.procedure ? `${request.procedure.code} - ${request.procedure.name}` : request.specialty?.name}
                  </span>
                  {request.procedureGroup && (
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Grupo: {request.procedureGroup.name}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase block">Regime / Tipo:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">
                    {request.procedure?.requiresRegulation ? 'Procedimento Regulado' : 'Acesso Direto'}
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Tipo: {request.type}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                  Hipótese Diagnóstica (CID-10):
                </span>
                <span className="inline-block px-2.5 py-1 rounded-md font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700">
                  {request.cid10}
                </span>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                  Justificativa Clínica:
                </span>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed border border-slate-200 dark:border-slate-700">
                  {request.clinicalJustification}
                </div>
              </div>

              {request.clinicalHistory && (
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                  <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                    Histórico Clínico / Anamnese:
                  </span>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed border border-slate-200 dark:border-slate-700">
                    {request.clinicalHistory}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. DOCUMENTOS E ANEXOS COM PRÉ-VISUALIZAÇÃO */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Documentos & Exames Anexados
                </h2>
              </div>
              <span className="text-xs text-slate-500 font-semibold">
                {request.attachments?.length || 0} anexo(s)
              </span>
            </div>

            {!request.attachments || request.attachments.length === 0 ? (
              <div className="py-8 text-center text-slate-400 dark:text-slate-500 space-y-1">
                <FileText className="w-8 h-8 mx-auto stroke-1" />
                <p className="text-xs">Nenhum exame ou documento foi anexado a esta solicitação.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {request.attachments.map((att) => {
                  const fullUrl = `${apiUrl}${att.fileUrl}`;
                  const isImg = isImageFile(att);
                  const isPdf = isPdfFile(att);

                  return (
                    <div
                      key={att.id}
                      className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800/40 hover:border-blue-400 transition flex flex-col justify-between"
                    >
                      {/* Pré-visualização se for imagem */}
                      {isImg ? (
                        <div className="relative group bg-slate-100 dark:bg-slate-950 flex items-center justify-center h-44 overflow-hidden">
                          <img
                            src={fullUrl}
                            alt={att.fileName}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => setPreviewImage({ url: fullUrl, name: att.fileName })}
                              className="px-3 py-1.5 bg-white/90 hover:bg-white text-slate-900 rounded-md text-xs font-bold flex items-center gap-1 shadow-md cursor-pointer transition active:scale-95"
                            >
                              <ZoomIn className="w-3.5 h-3.5" />
                              <span>Ampliar</span>
                            </button>
                            <a
                              href={fullUrl}
                              download={att.fileName}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 bg-white/90 hover:bg-white text-slate-900 rounded-md shadow-md cursor-pointer transition active:scale-95"
                              title="Baixar imagem"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                        </div>
                      ) : isPdf ? (
                        <div className="p-4 flex items-center gap-3 bg-red-50/50 dark:bg-red-950/20 border-b border-red-100 dark:border-red-900/30">
                          <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-600 shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 block">
                              Documento PDF
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-white truncate block text-xs">
                              {att.fileName}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 flex items-center gap-3 border-b border-slate-200 dark:border-slate-700">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 shrink-0">
                            <Paperclip className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="font-semibold text-slate-900 dark:text-white truncate block text-xs">
                              {att.fileName}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Informações e Botões do Card */}
                      <div className="p-3 flex items-center justify-between gap-2 text-xs bg-white dark:bg-slate-900">
                        <div className="min-w-0">
                          <span className="font-medium text-slate-800 dark:text-slate-200 truncate block text-[11px]">
                            {att.fileName}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {att.fileSize ? `${Math.round(att.fileSize / 1024)} KB` : 'Arquivo anexado'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <a
                            href={fullUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition"
                            title="Visualizar em nova aba"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <a
                            href={fullUrl}
                            download={att.fileName}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition"
                            title="Baixar arquivo"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Coluna Lateral (Direita - 1/3) */}
        <div className="space-y-6">
          {/* Card Se Estiver Agendada */}
          {request.status === 'AGENDADA' && (
            <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Atendimento Agendado</span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Data do Atendimento:</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {request.scheduledDate
                      ? new Date(`${request.scheduledDate}T00:00:00`).toLocaleDateString('pt-BR')
                      : 'Não informada'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Horário:</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {request.scheduledTime || 'A partir do início da escala'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Unidade Executante:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                    {request.executingHealthCenter?.name || 'Policlínica Municipal'}
                  </span>
                </div>

                {request.confirmationToken && (
                  <div className="pt-2 border-t border-emerald-200/80 dark:border-emerald-800/80">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                      Chave de Confirmação:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-black bg-white dark:bg-slate-900 px-2.5 py-1 rounded border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 tracking-wider">
                        {request.confirmationToken}
                      </span>
                      <button
                        onClick={copyToken}
                        className="p-1 text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 hover:bg-emerald-100 rounded transition cursor-pointer"
                        title="Copiar Chave"
                      >
                        {copiedToken ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dados de Origem */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3 text-xs">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <Building2 className="w-4 h-4 text-slate-500" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                Unidade Solicitante & Origem
              </h3>
            </div>

            <div className="space-y-2">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Unidade:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  {request.requestingHealthCenter?.name || 'UBS Solicitante'}
                </span>
                {request.requestingHealthCenter?.cnes && (
                  <span className="text-[10px] text-slate-400">
                    CNES: {request.requestingHealthCenter.cnes}
                  </span>
                )}
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Profissional Solicitante:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  {request.attendingDoctor?.name || request.requestingUser?.name || 'Profissional Solicitante'}
                </span>
              </div>
            </div>
          </div>

          {/* Trilha de Auditoria & Histórico de Trocas de Status */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <History className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                Trilha de Auditoria & Histórico
              </h3>
            </div>

            {!request.statusHistory || request.statusHistory.length === 0 ? (
              <p className="text-xs text-slate-400">Nenhum evento histórico registrado.</p>
            ) : (
              <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                {request.statusHistory.map((hist, idx) => {
                  const isProcChange = hist.justification.startsWith('ALTERAÇÃO DE PROCEDIMENTO:');

                  return (
                    <div key={hist.id || idx} className="relative pl-6 text-xs">
                      <div
                        className={`absolute left-0.5 top-1 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                          isProcChange ? 'bg-indigo-600' : 'bg-blue-500'
                        }`}
                      />
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                          {hist.newStatus}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(hist.createdAt).toLocaleDateString('pt-BR')} às{' '}
                          {new Date(hist.createdAt).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5 whitespace-pre-wrap leading-relaxed">
                        {hist.justification}
                      </p>
                      {hist.actionByUser && (
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Por: {hist.actionByUser.name}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Lightbox para Pré-visualização de Imagens Ampliadas */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-md">
                {previewImage.name}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewImage.url}
                  download={previewImage.name}
                  className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded transition"
                  title="Baixar imagem"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setPreviewImage(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition cursor-pointer"
                  title="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-2 flex items-center justify-center max-h-[80vh] overflow-auto">
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className="max-h-[75vh] w-auto object-contain rounded-md"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Agendamento em Vagas da Escala */}
      {bookingOpen && hasAvailableSlots && (
        <BookSlotModal
          isOpen={bookingOpen}
          onClose={() => setBookingOpen(false)}
          request={request}
          onSuccess={() => {
            setBookingOpen(false);
            refetch();
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
    </div>
  );
};
