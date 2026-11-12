import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
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
  Eye,
  AlertTriangle,
  Loader2,
  ZoomIn,
  X,
  Lock,
  Unlock,
  Upload,
  Trash2,
  Send,
  Plus,
  Search,
} from 'lucide-react';
import { useRegulationRequest, useResubmitRegulationRequest } from '../../hooks/useRegulation';
import { useAvailableSlots } from '../../hooks/useSchedules';
import { useProcedureGroups, useProcedures } from '../../hooks/useProcedures';
import { useAuthStore } from '../../store/useAuthStore';
import type {
  RegulationAttachment,
  RegulationRequestPriority,
  RegulationRequestType,
} from '../../services/regulation';
import { BookSlotModal } from './BookSlotModal';
import { RegulationRequestPrintModal } from './RegulationRequestPrintModal';
import { AttachmentViewer } from '../MedicalRecords/AttachmentViewer';
import {
  AuthenticatedAttachmentImage,
  isRegulationAttachmentImage,
  isRegulationAttachmentPdf,
} from './components/RegulationAttachmentPreview';
import { openAuthenticatedAttachment } from '../../utils/storageUrl';
import { Cid10SelectorInput } from './components/Cid10SelectorInput';
import {
  EMPTY_ANAMNESIS_FORM,
  RequestAnamnesisCard,
  type AnamnesisFormValues,
} from './components/RequestAnamnesisCard';
import {
  buildRestrictedResubmitFormData,
  getEffectiveReturnEditableFields,
  getReturnFieldLabel,
  isReturnFieldEditable,
  type GroupProcedureDraftItem,
  type ReturnEditableField,
} from '../../utils/regulationReturnFields';
import { getUserLinkedHealthCenterIds } from '../../utils/patientPermissions';
import {
  getRegulationStatusMeta,
  getStatusHistoryEventLabel,
} from '../../utils/regulationStatus';
import {
  formatCPF,
  formatCNS,
  formatBirthDateAndGender,
  calculateAge,
  formatDateBR,
  formatDateTimeBR,
} from '../../utils/brazilianFormatters';
import { toast } from 'sonner';

function mapPatientAnamnesisToForm(pa?: any): AnamnesisFormValues {
  if (!pa) return { ...EMPTY_ANAMNESIS_FORM };
  return {
    isHypertensive: Boolean(pa.isHypertensive),
    isDiabetic: Boolean(pa.isDiabetic),
    isSmoker: Boolean(pa.isSmoker),
    otherDiseases: pa.otherDiseases || '',
    isOncological: Boolean(pa.isOncological),
    oncologicalStage: pa.oncologicalStage || '',
    allergies: pa.allergies || '',
    isPcd: Boolean(pa.isPcd),
    pcdDescription: pa.pcdDescription || '',
    continuousMedications: Array.isArray(pa.continuousMedications)
      ? pa.continuousMedications.map((m: any) =>
          typeof m === 'string' ? m : m?.name || m?.medication || String(m),
        )
      : [],
    bloodPressure: pa.bloodPressure || '',
    glycemia: pa.glycemia || '',
    weight: pa.weight || '',
    height: pa.height || '',
  };
}

export const RequestDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [copiedToken, setCopiedToken] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<{ url: string; type: string; name: string } | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Estados de correção inline para solicitação devolvida
  const [draftType, setDraftType] = useState<RegulationRequestType>('CONSULTA');
  const [draftProcedureGroupId, setDraftProcedureGroupId] = useState<string>('');
  const [draftProcedureId, setDraftProcedureId] = useState<string>('');
  const [draftGroupProcedures, setDraftGroupProcedures] = useState<GroupProcedureDraftItem[]>([]);
  const [draftProcedureFilter, setDraftProcedureFilter] = useState('');
  const [draftPriority, setDraftPriority] = useState<RegulationRequestPriority>('ELETIVO');
  const [draftCid10, setDraftCid10] = useState('');
  const [draftClinicalJustification, setDraftClinicalJustification] = useState('');
  const [draftClinicalHistory, setDraftClinicalHistory] = useState('');
  const [draftAnamnesis, setDraftAnamnesis] = useState<AnamnesisFormValues>(EMPTY_ANAMNESIS_FORM);
  const [removeAttachmentIds, setRemoveAttachmentIds] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [resubmitJustification, setResubmitJustification] = useState('');

  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const permissions = useAuthStore((state) => state.permissions);
  const activeProfile = useAuthStore((state) => state.activeProfile);

  const { data: request, isLoading, isError, refetch } = useRegulationRequest(id || null);
  const resubmitMutation = useResubmitRegulationRequest();

  const { data: procedureGroupsData } = useProcedureGroups();
  const { data: proceduresData } = useProcedures({
    page: 1,
    limit: 500,
    ...(draftProcedureGroupId ? { procedureGroupId: draftProcedureGroupId } : {}),
  });

  const procedureGroups = useMemo(() => procedureGroupsData || [], [procedureGroupsData]);
  const proceduresList = useMemo(() => proceduresData?.data || [], [proceduresData]);
  const filteredProceduresList = useMemo(() => {
    const term = draftProcedureFilter.trim().toLowerCase();
    if (!term) return proceduresList;
    return proceduresList.filter(
      (proc) =>
        proc.name.toLowerCase().includes(term) ||
        (proc.code || '').toLowerCase().includes(term),
    );
  }, [proceduresList, draftProcedureFilter]);

  const isGroupProcedureMode = Boolean(draftProcedureGroupId || draftGroupProcedures.length > 0);

  const procedureId = request?.procedureId || request?.procedure?.id || undefined;
  const procedureGroupId = request?.procedureGroupId || request?.procedureGroup?.id || undefined;
  const { data: availableSlots = [] } = useAvailableSlots(procedureId, { procedureGroupId });
  const hasAvailableSlots = availableSlots.length > 0;

  const isAdmin = permissions.includes('admin:access');
  const linkedHealthCenterIds = useMemo(() => getUserLinkedHealthCenterIds(user), [user]);

  const canEditReturned = useMemo(() => {
    if (!request || request.status !== 'DEVOLVIDA') return false;
    const hasPerm = permissions.includes('regulation-solicitor:edit_returned') || isAdmin;
    if (!hasPerm) return false;
    if (isAdmin) return true;
    return linkedHealthCenterIds.includes(request.requestingHealthCenterId);
  }, [request, permissions, isAdmin, linkedHealthCenterIds]);

  const syncDraftFromRequest = (reqData: typeof request) => {
    if (!reqData) return;
    const initialGroupProcedures: GroupProcedureDraftItem[] =
      Array.isArray(reqData.groupProcedures) && reqData.groupProcedures.length > 0
        ? reqData.groupProcedures.map((gp) => ({
            ...(gp.procedureId ? { procedureId: gp.procedureId } : {}),
            code: gp.code || '',
            ...(gp.sigtapCode ? { sigtapCode: gp.sigtapCode } : {}),
            name: gp.name || '',
          }))
        : reqData.procedureGroupId && reqData.procedure
          ? [
              {
                procedureId: reqData.procedure.id,
                code: reqData.procedure.code || '',
                name: reqData.procedure.name,
              },
            ]
          : [];
    const hasGroupContext = Boolean(reqData.procedureGroupId || initialGroupProcedures.length > 0);

    setDraftType(reqData.type);
    setDraftProcedureGroupId(reqData.procedureGroupId || '');
    setDraftGroupProcedures(initialGroupProcedures);
    setDraftProcedureId(hasGroupContext ? '' : reqData.procedureId || '');
    setDraftProcedureFilter('');
    setDraftPriority(reqData.priority);
    setDraftCid10(reqData.cid10 || '');
    setDraftClinicalJustification(reqData.clinicalJustification || '');
    setDraftClinicalHistory(reqData.clinicalHistory || '');
    setDraftAnamnesis(mapPatientAnamnesisToForm(reqData.patient?.patientAnamnesis));
    setRemoveAttachmentIds([]);
    setNewFiles([]);
    setResubmitJustification('');
  };

  useEffect(() => {
    if (request) {
      syncDraftFromRequest(request);
      if (canEditReturned && searchParams.get('edit') === 'true') {
        setIsEditMode(true);
      } else if (request.status !== 'DEVOLVIDA') {
        setIsEditMode(false);
      }
    }
  }, [request, canEditReturned, searchParams]);

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

  const effectiveEditableFields = getEffectiveReturnEditableFields(request.returnEditableFields);
  const canEditField = (field: ReturnEditableField) =>
    isEditMode && isReturnFieldEditable(request.returnEditableFields, field);

  const renderFieldBadge = (field: ReturnEditableField) => {
    if (!isEditMode) return null;
    const unlocked = isReturnFieldEditable(request.returnEditableFields, field);
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
          unlocked
            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200'
            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
        }`}
      >
        {unlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
        <span>{unlocked ? 'Liberado para correção' : 'Bloqueado'}</span>
      </span>
    );
  };

  const latestReturnEntry = request.statusHistory?.find((h) => h.newStatus === 'DEVOLVIDA');

  const startEditMode = () => {
    syncDraftFromRequest(request);
    setIsEditMode(true);
    setSearchParams({ edit: 'true' });
  };

  const cancelEditMode = () => {
    syncDraftFromRequest(request);
    setIsEditMode(false);
    setSearchParams({});
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);
    const validFiles = selectedFiles.filter(
      (f) =>
        f.type === 'application/pdf' ||
        f.type === 'image/jpeg' ||
        f.type === 'image/png' ||
        f.type === 'image/jpg',
    );
    if (validFiles.length < selectedFiles.length) {
      toast.warning('Apenas arquivos PDF ou imagens (JPG/PNG) são permitidos.');
    }
    setNewFiles((prev) => [...prev, ...validFiles]);
    e.target.value = '';
  };

  const toggleRemoveExistingAttachment = (attId: string) => {
    setRemoveAttachmentIds((prev) =>
      prev.includes(attId) ? prev.filter((item) => item !== attId) : [...prev, attId],
    );
  };

  const isProcedureAlreadySelected = (
    proc: { id: string; code?: string | null; name: string },
    list: GroupProcedureDraftItem[],
  ) =>
    list.some(
      (item) =>
        (item.procedureId && item.procedureId === proc.id) ||
        (item.name.trim().toUpperCase() === proc.name.trim().toUpperCase() &&
          (item.code || '').trim().toUpperCase() === (proc.code || '').trim().toUpperCase()),
    );

  const handleAddGroupProcedure = () => {
    if (!draftProcedureId) return;
    const selectedProc = proceduresList.find((p) => p.id === draftProcedureId);
    if (!selectedProc) return;
    if (isProcedureAlreadySelected(selectedProc, draftGroupProcedures)) {
      toast.info('Este exame/procedimento já está na lista selecionada.');
      setDraftProcedureId('');
      return;
    }
    setDraftGroupProcedures((prev) => [
      ...prev,
      {
        procedureId: selectedProc.id,
        code: selectedProc.code || '',
        name: selectedProc.name,
      },
    ]);
    setDraftProcedureId('');
  };

  const handleRemoveGroupProcedure = (indexToRemove: number) => {
    setDraftGroupProcedures((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resubmitJustification || resubmitJustification.trim().length < 5) {
      toast.error('Informe a justificativa/descrição das correções realizadas (mínimo 5 caracteres).');
      return;
    }

    if (canEditField('CID10') && !draftCid10.trim()) {
      toast.error('Informe um CID-10 válido antes de reenviar.');
      return;
    }

    if (canEditField('CLINICAL_JUSTIFICATION') && draftClinicalJustification.trim().length < 5) {
      toast.error('A justificativa clínica deve conter pelo menos 5 caracteres.');
      return;
    }

    let effectiveGroupProcedures = draftGroupProcedures;
    if (canEditField('PROCEDURE') && isGroupProcedureMode) {
      if (draftProcedureId) {
        const pendingProc = proceduresList.find((p) => p.id === draftProcedureId);
        if (pendingProc && !isProcedureAlreadySelected(pendingProc, effectiveGroupProcedures)) {
          effectiveGroupProcedures = [
            ...effectiveGroupProcedures,
            {
              procedureId: pendingProc.id,
              code: pendingProc.code || '',
              name: pendingProc.name,
            },
          ];
        }
      }
      if (effectiveGroupProcedures.length === 0) {
        toast.error('Adicione pelo menos um exame/procedimento à lista antes de reenviar.');
        return;
      }
    }

    const resolvedPrimaryProcedureId = isGroupProcedureMode
      ? effectiveGroupProcedures.find((item) => item.procedureId)?.procedureId || null
      : draftProcedureId || null;

    const formData = buildRestrictedResubmitFormData(request.returnEditableFields, {
      justification: resubmitJustification,
      type: draftType,
      specialtyId: request.specialtyId || null,
      procedureGroupId: draftProcedureGroupId || null,
      procedureId: resolvedPrimaryProcedureId,
      groupProcedures: isGroupProcedureMode ? effectiveGroupProcedures : [],
      priority: draftPriority,
      cid10: draftCid10,
      clinicalJustification: draftClinicalJustification,
      clinicalHistory: draftClinicalHistory,
      anamnesis: draftAnamnesis,
      removeAttachmentIds,
      newFiles,
    });

    try {
      await resubmitMutation.mutateAsync({ id: request.id, formData });
      setIsEditMode(false);
      setSearchParams({});
      refetch();
    } catch {
      // Handled by hook
    }
  };

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
      case 'AGENDAMENTO_CANCELADO':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" /> AGENDAMENTO CANCELADO
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
      case 'URGENTE':
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

  const handleAttachmentAction = async (
    att: RegulationAttachment,
    mode: 'view' | 'download',
  ) => {
    try {
      await openAuthenticatedAttachment(att.fileUrl, token, att.fileName, mode);
    } catch {
      toast.error('Não foi possível abrir ou baixar o anexo.');
    }
  };

  const patientAge = calculateAge(request.patient?.birthDate);
  const currentAnamnesisForm = isEditMode
    ? draftAnamnesis
    : mapPatientAnamnesisToForm(request.patient?.patientAnamnesis);

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
              Protocolada em {formatDateTimeBR(request.createdAt)}
            </p>
          </div>
        </div>

        {/* Ações da Solicitação */}
        <div className="flex items-center gap-2 flex-wrap">
          {canEditReturned && !isEditMode && (
            <button
              type="button"
              onClick={startEditMode}
              className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Corrigir & Reenviar</span>
            </button>
          )}

          {canEditReturned && isEditMode && (
            <button
              type="button"
              onClick={cancelEditMode}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Cancelar Correção</span>
            </button>
          )}

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

      {/* Banner de Devolutiva para Correção */}
      {request.status === 'DEVOLVIDA' && (
        <div className="bg-orange-50/80 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4 space-y-3 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-orange-900 dark:text-orange-200">
                  Solicitação devolvida pela Central de Regulação para correção
                </h2>
                {latestReturnEntry?.justification && (
                  <p className="text-xs text-orange-800 dark:text-orange-300 leading-relaxed">
                    <strong>Parecer do regulador:</strong> {latestReturnEntry.justification}
                  </p>
                )}
              </div>
            </div>

            {canEditReturned && !isEditMode && (
              <button
                type="button"
                onClick={startEditMode}
                className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Corrigir & Reenviar</span>
              </button>
            )}
          </div>

          <div className="pt-2 border-t border-orange-200/70 dark:border-orange-900/50 flex items-center flex-wrap gap-1.5 text-[11px]">
            <span className="font-bold text-orange-900 dark:text-orange-200 mr-1">
              Campos liberados para edição:
            </span>
            {effectiveEditableFields.map((field) => (
              <span
                key={field}
                className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-orange-300 dark:border-orange-700 text-orange-800 dark:text-orange-200 font-semibold"
              >
                {getReturnFieldLabel(field)}
              </span>
            ))}
          </div>

          {!canEditReturned && searchParams.get('edit') === 'true' && (
            <p className="text-xs font-semibold text-red-700 dark:text-red-300">
              Apenas usuários com permissão vinculados à unidade solicitante desta requisição podem editar e reenviar os campos.
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmitCorrection} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal (Esquerda - 2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. DADOS DO PACIENTE */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Identificação do Paciente
                </h2>
              </div>
              {isEditMode && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  <Lock className="w-3 h-3" />
                  <span>Somente leitura</span>
                </span>
              )}
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

            <div className="space-y-4 text-xs">
              {/* Procedimento / Grupo / Tipo */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">
                    Procedimento / Grupo / Tipo:
                  </span>
                  {renderFieldBadge('PROCEDURE')}
                </div>

                {canEditField('PROCEDURE') ? (
                  <div className="space-y-3 p-3 rounded-lg border border-orange-300 dark:border-orange-800 bg-orange-50/40 dark:bg-orange-950/15">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Tipo
                        </label>
                        <select
                          aria-label="Tipo de solicitação"
                          value={draftType}
                          onChange={(e) => setDraftType(e.target.value as RegulationRequestType)}
                          className="w-full px-2.5 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                        >
                          <option value="CONSULTA">Consulta</option>
                          <option value="EXAME">Exame</option>
                          <option value="PROCEDIMENTO">Procedimento</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Grupo de Procedimento
                        </label>
                        <select
                          aria-label="Grupo de Procedimento"
                          value={draftProcedureGroupId}
                          onChange={(e) => {
                            const nextGroupId = e.target.value;
                            setDraftProcedureGroupId(nextGroupId);
                            setDraftProcedureId('');
                            setDraftProcedureFilter('');
                            if (nextGroupId !== draftProcedureGroupId) {
                              setDraftGroupProcedures([]);
                            }
                          }}
                          className="w-full px-2.5 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                        >
                          <option value="">Sem grupo específico</option>
                          {procedureGroups.map((grp) => (
                            <option key={grp.id} value={grp.id}>
                              {grp.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {isGroupProcedureMode ? (
                      <div className="space-y-2.5 pt-2 border-t border-orange-200 dark:border-orange-900/60">
                        <div className="flex items-center justify-between gap-2">
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                            Procedimentos / Exames Selecionados ({draftGroupProcedures.length})
                          </label>
                          {draftGroupProcedures.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setDraftGroupProcedures([])}
                              className="text-[11px] font-semibold text-red-600 hover:text-red-700 dark:text-red-400"
                            >
                              Limpar lista
                            </button>
                          )}
                        </div>

                        {draftGroupProcedures.length > 0 ? (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {draftGroupProcedures.map((gp, idx) => (
                              <div
                                key={`${gp.procedureId || gp.code || gp.name}-${idx}`}
                                className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md border border-orange-200 dark:border-orange-900/50 bg-white dark:bg-slate-950 text-xs"
                              >
                                <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                  {idx + 1}. {gp.name}{' '}
                                  {gp.sigtapCode || gp.code ? (
                                    <span className="text-slate-500 font-mono text-[11px]">
                                      ({gp.sigtapCode || gp.code})
                                    </span>
                                  ) : null}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveGroupProcedure(idx)}
                                  aria-label={`Remover ${gp.name}`}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 shrink-0"
                                >
                                  <Trash2 className="w-3 h-3" /> Remover
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-md px-2.5 py-2">
                            Nenhum procedimento na lista. Selecione abaixo para adicionar ao grupo.
                          </p>
                        )}

                        <div className="space-y-1.5 pt-1">
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={draftProcedureFilter}
                              onChange={(e) => setDraftProcedureFilter(e.target.value)}
                              aria-label="Filtrar exames ou procedimentos do grupo"
                              placeholder="Filtrar exame/procedimento do grupo por nome ou código..."
                              className="w-full pl-8 pr-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                            />
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <select
                              aria-label="Adicionar procedimento ao grupo"
                              value={draftProcedureId}
                              onChange={(e) => setDraftProcedureId(e.target.value)}
                              className="flex-1 px-2.5 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                            >
                              <option value="">Selecione um exame/procedimento para adicionar...</option>
                              {filteredProceduresList.map((proc) => (
                                <option key={proc.id} value={proc.id}>
                                  {proc.code ? `${proc.code} - ` : ''}
                                  {proc.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={handleAddGroupProcedure}
                              disabled={!draftProcedureId}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white text-xs font-semibold shrink-0 transition"
                            >
                              <Plus className="w-3.5 h-3.5" /> Adicionar
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Procedimento
                        </label>
                        <select
                          aria-label="Procedimento"
                          value={draftProcedureId}
                          onChange={(e) => setDraftProcedureId(e.target.value)}
                          className="w-full px-2.5 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                        >
                          <option value="">Selecione um procedimento</option>
                          {proceduresList.map((proc) => (
                            <option key={proc.id} value={proc.id}>
                              {proc.code ? `${proc.code} - ` : ''}
                              {proc.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      {request.procedureGroup ? (
                        <div>
                          <span className="text-sm font-bold text-blue-600 dark:text-blue-400 block mt-0.5">
                            {request.procedureGroup.name}
                          </span>
                          {request.groupProcedures && request.groupProcedures.length > 0 ? (
                            <div className="mt-2 space-y-1 pl-2.5 border-l-2 border-blue-500">
                              <span className="text-[11px] font-semibold text-slate-500 block">
                                Procedimentos do Grupo:
                              </span>
                              {request.groupProcedures.map((gp, idx) => (
                                <div key={idx} className="text-xs font-medium text-slate-800 dark:text-slate-200">
                                  {idx + 1}. {gp.name}{' '}
                                  {gp.sigtapCode || gp.code ? `(${gp.sigtapCode || gp.code})` : ''}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-600 dark:text-slate-300 block mt-0.5">
                              {request.procedure
                                ? `${request.procedure.code} - ${request.procedure.name}`
                                : request.specialty?.name}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400 block mt-0.5">
                          {request.procedure
                            ? `${request.procedure.code} - ${request.procedure.name}`
                            : request.specialty?.name}
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">
                        {request.procedure?.requiresRegulation ? 'Procedimento Regulado' : 'Acesso Direto'}
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">Tipo: {request.type}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Prioridade */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Nível de Prioridade:</span>
                  {renderFieldBadge('PRIORITY')}
                </div>
                {canEditField('PRIORITY') ? (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'ELETIVO', label: 'Eletivo' },
                      { id: 'PRIORITARIO', label: 'Prioritário' },
                      { id: 'URGENCIA', label: 'Urgência' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDraftPriority(opt.id as RegulationRequestPriority)}
                        className={`py-2 px-3 rounded-md border text-xs font-bold transition cursor-pointer ${
                          draftPriority === opt.id
                            ? 'border-orange-600 bg-orange-600 text-white'
                            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div>{getPriorityBadge(request.priority)}</div>
                )}
              </div>

              {/* CID-10 */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">
                    Hipótese Diagnóstica (CID-10):
                  </span>
                  {renderFieldBadge('CID10')}
                </div>
                <Cid10SelectorInput
                  value={canEditField('CID10') ? draftCid10 : request.cid10}
                  onChange={setDraftCid10}
                  disabled={!canEditField('CID10')}
                />
              </div>

              {/* Justificativa Clínica */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">
                    Justificativa Clínica:
                  </span>
                  {renderFieldBadge('CLINICAL_JUSTIFICATION')}
                </div>
                {canEditField('CLINICAL_JUSTIFICATION') ? (
                  <textarea
                    rows={4}
                    value={draftClinicalJustification}
                    onChange={(e) => setDraftClinicalJustification(e.target.value)}
                    placeholder="Detalhe a justificativa clínica atualizada..."
                    className="w-full p-3 rounded-lg border border-orange-300 dark:border-orange-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                ) : (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed border border-slate-200 dark:border-slate-700">
                    {request.clinicalJustification}
                  </div>
                )}
              </div>

              {/* Histórico Clínico */}
              {(request.clinicalHistory || isEditMode) && (
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">
                      Histórico Clínico / Observações:
                    </span>
                    {renderFieldBadge('CLINICAL_HISTORY')}
                  </div>
                  {canEditField('CLINICAL_HISTORY') ? (
                    <textarea
                      rows={3}
                      value={draftClinicalHistory}
                      onChange={(e) => setDraftClinicalHistory(e.target.value)}
                      placeholder="Informe histórico clínico complementar ou evolução..."
                      className="w-full p-3 rounded-lg border border-orange-300 dark:border-orange-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  ) : (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed border border-slate-200 dark:border-slate-700">
                      {request.clinicalHistory || 'Nenhum histórico clínico adicional informado.'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 3. ANAMNESE DO PACIENTE */}
          {(request.patient?.patientAnamnesis || isEditMode) && (
            <RequestAnamnesisCard
              values={currentAnamnesisForm}
              onChange={setDraftAnamnesis}
              editable={canEditField('ANAMNESIS')}
              showLockBadge={isEditMode}
            />
          )}

          {/* 4. DOCUMENTOS E ANEXOS COM PRÉ-VISUALIZAÇÃO E EDIÇÃO CONDICIONAL */}
          <div
            className={`bg-white dark:bg-slate-900 border rounded-xl p-5 shadow-xs space-y-4 ${
              canEditField('ATTACHMENTS')
                ? 'border-orange-300 dark:border-orange-700 ring-1 ring-orange-200 dark:ring-orange-900/40'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Documentos & Exames Anexados
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {renderFieldBadge('ATTACHMENTS')}
                <span className="text-xs text-slate-500 font-semibold">
                  {request.attachments?.length || 0} anexo(s)
                </span>
              </div>
            </div>

            {!request.attachments || request.attachments.length === 0 ? (
              <div className="py-6 text-center text-slate-400 dark:text-slate-500 space-y-1">
                <FileText className="w-8 h-8 mx-auto stroke-1" />
                <p className="text-xs">Nenhum exame ou documento foi anexado a esta solicitação.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {request.attachments.map((att) => {
                  const isImg = isRegulationAttachmentImage(att);
                  const isPdf = isRegulationAttachmentPdf(att);
                  const markedForRemoval = removeAttachmentIds.includes(att.id);

                  return (
                    <div
                      key={att.id}
                      className={`border rounded-lg overflow-hidden flex flex-col justify-between transition ${
                        markedForRemoval
                          ? 'border-red-300 dark:border-red-800 bg-red-50/40 dark:bg-red-950/20 opacity-65'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:border-blue-400'
                      }`}
                    >
                      {isImg ? (
                        <div className="relative group bg-slate-100 dark:bg-slate-950 flex items-center justify-center h-44 overflow-hidden">
                          <AuthenticatedAttachmentImage fileUrl={att.fileUrl} alt={att.fileName} />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewAttachment({
                                  url: att.fileUrl,
                                  type: att.fileType || 'image/*',
                                  name: att.fileName,
                                })
                              }
                              className="px-3 py-1.5 bg-white/90 hover:bg-white text-slate-900 rounded-md text-xs font-bold flex items-center gap-1 shadow-md cursor-pointer transition active:scale-95"
                            >
                              <ZoomIn className="w-3.5 h-3.5" />
                              <span>Ampliar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAttachmentAction(att, 'download')}
                              className="p-1.5 bg-white/90 hover:bg-white text-slate-900 rounded-md shadow-md cursor-pointer transition active:scale-95"
                              title="Baixar imagem"
                            >
                              <Download className="w-4 h-4" />
                            </button>
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

                      <div className="p-3 flex items-center justify-between gap-2 text-xs bg-white dark:bg-slate-900">
                        <div className="min-w-0">
                          <span
                            className={`font-medium truncate block text-[11px] ${
                              markedForRemoval
                                ? 'line-through text-red-600 dark:text-red-400'
                                : 'text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {att.fileName}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {markedForRemoval
                              ? 'Será removido ao reenviar'
                              : att.fileSize
                              ? `${Math.round(att.fileSize / 1024)} KB`
                              : 'Arquivo anexado'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {(isImg || isPdf) && (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewAttachment({
                                  url: att.fileUrl,
                                  type: att.fileType || (isPdf ? 'application/pdf' : 'image/*'),
                                  name: att.fileName,
                                })
                              }
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition cursor-pointer"
                              title="Visualizar anexo"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleAttachmentAction(att, 'view')}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition cursor-pointer"
                            title="Visualizar em nova aba"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAttachmentAction(att, 'download')}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition cursor-pointer"
                            title="Baixar arquivo"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          {canEditField('ATTACHMENTS') && (
                            <button
                              type="button"
                              onClick={() => toggleRemoveExistingAttachment(att.id)}
                              className={`p-1.5 rounded-md transition cursor-pointer ${
                                markedForRemoval
                                  ? 'text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40'
                                  : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30'
                              }`}
                              title={markedForRemoval ? 'Desfazer remoção' : 'Remover anexo'}
                            >
                              {markedForRemoval ? <RotateCcw className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {canEditField('ATTACHMENTS') && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                <label className="flex items-center justify-center w-full h-24 px-4 border-2 border-dashed border-orange-300 dark:border-orange-700 rounded-lg cursor-pointer hover:bg-orange-50/40 dark:hover:bg-orange-950/20 transition">
                  <div className="flex flex-col items-center space-y-1 text-center">
                    <Upload className="w-5 h-5 text-orange-600" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Adicionar novos documentos / exames (PDF ou Imagem)
                    </span>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,image/png,image/jpeg,image/jpg"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>

                {newFiles.length > 0 && (
                  <div className="space-y-1.5">
                    {newFiles.map((file, idx) => (
                      <div
                        key={`${file.name}-${idx}`}
                        className="flex items-center justify-between p-2 rounded bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 text-xs"
                      >
                        <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                          {file.name} ({Math.round(file.size / 1024)} KB)
                        </span>
                        <button
                          type="button"
                          onClick={() => setNewFiles((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5. CONFIRMAÇÃO E REENVIO DA CORREÇÃO */}
          {isEditMode && (
            <div className="bg-orange-50/70 dark:bg-orange-950/25 border-2 border-orange-300 dark:border-orange-700 rounded-xl p-5 shadow-xs space-y-4">
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-orange-900 dark:text-orange-200 flex items-center gap-2">
                  <Send className="w-4 h-4 text-orange-600" />
                  <span>Confirmar Correção & Reenviar para Regulação</span>
                </h2>
                <p className="text-xs text-orange-800/80 dark:text-orange-300/80">
                  Descreva resumidamente o que foi corrigido para registrar na trilha de auditoria.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Observação / Justificativa da Correção <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={resubmitJustification}
                  onChange={(e) => setResubmitJustification(e.target.value)}
                  placeholder="Ex: Justificativa clínica complementada conforme parecer do regulador e novo exame anexado."
                  className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={cancelEditMode}
                  disabled={resubmitMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resubmitMutation.isPending}
                  className="px-4 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-md shadow-md transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {resubmitMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Reenviando...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Reenviar Solicitação Corrigida</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Coluna Lateral (Direita - 1/3) */}
        <div className="space-y-6">
          {/* Card Se Estiver Agendada */}
          {(request.status === 'AGENDADA' || Boolean(request.confirmationToken)) && (
            <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Atendimento Agendado</span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Data do Atendimento:</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {formatDateBR(request.scheduledDate)}
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
                        type="button"
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
                  const statusMeta = getRegulationStatusMeta(hist.newStatus);

                  return (
                    <div key={hist.id || idx} className="relative pl-6 text-xs">
                      <div
                        className={`absolute left-0.5 top-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                          isProcChange ? 'bg-indigo-600' : statusMeta.dotClass
                        }`}
                      />
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded font-semibold text-[11px] ${
                            isProcChange
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                              : statusMeta.badgeClass
                          }`}
                        >
                          {getStatusHistoryEventLabel(hist)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatDateTimeBR(hist.createdAt)}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5 whitespace-pre-wrap leading-relaxed">
                        {hist.justification}
                      </p>
                      {hist.editableFields && hist.editableFields.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {hist.editableFields.map((field) => (
                            <span
                              key={field}
                              className="px-1.5 py-0.5 rounded bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 text-[10px] font-semibold"
                            >
                              {getReturnFieldLabel(field)}
                            </span>
                          ))}
                        </div>
                      )}
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
      </form>

      {/* Visualizador autenticado para imagens ampliadas e documentos PDF */}
      {previewAttachment && (
        <AttachmentViewer
          file={previewAttachment}
          onClose={() => setPreviewAttachment(null)}
        />
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
