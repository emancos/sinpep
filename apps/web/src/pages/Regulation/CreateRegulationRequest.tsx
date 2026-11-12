import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Search,
  Upload,
  Paperclip,
  Trash2,
  Stethoscope,
  Activity,
  User,
  FileText,
  Send,
  Phone,
  Check,
  Clock,
  Loader,
  X,
  Heart,
  Eye,
  Plus,
  RefreshCw,
  Building2,
  Printer,
  AlertCircle,
} from 'lucide-react';
import { useProcedures, useProcedureGroups } from '../../hooks/useProcedures';
import { useCreateRegulationRequest } from '../../hooks/useRegulation';
import { useAuthStore } from '../../store/useAuthStore';
import { BookSlotModal } from './BookSlotModal';
import { RegulationRequestPrintModal } from './RegulationRequestPrintModal';
import { apiUrl } from '../../services/api';
import type { RegulationRequest } from '../../services/regulation';
import { formatCPF, formatCNS, formatDateBR } from '../../utils/brazilianFormatters';
import axios from 'axios';
import { toast } from 'sonner';

interface AnamnesisState {
  isHypertensive: boolean;
  isDiabetic: boolean;
  isSmoker: boolean;
  otherDiseases: string;
  isOncological: boolean;
  oncologicalStage: string;
  allergies: string;
  isPcd: boolean;
  pcdDescription: string;
  continuousMedications: string[];
  bloodPressure: string;
  glycemia: string;
  weight: string;
  height: string;
}

const initialAnamnesis: AnamnesisState = {
  isHypertensive: false,
  isDiabetic: false,
  isSmoker: false,
  otherDiseases: '',
  isOncological: false,
  oncologicalStage: '',
  allergies: '',
  isPcd: false,
  pcdDescription: '',
  continuousMedications: [],
  bloodPressure: '',
  glycemia: '',
  weight: '',
  height: '',
};

export const CreateRegulationRequest: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const permissions = useAuthStore((state) => state.permissions);
  const activeProfile = useAuthStore((state) => state.activeProfile);

  // Stepper state (1 a 4)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [createdRequestForBooking, setCreatedRequestForBooking] = useState<RegulationRequest | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [completedRequest, setCompletedRequest] = useState<RegulationRequest | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // =========================================================================
  // ETAPA 1: Paciente & Anamnese
  // =========================================================================
  const defaultPatientFromState = location.state?.defaultPatient;
  const [selectedPatient, setSelectedPatient] = useState<any>(defaultPatientFromState || null);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);
  const [searchExecuted, setSearchExecuted] = useState(false);
  const [patientSearchResults, setPatientSearchResults] = useState<any[]>([]);
  const [showPatientDetailsModal, setShowPatientDetailsModal] = useState(false);

  // Anamnese State
  const [anamnesis, setAnamnesis] = useState<AnamnesisState>(initialAnamnesis);
  const [newMedicationInput, setNewMedicationInput] = useState('');

  // Carrega anamnese quando o paciente é selecionado
  useEffect(() => {
    if (selectedPatient) {
      if (selectedPatient.patientAnamnesis) {
        const pa = selectedPatient.patientAnamnesis;
        setAnamnesis({
          isHypertensive: pa.isHypertensive || false,
          isDiabetic: pa.isDiabetic || false,
          isSmoker: pa.isSmoker || false,
          otherDiseases: pa.otherDiseases || '',
          isOncological: pa.isOncological || false,
          oncologicalStage: pa.oncologicalStage || '',
          allergies: pa.allergies || '',
          isPcd: pa.isPcd || false,
          pcdDescription: pa.pcdDescription || '',
          continuousMedications: pa.continuousMedications || [],
          bloodPressure: pa.bloodPressure || '',
          glycemia: pa.glycemia || '',
          weight: pa.weight || '',
          height: pa.height || '',
        });
      }
    }
  }, [selectedPatient]);

  // Função de busca manual de paciente
  const handleSearchPatient = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = patientSearchTerm.trim();
    if (!query) {
      toast.warning('Digite o Nome, CPF ou Cartão SUS para buscar.');
      return;
    }

    setIsSearchingPatient(true);
    setSearchExecuted(true);
    try {
      const response = await axios.get(`${apiUrl}/patients`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { search: query, limit: 10, page: 1 },
      });
      const results = response.data?.data || [];
      setPatientSearchResults(results);

      if (results.length === 1) {
        setSelectedPatient(results[0]);
        toast.success(`Paciente "${results[0].name}" selecionado.`);
      } else if (results.length === 0) {
        toast.info('Nenhum paciente cadastrado encontrado.');
      }
    } catch (err: any) {
      console.error('Erro ao pesquisar paciente:', err);
      toast.error('Erro ao pesquisar paciente no sistema.');
    } finally {
      setIsSearchingPatient(false);
    }
  };

  const handleAddMedication = () => {
    const med = newMedicationInput.trim();
    if (!med) return;
    if (anamnesis.continuousMedications.includes(med)) {
      toast.warning('Este medicamento já foi adicionado.');
      return;
    }
    setAnamnesis((prev) => ({
      ...prev,
      continuousMedications: [...prev.continuousMedications, med],
    }));
    setNewMedicationInput('');
  };

  const handleRemoveMedication = (index: number) => {
    setAnamnesis((prev) => ({
      ...prev,
      continuousMedications: prev.continuousMedications.filter((_, i) => i !== index),
    }));
  };

  // Cálculo de IMC
  const calculateImc = (weightStr?: string, heightStr?: string) => {
    const w = parseFloat(weightStr?.replace(',', '.') || '0');
    const h = parseFloat(heightStr?.replace(',', '.') || '0');
    if (w > 0 && h > 0) {
      const imc = w / (h * h);
      let label = 'Normal';
      let color = 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200';
      if (imc < 18.5) {
        label = 'Abaixo do peso';
        color = 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200';
      } else if (imc < 25) {
        label = 'Peso normal';
        color = 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200';
      } else if (imc < 30) {
        label = 'Sobrepeso';
        color = 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200';
      } else {
        label = 'Obesidade';
        color = 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200';
      }
      return { imc: imc.toFixed(1), label, color };
    }
    return null;
  };

  // =========================================================================
  // ETAPA 2: Tipo de Solicitação, Procedimento & Prioridade (Cards 2 e 3)
  // =========================================================================
  const [requestType, setRequestType] = useState<'CONSULTA' | 'EXAME' | 'PROCEDIMENTO'>('CONSULTA');
  const [procedureGroupId, setProcedureGroupId] = useState('');
  const [procedureId, setProcedureId] = useState(''); // Usado para Consulta Médica
  const [selectedProcedures, setSelectedProcedures] = useState<any[]>([]); // Múltiplos exames/procedimentos do mesmo grupo
  const [priority, setPriority] = useState<'ELETIVO' | 'PRIORITARIO' | 'URGENCIA'>('ELETIVO');
  const [consultaFilterTerm, setConsultaFilterTerm] = useState('');
  const [groupFilterTerm, setGroupFilterTerm] = useState('');
  const [groupChangeNotice, setGroupChangeNotice] = useState('');

  // Busca de consultas médicas (procedimentos da tabela SIGTAP de consulta especializada)
  const { data: consultationsData, isLoading: isLoadingConsultations } = useProcedures({
    page: 1,
    limit: 300,
    search: 'consulta',
    sortBy: 'name',
    sortOrder: 'asc',
    requestingHealthCenterId: user?.healthCenterId,
  });
  const consultationProcedures = consultationsData?.data || [];

  const { data: procedureGroups } = useProcedureGroups();
  const [proceduresInGroup, setProceduresInGroup] = useState<any[]>([]);
  const [isLoadingProcedures, setIsLoadingProcedures] = useState(false);
  const [procedureFilterTerm, setProcedureFilterTerm] = useState('');

  useEffect(() => {
    if (!procedureGroupId) {
      setProceduresInGroup([]);
      setProcedureId('');
      setProcedureFilterTerm('');
      return;
    }

    setIsLoadingProcedures(true);
    axios
      .get(`${apiUrl}/procedures`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { procedureGroupId, limit: 500, includeInactive: 'false', requestingHealthCenterId: user?.healthCenterId },
      })
      .then((res) => {
        let procs = res.data.data || [];
        // Sempre remover consultas especializadas (0301010072) pois possuem aba própria
        procs = procs.filter(
          (p: any) => p.code !== '0301010072' && !p.name?.toLowerCase().startsWith('consulta ')
        );

        // Se estiver em Exame Diagnóstico e for grupo genérico, remover cirurgias
        if (requestType === 'EXAME') {
          procs = procs.filter((p: any) => !p.code?.startsWith('04'));
        }
        setProceduresInGroup(procs);
      })
      .catch((err) => {
        console.error('Erro ao buscar procedimentos do grupo:', err);
        setProceduresInGroup([]);
      })
      .finally(() => {
        setIsLoadingProcedures(false);
      });
  }, [procedureGroupId, requestType, token]);

  // Altera a modalidade e reinicia os campos de procedimento relacionados
  const handleModalityChange = (nextType: 'CONSULTA' | 'EXAME' | 'PROCEDIMENTO') => {
    if (nextType === requestType) return;
    if (selectedProcedures.length > 0) {
      toast.info('Modalidade alterada. Os itens selecionados anteriormente foram reiniciados.');
    }
    setRequestType(nextType);
    setProcedureId('');
    setProcedureGroupId('');
    setSelectedProcedures([]);
    setConsultaFilterTerm('');
    setGroupFilterTerm('');
    setProcedureFilterTerm('');
    setGroupChangeNotice('');
  };

  // Altera o grupo de procedimento e reinicia os itens selecionados caso o grupo mude
  const handleGroupChange = (newGroupId: string) => {
    const hadItems = selectedProcedures.length > 0 && newGroupId !== procedureGroupId;
    if (hadItems) {
      setSelectedProcedures([]);
      const msg = 'Grupo alterado. Os itens selecionados do grupo anterior foram reiniciados.';
      setGroupChangeNotice(msg);
      toast.info(msg);
    } else {
      setGroupChangeNotice('');
    }
    setProcedureGroupId(newGroupId);
    setProcedureId('');
    setProcedureFilterTerm('');
  };

  // Alterna (adiciona ou remove com 1 clique) um procedimento/exame do grupo na lista da solicitação
  const handleToggleProcedure = (item: any) => {
    if (!item) return;
    setGroupChangeNotice('');
    setSelectedProcedures((prev) =>
      prev.some((p: any) => p.id === item.id)
        ? prev.filter((p: any) => p.id !== item.id)
        : [...prev, item],
    );
  };

  // Remove um procedimento/exame da lista
  const handleRemoveProcedure = (id: string) => {
    setSelectedProcedures((prev) => prev.filter((p: any) => p.id !== id));
  };

  // =========================================================================
  // ETAPA 3: CID-10, Justificativa & Anexos (Cards 4 e 5)
  // =========================================================================
  const [cidSearchTerm, setCidSearchTerm] = useState('');
  const [cidResults, setCidResults] = useState<Array<{ code: string; description: string }>>([]);
  const [selectedCid, setSelectedCid] = useState<{ code: string; description: string } | null>(null);
  const [isSearchingCid, setIsSearchingCid] = useState(false);
  const [clinicalJustification, setClinicalJustification] = useState('');
  const [clinicalHistory, setClinicalHistory] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  // Debounce busca CID-10
  useEffect(() => {
    if (!cidSearchTerm || cidSearchTerm.trim().length < 2) {
      setCidResults([]);
      return;
    }

    const handler = setTimeout(async () => {
      setIsSearchingCid(true);
      try {
        const res = await axios.get(`${apiUrl}/cid10/search?q=${encodeURIComponent(cidSearchTerm.trim())}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCidResults(res.data || []);
      } catch (err) {
        console.error('Erro ao buscar CID-10:', err);
      } finally {
        setIsSearchingCid(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [cidSearchTerm, token]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);
    const validFiles = selectedFiles.filter(
      (file) =>
        file.type === 'application/pdf' ||
        file.type === 'image/jpeg' ||
        file.type === 'image/png' ||
        file.type === 'image/jpg',
    );

    if (validFiles.length < selectedFiles.length) {
      toast.warning('Apenas arquivos PDF e imagens (PNG/JPEG) são aceitos.');
    }

    setFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // =========================================================================
  // NAVEGAÇÃO E VALIDAÇÃO DAS ETAPAS
  // =========================================================================
  const canNavigateToStep = (targetStep: number): boolean => {
    if (targetStep === currentStep) return true;
    if (targetStep < currentStep) return true; // Sempre pode voltar

    // Validações para avançar da Etapa 1
    if (targetStep >= 2 && !selectedPatient) {
      toast.warning('Pesquise e selecione um paciente na Etapa 1 para prosseguir.');
      return false;
    }

    // Validações para avançar da Etapa 2
    if (targetStep >= 3) {
      if (requestType === 'CONSULTA') {
        if (!procedureId) {
          toast.warning('Selecione a Consulta Médica na Etapa 2.');
          return false;
        }
      } else {
        if (!procedureGroupId) {
          toast.warning(`Selecione o Grupo de ${requestType === 'EXAME' ? 'Exame' : 'Procedimento'} na Etapa 2.`);
          return false;
        }

        if (selectedProcedures.length === 0) {
          toast.warning(`Adicione pelo menos um ${requestType === 'EXAME' ? 'exame' : 'procedimento'} na Etapa 2.`);
          return false;
        }
      }
    }

    // Validações para avançar da Etapa 3
    if (targetStep >= 4) {
      if (!selectedCid) {
        toast.warning('Selecione a Hipótese Diagnóstica (CID-10) na Etapa 3.');
        return false;
      }
      if (!clinicalJustification || clinicalJustification.trim().length < 5) {
        toast.warning('Informe a Justificativa Clínica detalhada na Etapa 3 (mínimo 5 caracteres).');
        return false;
      }
    }

    return true;
  };

  const handleStepClick = (stepNumber: number) => {
    if (canNavigateToStep(stepNumber)) {
      setCurrentStep(stepNumber);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextStep = () => {
    if (canNavigateToStep(currentStep + 1)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // =========================================================================
  // SUBMISSÃO FINAL (ETAPA 4)
  // =========================================================================
  const createRequestMutation = useCreateRegulationRequest();

  const handleSubmit = async () => {
    if (!canNavigateToStep(4)) return;

    const formData = new FormData();
    formData.append('patientId', selectedPatient.id);
    formData.append('type', requestType);
    formData.append('priority', priority);
    formData.append('cid10', `${selectedCid!.code} - ${selectedCid!.description}`);
    formData.append('clinicalJustification', clinicalJustification.trim());
    if (clinicalHistory) formData.append('clinicalHistory', clinicalHistory.trim());

    const effectiveItems = selectedProcedures;

    if (requestType === 'CONSULTA') {
      if (procedureId) formData.append('procedureId', procedureId);
      if (procedureGroupId) formData.append('procedureGroupId', procedureGroupId);
    } else {
      if (procedureGroupId) formData.append('procedureGroupId', procedureGroupId);

      const pIds = effectiveItems.map((p: any) => p.id);
      const groupProceduresPayload = effectiveItems.map((p: any) => ({
        procedureId: p.id,
        code: p.code || '',
        name: p.name || '',
      }));
      formData.append('procedureIds', JSON.stringify(pIds));
      formData.append('groupProcedures', JSON.stringify(groupProceduresPayload));
      if (pIds.length > 0) {
        formData.append('procedureId', pIds[0]);
      }
    }

    // Anamnese sincronizada
    formData.append('anamnesis', JSON.stringify(anamnesis));

    // Anexos
    files.forEach((file) => {
      formData.append('attachments', file);
    });

    try {
      const created = await createRequestMutation.mutateAsync(formData);

      const isAdmin = permissions.includes('admin:access');
      const isRegulator =
        activeProfile?.name === 'Regulador (Central de Regulação)' ||
        permissions.includes('regulation-operator:read');
      const isCoordinator = activeProfile?.name === 'Coordenador de Unidade';
      const isSolicitor =
        activeProfile?.name?.includes('Solicitante') ||
        permissions.includes('regulation-solicitor:read');

      const requiresRegulation =
        requestType === 'CONSULTA'
          ? selectedProcedureObj?.requiresRegulation ?? true
          : effectiveItems.length > 0
            ? effectiveItems.some((p: any) => p.requiresRegulation !== false)
            : true;
      const canScheduleDirectly =
        isAdmin || isRegulator || isCoordinator || (!requiresRegulation && isSolicitor);

      // Verifica se existem escalas/vagas abertas disponíveis para o procedimento solicitado
      const targetProcId = created?.procedureId || effectiveItems[0]?.id || undefined;
      const targetGroupId = created?.procedureGroupId || procedureGroupId || undefined;
      let hasAvailableSlots = false;

      if (targetProcId || targetGroupId) {
        try {
          const slotsRes = await axios.get(`${apiUrl}/schedules/available-slots`, {
            headers: { Authorization: `Bearer ${token}` },
            params: {
              procedureId: targetProcId || undefined,
              procedureGroupId: targetGroupId || undefined,
            },
          });
          hasAvailableSlots = Array.isArray(slotsRes.data) && slotsRes.data.length > 0;
        } catch {
          hasAvailableSlots = false;
        }
      }

      if (canScheduleDirectly && hasAvailableSlots && created) {
        setCreatedRequestForBooking(created);
        setShowBookingModal(true);
      } else if (created) {
        // Se NÃO existirem agendas disponíveis: exibe tela de sucesso apenas com a opção de impressão da ficha!
        setCompletedRequest(created);
        setShowSuccessModal(true);
      } else {
        navigate('/regulation/solicitor');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Falha ao protocolar solicitação';
      toast.error(msg);
    }
  };

  // Configuração das etapas para o Stepper / Paginação
  const STEPS = [
    { number: 1, title: 'Paciente & Anamnese', shortTitle: 'Paciente', icon: User },
    { number: 2, title: 'Tipo & Prioridade', shortTitle: 'Procedimento', icon: Activity },
    { number: 3, title: 'Diagnóstico & Anexos', shortTitle: 'Diagnóstico', icon: FileText },
    { number: 4, title: 'Revisão & Protocolo', shortTitle: 'Revisão', icon: Check },
  ];

  // Categorização inteligente dos grupos de procedimentos (SUS / SIGTAP)
  const isDiagnosticGroup = (name: string): boolean => {
    const upper = (name || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Excluir explicitamente intervencionistas, cirúrgicos, odontologia, quimioterapia e cuidados
    if (
      upper.includes('INTERVENCIONISTA') ||
      upper.includes('CIRURG') ||
      upper.includes('ODONTO') ||
      upper.includes('QUIMIO') ||
      upper.includes('TERAPIA') ||
      upper.includes('CUIDADOS')
    ) {
      return false;
    }

    return (
      upper.includes('DIAGNOSTIC') ||
      upper.includes('EXAME') ||
      upper.includes('LABORATORI') ||
      upper.includes('ULTRASSO') ||
      upper.includes('TOMOGRAFIA') ||
      upper.includes('RESSONANCIA') ||
      upper.includes('MAMOGRAFIA') ||
      upper.includes('PATOLOGIA') ||
      upper.includes('CITOPATOLOGIA') ||
      upper.includes('ELETRONEUROMIOGRAFIA') ||
      upper.includes('MEDICINA NUCLEAR') ||
      upper.includes('RADIODIAGNOSTICO')
    );
  };

  const filteredProcedureGroups = useMemo(() => {
    if (!procedureGroups || !Array.isArray(procedureGroups)) return [];

    if (requestType === 'EXAME') {
      return procedureGroups
        .filter((grp: any) => isDiagnosticGroup(grp.name) || grp.name === 'PROCEDIMENTOS SEM GRUPO')
        .map((grp: any) => ({
          ...grp,
          displayName:
            grp.name === 'PROCEDIMENTOS SEM GRUPO'
              ? 'OUTROS EXAMES DIAGNÓSTICOS (ENDOSCOPIA, COLONOSCOPIA, ETC.)'
              : grp.name,
        }))
        .sort((a: any, b: any) => a.displayName.localeCompare(b.displayName));
    }

    if (requestType === 'PROCEDIMENTO') {
      return procedureGroups
        .filter((grp: any) => !isDiagnosticGroup(grp.name))
        .map((grp: any) => ({
          ...grp,
          displayName:
            grp.name === 'PROCEDIMENTOS SEM GRUPO'
              ? 'OUTROS PROCEDIMENTOS (CLÍNICOS / CIRÚRGICOS)'
              : grp.name,
        }))
        .sort((a: any, b: any) => a.displayName.localeCompare(b.displayName));
    }

    return procedureGroups.map((grp: any) => ({ ...grp, displayName: grp.name }));
  }, [procedureGroups, requestType]);

  const allAvailableProcedures = requestType === 'CONSULTA' ? consultationProcedures : proceduresInGroup;
  const selectedProcedureObj = allAvailableProcedures.find((p: any) => p.id === procedureId);
  const selectedGroupObj = filteredProcedureGroups.find((g: any) => g.id === procedureGroupId);
  const selectedGroupName =
    selectedGroupObj?.displayName || procedureGroups?.find((g: any) => g.id === procedureGroupId)?.name;

  const filteredConsultations = useMemo(() => {
    const term = consultaFilterTerm.trim().toLowerCase();
    let list = consultationProcedures;
    if (term) {
      list = list.filter((p: any) =>
        p.name?.toLowerCase().includes(term) || (p.code && p.code.includes(term))
      );
    }
    if (procedureId && selectedProcedureObj && !list.some((p: any) => p.id === procedureId)) {
      list = [selectedProcedureObj, ...list];
    }
    return list;
  }, [consultationProcedures, consultaFilterTerm, procedureId, selectedProcedureObj]);

  const visibleProcedureGroups = useMemo(() => {
    const term = groupFilterTerm.trim().toLowerCase();
    if (!term) return filteredProcedureGroups;
    return filteredProcedureGroups.filter(
      (grp: any) =>
        grp.id === procedureGroupId ||
        grp.displayName?.toLowerCase().includes(term) ||
        grp.name?.toLowerCase().includes(term),
    );
  }, [filteredProcedureGroups, groupFilterTerm, procedureGroupId]);

  const filteredProceduresInGroup = useMemo(() => {
    const term = procedureFilterTerm.trim().toLowerCase();
    if (!term) return proceduresInGroup;
    return proceduresInGroup.filter(
      (p: any) => p.name?.toLowerCase().includes(term) || (p.code && p.code.includes(term)),
    );
  }, [proceduresInGroup, procedureFilterTerm]);

  const effectiveSelectedProcedures = selectedProcedures;

  return (
    <div className="space-y-4 lg:space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 lg:p-5 shadow-sm">
        <div className="flex items-start sm:items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/regulation/solicitor')}
            className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md transition cursor-pointer"
            title="Voltar para a lista"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                Atenção Primária / UBS
              </span>
              <span className="text-xs text-slate-400">Regulação Municipal</span>
            </div>
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white mt-1 tracking-tight">
              Nova Solicitação de Regulação
            </h1>
            <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400">
              Formulário guiado em 4 etapas para encaminhamento a consultas, exames ou procedimentos.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/regulation/solicitor')}
          className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md transition self-start sm:self-auto cursor-pointer"
        >
          Cancelar
        </button>
      </div>

      {/* STEPPER / ÍNDICE DE ETAPAS (PAGINAÇÃO INTERATIVA) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 lg:p-4 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 lg:gap-3">
          {STEPS.map((step) => {
            const isCompleted = step.number < currentStep;
            const isActive = step.number === currentStep;
            const Icon = step.icon;

            return (
              <button
                key={step.number}
                type="button"
                onClick={() => handleStepClick(step.number)}
                className={`flex items-center gap-2.5 p-2.5 lg:p-3 rounded-md border text-left transition-all cursor-pointer ${
                  isActive
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 dark:border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                    : isCompleted
                    ? 'border-emerald-300 dark:border-emerald-800/70 bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 opacity-75 hover:opacity-100 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : step.number}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 shrink-0 opacity-70" />
                    <span
                      className={`text-xs font-bold truncate ${
                        isActive
                          ? 'text-blue-900 dark:text-blue-200'
                          : isCompleted
                          ? 'text-emerald-900 dark:text-emerald-200'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {step.number === 1
                      ? 'Identificação'
                      : step.number === 2
                      ? 'Procedimento & Risco'
                      : step.number === 3
                      ? 'CID-10 & Justificativa'
                      : 'Revisão Final'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ETAPA 1: PESQUISA DE PACIENTE E ANAMNESE */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="space-y-4 lg:space-y-6 animate-in fade-in duration-200">
          {/* Card 1: Pesquisa & Identificação do Paciente */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
            <div className="px-4 py-3 bg-blue-50/70 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/40 rounded-t-lg flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-blue-600 text-white rounded-md">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-blue-950 dark:text-blue-100 uppercase tracking-wide">
                    1. Identificação do Paciente
                  </h2>
                  <p className="text-[11px] text-blue-800/80 dark:text-blue-300">
                    Pesquise o munícipe pelo CPF, Cartão SUS ou Nome
                  </p>
                </div>
              </div>
              {selectedPatient && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Paciente Selecionado
                </span>
              )}
            </div>

            <div className="p-4 lg:p-6 space-y-4">
              {/* Barra de Pesquisa */}
              {!selectedPatient ? (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Buscar paciente cadastrado na base municipal:
                  </label>
                  <form onSubmit={handleSearchPatient} className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={patientSearchTerm}
                        onChange={(e) => setPatientSearchTerm(e.target.value)}
                        placeholder="Digite o Nome, CPF ou Cartão SUS (CNS) e clique em Buscar..."
                        className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-xs lg:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSearchingPatient}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-md text-xs lg:text-sm shadow-sm transition flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      {isSearchingPatient ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          <span>Buscando...</span>
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4" />
                          <span>Buscar</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* Resultados múltiplos da busca manual */}
                  {searchExecuted && !selectedPatient && (
                    <div className="mt-3 border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden bg-slate-50/50 dark:bg-slate-950/40">
                      {patientSearchResults.length === 0 ? (
                        <div className="p-5 text-center text-xs text-slate-500">
                          Nenhum paciente encontrado para "{patientSearchTerm}". Verifique os dígitos ou o nome.
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto">
                          <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex justify-between">
                            <span>Pacientes encontrados ({patientSearchResults.length}): selecione um para continuar</span>
                          </div>
                          {patientSearchResults.map((p) => (
                            <div
                              key={p.id}
                              className="p-3 hover:bg-blue-50/70 dark:hover:bg-slate-800/80 transition flex items-center justify-between"
                            >
                              <div>
                                <div className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm">
                                  {p.name}
                                </div>
                                <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-3 mt-0.5">
                                  <span>CPF: <strong>{formatCPF(p.cpf)}</strong></span>
                                  {p.cns && <span>CNS: <strong>{formatCNS(p.cns)}</strong></span>}
                                  {p.birthDate && <span>Nasc: {formatDateBR(p.birthDate)}</span>}
                                  {p.healthCenter?.name && <span>UBS: {p.healthCenter.name}</span>}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPatient(p);
                                  toast.success(`Paciente "${p.name}" selecionado.`);
                                }}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md transition shadow-sm cursor-pointer"
                              >
                                Selecionar
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Card do Paciente Selecionado com Botão de Detalhes e Trocar */
                <div className="bg-gradient-to-r from-blue-50/70 via-blue-50/40 to-slate-50 dark:from-blue-950/40 dark:via-slate-900 dark:to-slate-900 border border-blue-200 dark:border-blue-800/80 rounded-lg p-4 lg:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-md">
                        {selectedPatient.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 dark:text-white text-base lg:text-lg">
                            {selectedPatient.name}
                          </h3>
                          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 text-[10px] font-bold rounded">
                            {selectedPatient.gender === 'F' ? 'Feminino' : selectedPatient.gender === 'M' ? 'Masculino' : 'Outro'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400 mt-1">
                          <span>
                            CPF: <strong className="text-slate-800 dark:text-slate-200">{formatCPF(selectedPatient.cpf)}</strong>
                          </span>
                          <span>
                            CNS: <strong className="text-slate-800 dark:text-slate-200">{formatCNS(selectedPatient.cns)}</strong>
                          </span>
                          {selectedPatient.birthDate && (
                            <span>
                              Nascimento: {formatDateBR(selectedPatient.birthDate)}
                            </span>
                          )}
                          {selectedPatient.healthCenter?.name && (
                            <span className="text-blue-700 dark:text-blue-300 font-medium">
                              UBS: {selectedPatient.healthCenter.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowPatientDetailsModal(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-300 rounded-md text-xs font-semibold shadow-sm transition cursor-pointer"
                        title="Ver ficha cadastral completa do paciente"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Detalhes do Paciente</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPatient(null);
                          setPatientSearchTerm('');
                          setSearchExecuted(false);
                          setPatientSearchResults([]);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-xs font-semibold shadow-sm transition cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                        <span>Trocar Paciente</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Anamnese e Condições Clínicas (Logo abaixo) */}
          {selectedPatient && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
              <div className="px-4 py-3 bg-teal-50/70 dark:bg-teal-950/30 border-b border-teal-100 dark:border-teal-900/40 rounded-t-lg flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-teal-600 text-white rounded-md">
                    <Heart className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-teal-950 dark:text-teal-100 uppercase tracking-wide">
                      Anamnese & Condições Clínicas do Paciente
                    </h2>
                    <p className="text-[11px] text-teal-800/80 dark:text-teal-300">
                      Confirme ou atualize os dados clínicos que orientam o médico regulador
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-900/40 px-2 py-0.5 rounded">
                  Sincronizado com Prontuário
                </span>
              </div>

              <div className="p-4 lg:p-6 space-y-5">
                {/* Comorbidades Rápidas (Checkboxes Grandes) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Condições Crônicas e Fatores de Risco:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition ${
                      anamnesis.isHypertensive
                        ? 'border-red-400 bg-red-50/60 dark:bg-red-950/30 dark:border-red-800 text-red-900 dark:text-red-200 font-semibold'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300'
                    }`}>
                      <input
                        type="checkbox"
                        checked={anamnesis.isHypertensive}
                        onChange={(e) => setAnamnesis({ ...anamnesis, isHypertensive: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300"
                      />
                      <span className="text-xs lg:text-sm">Hipertenso (HAS)</span>
                    </label>

                    <label className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition ${
                      anamnesis.isDiabetic
                        ? 'border-red-400 bg-red-50/60 dark:bg-red-950/30 dark:border-red-800 text-red-900 dark:text-red-200 font-semibold'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300'
                    }`}>
                      <input
                        type="checkbox"
                        checked={anamnesis.isDiabetic}
                        onChange={(e) => setAnamnesis({ ...anamnesis, isDiabetic: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300"
                      />
                      <span className="text-xs lg:text-sm">Diabético (DM)</span>
                    </label>

                    <label className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition ${
                      anamnesis.isSmoker
                        ? 'border-orange-400 bg-orange-50/60 dark:bg-orange-950/30 dark:border-orange-800 text-orange-900 dark:text-orange-200 font-semibold'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300'
                    }`}>
                      <input
                        type="checkbox"
                        checked={anamnesis.isSmoker}
                        onChange={(e) => setAnamnesis({ ...anamnesis, isSmoker: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300"
                      />
                      <span className="text-xs lg:text-sm">Tabagista / Fumante</span>
                    </label>
                  </div>
                </div>

                {/* Paciente Oncológico & PcD */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`p-3.5 rounded-md border transition ${
                    anamnesis.isOncological
                      ? 'border-purple-300 bg-purple-50/50 dark:bg-purple-950/30 dark:border-purple-800'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/30'
                  }`}>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={anamnesis.isOncological}
                        onChange={(e) => setAnamnesis({ ...anamnesis, isOncological: e.target.checked })}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <span className="text-xs lg:text-sm font-bold text-slate-800 dark:text-slate-200">
                        Paciente Oncológico (Tratamento de Neoplasia)
                      </span>
                    </label>
                    {anamnesis.isOncological && (
                      <div className="mt-2.5">
                        <label className="block text-[11px] font-semibold text-purple-900 dark:text-purple-300 mb-1">
                          Estágio / Classificação da Neoplasia:
                        </label>
                        <select
                          value={anamnesis.oncologicalStage}
                          onChange={(e) => setAnamnesis({ ...anamnesis, oncologicalStage: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded text-xs text-slate-800 dark:text-slate-100"
                        >
                          <option value="">Selecione o estágio...</option>
                          <option value="Estágio I">Estágio I</option>
                          <option value="Estágio II">Estágio II</option>
                          <option value="Estágio III">Estágio III</option>
                          <option value="Estágio IV (Metastático)">Estágio IV (Metastático)</option>
                          <option value="Em Remissão / Controle">Em Remissão / Controle</option>
                          <option value="Cuidados Paliativos">Cuidados Paliativos</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div className={`p-3.5 rounded-md border transition ${
                    anamnesis.isPcd
                      ? 'border-blue-300 bg-blue-50/50 dark:bg-blue-950/30 dark:border-blue-800'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/30'
                  }`}>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={anamnesis.isPcd}
                        onChange={(e) => setAnamnesis({ ...anamnesis, isPcd: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-xs lg:text-sm font-bold text-slate-800 dark:text-slate-200">
                        Pessoa com Deficiência (PcD)
                      </span>
                    </label>
                    {anamnesis.isPcd && (
                      <div className="mt-2.5">
                        <label className="block text-[11px] font-semibold text-blue-900 dark:text-blue-300 mb-1">
                          Tipo de Deficiência / Necessidade Especial:
                        </label>
                        <input
                          type="text"
                          value={anamnesis.pcdDescription}
                          onChange={(e) => setAnamnesis({ ...anamnesis, pcdDescription: e.target.value })}
                          placeholder="Ex: Deficiência física motora, cadeirante, visual..."
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded text-xs text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Sinais Vitais & Medidas Antropométricas */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Sinais Vitais e Medidas Aferidas na UBS:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <span className="text-[11px] text-slate-500 block mb-1">Pressão Arterial (PA)</span>
                      <input
                        type="text"
                        value={anamnesis.bloodPressure}
                        onChange={(e) => setAnamnesis({ ...anamnesis, bloodPressure: e.target.value })}
                        placeholder="Ex: 120/80 mmHg"
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block mb-1">Glicemia Capilar</span>
                      <input
                        type="text"
                        value={anamnesis.glycemia}
                        onChange={(e) => setAnamnesis({ ...anamnesis, glycemia: e.target.value })}
                        placeholder="Ex: 95 mg/dL"
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block mb-1">Peso (kg)</span>
                      <input
                        type="text"
                        value={anamnesis.weight}
                        onChange={(e) => setAnamnesis({ ...anamnesis, weight: e.target.value })}
                        placeholder="Ex: 72.5"
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block mb-1">Altura (m)</span>
                      <input
                        type="text"
                        value={anamnesis.height}
                        onChange={(e) => setAnamnesis({ ...anamnesis, height: e.target.value })}
                        placeholder="Ex: 1.70"
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs"
                      />
                    </div>
                  </div>

                  {/* Badge de IMC Calculado */}
                  {calculateImc(anamnesis.weight, anamnesis.height) && (
                    <div className="mt-2.5 flex items-center gap-2">
                      <span className="text-xs text-slate-500">IMC Calculado:</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold border ${calculateImc(anamnesis.weight, anamnesis.height)!.color}`}>
                        {calculateImc(anamnesis.weight, anamnesis.height)!.imc} kg/m² ({calculateImc(anamnesis.weight, anamnesis.height)!.label})
                      </span>
                    </div>
                  )}
                </div>

                {/* Alergias & Outras Doenças */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Alergias Medicamentosas / Gerais:
                    </label>
                    <input
                      type="text"
                      value={anamnesis.allergies}
                      onChange={(e) => setAnamnesis({ ...anamnesis, allergies: e.target.value })}
                      placeholder="Ex: Dipirona, Penicilina, Iodo, Frutos do mar..."
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Outras Comorbidades Relevantes:
                    </label>
                    <input
                      type="text"
                      value={anamnesis.otherDiseases}
                      onChange={(e) => setAnamnesis({ ...anamnesis, otherDiseases: e.target.value })}
                      placeholder="Ex: Asma, Insuficiência Renal, Hipotireoidismo..."
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs"
                    />
                  </div>
                </div>

                {/* Medicamentos de Uso Contínuo */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Medicamentos de Uso Contínuo:
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newMedicationInput}
                      onChange={(e) => setNewMedicationInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddMedication();
                        }
                      }}
                      placeholder="Adicione um medicamento (ex: Losartana 50mg 1x/dia) e pressione Adicionar..."
                      className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddMedication}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar
                    </button>
                  </div>

                  {anamnesis.continuousMedications.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {anamnesis.continuousMedications.map((med, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-800 dark:text-slate-200"
                        >
                          <span>{med}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveMedication(idx)}
                            className="text-slate-400 hover:text-red-500 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">
                      Nenhum medicamento contínuo informado.
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 2: TIPO DE SOLICITAÇÃO, PROCEDIMENTO & PRIORIDADE CLÍNICA (CARDS 2 E 3) */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="space-y-4 lg:space-y-6 animate-in fade-in duration-200">
          {/* Card 2: Tipo de Encaminhamento & Procedimento (Proposta A - Painel Duplo) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 lg:px-5 py-3.5 bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    2. Tipo de Solicitação e Procedimento Desejado <span className="text-red-500">*</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Defina a modalidade e selecione os itens do encaminhamento
                  </p>
                </div>
              </div>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  requestType === 'CONSULTA'
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
                    : requestType === 'EXAME'
                    ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200'
                    : 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200'
                }`}
              >
                {requestType === 'CONSULTA'
                  ? 'Consulta Médica'
                  : requestType === 'EXAME'
                  ? 'Exame Diagnóstico'
                  : 'Procedimento'}
              </span>
            </div>

            <div className="p-4 lg:p-6 space-y-5">
              {/* Seletor Segmentado de Modalidade */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Modalidade do encaminhamento
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {requestType === 'CONSULTA'
                      ? '1 especialidade por solicitação'
                      : requestType === 'EXAME'
                      ? 'Múltiplos exames do mesmo grupo'
                      : 'Múltiplos procedimentos do mesmo grupo'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 p-1 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 gap-1">
                  {(
                    [
                      {
                        key: 'CONSULTA',
                        label: 'Consulta Médica',
                        icon: Stethoscope,
                        dotClass: 'bg-blue-600',
                      },
                      {
                        key: 'EXAME',
                        label: 'Exame Diagnóstico',
                        icon: Activity,
                        dotClass: 'bg-emerald-600',
                      },
                      {
                        key: 'PROCEDIMENTO',
                        label: 'Procedimento',
                        icon: Building2,
                        dotClass: 'bg-purple-600',
                      },
                    ] as const
                  ).map((item) => {
                    const active = requestType === item.key;
                    const IconComponent = item.icon;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        aria-pressed={active}
                        onClick={() => handleModalityChange(item.key)}
                        className={`px-3 py-2.5 rounded-md text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer ${
                          active
                            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200 dark:border-slate-700'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            active ? item.dotClass : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                        />
                        <IconComponent className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fluxo CONSULTA: Busca e seleção integradas */}
              {requestType === 'CONSULTA' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Especialidade / Consulta Médica <span className="text-red-500">*</span>
                    </label>
                    {consultationProcedures.length > 0 && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {filteredConsultations.length} de {consultationProcedures.length} disponíveis
                      </span>
                    )}
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-50/40 dark:bg-slate-950/60">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                      <Search className="w-4 h-4 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        value={consultaFilterTerm}
                        onChange={(e) => setConsultaFilterTerm(e.target.value)}
                        placeholder="Buscar especialidade ou código SIGTAP (ex: Cardiologia, Pediatria, Ortopedia...)"
                        className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                      />
                      {consultaFilterTerm && (
                        <button
                          type="button"
                          onClick={() => setConsultaFilterTerm('')}
                          aria-label="Limpar busca de consulta"
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-200/70 dark:divide-slate-800/80">
                      {isLoadingConsultations ? (
                        <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
                          <Loader className="w-4 h-4 animate-spin" />
                          <span>Carregando consultas médicas...</span>
                        </div>
                      ) : filteredConsultations.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                          Nenhuma consulta encontrada para "{consultaFilterTerm}".
                        </div>
                      ) : (
                        filteredConsultations.map((proc: any) => {
                          const isSelected = procedureId === proc.id;
                          return (
                            <button
                              key={proc.id}
                              type="button"
                              onClick={() => {
                                setProcedureId(proc.id);
                                setProcedureGroupId(proc.procedureGroupId || '');
                              }}
                              className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-3 transition cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-50/80 dark:bg-blue-950/40'
                                  : 'bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                              }`}
                            >
                              <div className="min-w-0">
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 block leading-snug">
                                  {proc.name}
                                </span>
                                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 block mt-0.5">
                                  SIGTAP {proc.code || 'N/A'}
                                </span>
                              </div>
                              <span
                                className={`text-xs font-semibold shrink-0 px-2.5 py-1 rounded-full ${
                                  isSelected
                                    ? 'bg-blue-600 text-white'
                                    : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900'
                                }`}
                              >
                                {isSelected ? 'Selecionada' : 'Escolher'}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {selectedProcedureObj && (
                    <div className="px-3.5 py-2.5 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <Stethoscope className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="text-slate-600 dark:text-slate-300">Selecionada:</span>
                        <strong className="text-slate-900 dark:text-slate-100">{selectedProcedureObj.name}</strong>
                      </div>
                      <span className="font-mono text-slate-600 dark:text-slate-300">
                        SIGTAP {selectedProcedureObj.code || 'N/A'}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                /* Fluxo EXAME / PROCEDIMENTO: Grupo com filtro + Painel Duplo (Catálogo x Selecionados) */
                <div className="space-y-4">
                  {/* Seleção de Grupo */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {requestType === 'EXAME'
                          ? 'Grupo de Exame Diagnóstico (SUS)'
                          : 'Grupo de Procedimento (SUS)'}{' '}
                        <span className="text-red-500">*</span>
                      </label>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {visibleProcedureGroups.length} grupos
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                      <div className="md:col-span-5 relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={groupFilterTerm}
                          onChange={(e) => setGroupFilterTerm(e.target.value)}
                          placeholder={`Filtrar grupo (${requestType === 'EXAME' ? 'ex: Tomografia, Ultrassom' : 'ex: Cirurgia, Biópsia'})...`}
                          className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500"
                        />
                      </div>
                      <div className="md:col-span-7">
                        <select
                          aria-label={
                            requestType === 'EXAME'
                              ? 'Grupo de Exame Diagnóstico (SUS)'
                              : 'Grupo de Procedimento (SUS)'
                          }
                          value={procedureGroupId}
                          onChange={(e) => handleGroupChange(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs lg:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500 cursor-pointer"
                        >
                          <option value="">
                            {requestType === 'EXAME'
                              ? 'Selecione o grupo de exames (ex: Ultrassonografia, Tomografia, Laboratório...)'
                              : 'Selecione o grupo de procedimentos (ex: Cirurgia Oftalmológica, Odontologia, Biópsias...)'}
                          </option>
                          {visibleProcedureGroups.map((grp: any) => (
                            <option key={grp.id} value={grp.id}>
                              {grp.displayName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {groupChangeNotice && (
                      <div className="px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2">
                        <span>{groupChangeNotice}</span>
                        <button
                          type="button"
                          onClick={() => setGroupChangeNotice('')}
                          aria-label="Dispensar aviso"
                          className="text-amber-700 dark:text-amber-300 hover:opacity-75 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Painel Duplo: Catálogo do Grupo (esquerda) x Itens na Solicitação (direita) */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
                    {/* Esquerda: Catálogo do Grupo */}
                    <div className="border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-950/50 flex flex-col overflow-hidden">
                      <div className="px-3.5 py-2.5 bg-slate-100/80 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          Catálogo do Grupo
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {procedureGroupId
                            ? `${filteredProceduresInGroup.length} de ${proceduresInGroup.length} disponíveis`
                            : '0 disponíveis'}
                        </span>
                      </div>

                      <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={procedureFilterTerm}
                            onChange={(e) => setProcedureFilterTerm(e.target.value)}
                            disabled={!procedureGroupId || isLoadingProcedures}
                            placeholder={`Filtrar ${requestType === 'EXAME' ? 'exame' : 'procedimento'} por nome ou código SIGTAP...`}
                            className="w-full pl-8 pr-8 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500 disabled:opacity-50"
                          />
                          {procedureFilterTerm && (
                            <button
                              type="button"
                              onClick={() => setProcedureFilterTerm('')}
                              aria-label="Limpar filtro de itens"
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="divide-y divide-slate-200/70 dark:divide-slate-800 max-h-72 overflow-y-auto flex-1">
                        {!procedureGroupId ? (
                          <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                            Selecione um grupo acima para listar os{' '}
                            {requestType === 'EXAME' ? 'exames' : 'procedimentos'} disponíveis.
                          </div>
                        ) : isLoadingProcedures ? (
                          <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
                            <Loader className="w-4 h-4 animate-spin" />
                            <span>Carregando {requestType === 'EXAME' ? 'exames' : 'procedimentos'}...</span>
                          </div>
                        ) : filteredProceduresInGroup.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                            {procedureFilterTerm
                              ? `Nenhum item encontrado para "${procedureFilterTerm}".`
                              : `Nenhum ${requestType === 'EXAME' ? 'exame' : 'procedimento'} disponível neste grupo.`}
                          </div>
                        ) : (
                          filteredProceduresInGroup.map((proc: any) => {
                            const isAdded = selectedProcedures.some((sp: any) => sp.id === proc.id);
                            return (
                              <button
                                key={proc.id}
                                type="button"
                                onClick={() => handleToggleProcedure(proc)}
                                className={`w-full px-3.5 py-2.5 text-left flex items-start justify-between gap-3 transition cursor-pointer ${
                                  isAdded
                                    ? requestType === 'EXAME'
                                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30'
                                      : 'bg-purple-50/70 dark:bg-purple-950/30'
                                    : 'bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                                }`}
                              >
                                <div className="min-w-0">
                                  <span className="text-xs font-medium text-slate-800 dark:text-slate-100 block leading-snug">
                                    {proc.name}
                                  </span>
                                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400 block mt-0.5">
                                    SIGTAP {proc.code || 'N/A'}
                                  </span>
                                </div>
                                <span
                                  className={`text-xs font-semibold shrink-0 px-2.5 py-1 rounded-md inline-flex items-center gap-1 ${
                                    isAdded
                                      ? requestType === 'EXAME'
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-purple-600 text-white'
                                      : 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200'
                                  }`}
                                >
                                  {isAdded ? (
                                    <>
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Adicionado</span>
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Adicionar</span>
                                    </>
                                  )}
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Direita: Itens Selecionados na Solicitação */}
                    <div className="border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-950/50 flex flex-col overflow-hidden">
                      <div className="px-3.5 py-2.5 bg-slate-100/80 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Activity
                            className={`w-4 h-4 shrink-0 ${
                              requestType === 'EXAME' ? 'text-emerald-600' : 'text-purple-600'
                            }`}
                          />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                            {requestType === 'EXAME' ? 'Exames Selecionados' : 'Procedimentos Selecionados'} (
                            {selectedProcedures.length})
                          </span>
                        </div>
                        {selectedProcedures.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setSelectedProcedures([])}
                            className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline cursor-pointer shrink-0"
                          >
                            Limpar lista
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                            Obrigatório ≥ 1
                          </span>
                        )}
                      </div>

                      {selectedGroupName && (
                        <div className="px-3.5 py-2 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-300">
                          Grupo: <strong className="text-slate-800 dark:text-slate-100">{selectedGroupName}</strong>
                        </div>
                      )}

                      <div className="p-2.5 space-y-2 max-h-72 overflow-y-auto flex-1">
                        {selectedProcedures.length === 0 ? (
                          <div className="min-h-[180px] h-full flex flex-col items-center justify-center text-center px-4">
                            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                              Nenhum {requestType === 'EXAME' ? 'exame' : 'procedimento'} selecionado ainda.
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Clique nos itens do catálogo ao lado para incluí-los nesta única solicitação.
                            </p>
                          </div>
                        ) : (
                          selectedProcedures.map((proc: any, idx: number) => (
                            <div
                              key={proc.id}
                              className={`flex items-start justify-between gap-2.5 p-2.5 bg-white dark:bg-slate-900 rounded-lg border shadow-sm ${
                                requestType === 'EXAME'
                                  ? 'border-emerald-200/90 dark:border-emerald-900/50'
                                  : 'border-purple-200/90 dark:border-purple-900/50'
                              }`}
                            >
                              <div className="flex items-start gap-2.5 min-w-0">
                                <span
                                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                                    requestType === 'EXAME'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                                      : 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300'
                                  }`}
                                >
                                  {idx + 1}
                                </span>
                                <div className="min-w-0">
                                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 block leading-snug">
                                    {proc.name}
                                  </span>
                                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400 block mt-0.5">
                                    SIGTAP {proc.code || 'N/A'}
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveProcedure(proc.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md transition cursor-pointer shrink-0"
                                title="Remover este item da solicitação"
                                aria-label={`Remover ${proc.name}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Prioridade e Classificação de Risco (Semáforo Clínico SUS) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
            <div className="px-4 py-3 bg-amber-50/70 dark:bg-amber-950/30 border-b border-amber-100 dark:border-amber-900/40 rounded-t-lg flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-amber-600 text-white rounded-md">
                  <Clock className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-amber-950 dark:text-amber-100 uppercase tracking-wide">
                  3. Prioridade e Classificação de Risco <span className="text-red-500">*</span>
                </h2>
              </div>
            </div>

            <div className="p-4 lg:p-6">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2.5">
                Classificação Clínica de Gravidade (Protocolo de Manchester / SUS):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Eletivo */}
                <button
                  type="button"
                  onClick={() => setPriority('ELETIVO')}
                  className={`p-3.5 rounded-md border text-left transition cursor-pointer flex flex-col justify-between ${
                    priority === 'ELETIVO'
                      ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 ring-1 ring-emerald-500'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs lg:text-sm text-emerald-800 dark:text-emerald-300">
                      🟢 Eletivo (Rotina)
                    </span>
                    {priority === 'ELETIVO' && <Check className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                    Condição estável, sem risco de agravamento agudo a curto prazo.
                  </p>
                </button>

                {/* Prioritário */}
                <button
                  type="button"
                  onClick={() => setPriority('PRIORITARIO')}
                  className={`p-3.5 rounded-md border text-left transition cursor-pointer flex flex-col justify-between ${
                    priority === 'PRIORITARIO'
                      ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 ring-1 ring-amber-500'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs lg:text-sm text-amber-800 dark:text-amber-300">
                      🟡 Prioritário
                    </span>
                    {priority === 'PRIORITARIO' && <Check className="w-4 h-4 text-amber-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                    Gravidade intermediária ou suspeita com necessidade de brevidade.
                  </p>
                </button>

                {/* Urgência */}
                <button
                  type="button"
                  onClick={() => setPriority('URGENCIA')}
                  className={`p-3.5 rounded-md border text-left transition cursor-pointer flex flex-col justify-between ${
                    priority === 'URGENCIA'
                      ? 'border-red-500 bg-red-50/80 dark:bg-red-950/40 ring-1 ring-red-500'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs lg:text-sm text-red-800 dark:text-red-300">
                      🔴 Urgência Ambulatorial
                    </span>
                    {priority === 'URGENCIA' && <Check className="w-4 h-4 text-red-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                    Alto risco de deterioração rápida ou sequelas funcionais imediatas.
                  </p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 3: DIAGNÓSTICO CID-10, JUSTIFICATIVA & ANEXOS (CARDS 4 E 5) */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div className="space-y-4 lg:space-y-6 animate-in fade-in duration-200">
          {/* Card 4: Hipótese Diagnóstica (CID-10) e Justificativa Clínica */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
            <div className="px-4 py-3 bg-purple-50/70 dark:bg-purple-950/30 border-b border-purple-100 dark:border-purple-900/40 rounded-t-lg flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-purple-600 text-white rounded-md">
                  <FileText className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-purple-950 dark:text-purple-100 uppercase tracking-wide">
                  4. Hipótese Diagnóstica (CID-10) e Justificativa Clínica <span className="text-red-500">*</span>
                </h2>
              </div>
            </div>

            <div className="p-4 lg:p-6 space-y-4">
              {/* CID-10 Autocomplete */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Diagnóstico Principal (CID-10) <span className="text-red-500">*</span>
                </label>

                {selectedCid ? (
                  <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-md">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded bg-purple-600 text-white font-mono font-bold text-xs">
                        {selectedCid.code}
                      </span>
                      <span className="text-xs lg:text-sm font-medium text-slate-800 dark:text-slate-200">
                        {selectedCid.description}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCid(null);
                        setCidSearchTerm('');
                      }}
                      className="text-xs text-purple-700 dark:text-purple-300 hover:underline font-semibold cursor-pointer"
                    >
                      Alterar CID
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={cidSearchTerm}
                      onChange={(e) => setCidSearchTerm(e.target.value)}
                      placeholder="Buscar CID-10 por código (ex: I10, E11, M54) ou descrição (ex: Hipertensão)..."
                      className="w-full pl-9 pr-10 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-xs lg:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                    />
                    {isSearchingCid ? (
                      <Loader className="absolute right-3 top-2.5 w-4 h-4 text-purple-500 animate-spin" />
                    ) : cidSearchTerm ? (
                      <button
                        type="button"
                        onClick={() => {
                          setCidSearchTerm('');
                          setCidResults([]);
                        }}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        title="Limpar busca"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : null}

                    {cidResults.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md shadow-2xl divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in-95 duration-150">
                        <div className="p-2 bg-slate-50 dark:bg-slate-800/60 text-3xs font-semibold text-slate-500 uppercase tracking-wider flex justify-between items-center">
                          <span>{cidResults.length} resultado(s) encontrado(s)</span>
                          <span className="text-purple-600 dark:text-purple-400 font-normal">Clique para selecionar</span>
                        </div>
                        {cidResults.map((c) => (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => {
                              setSelectedCid(c);
                              setCidResults([]);
                              setCidSearchTerm('');
                            }}
                            className="w-full text-left p-2.5 hover:bg-purple-50/60 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 font-mono text-xs font-bold shrink-0">
                                {c.code}
                              </span>
                              <span className="text-xs text-slate-700 dark:text-slate-300 truncate">
                                {c.description}
                              </span>
                            </div>
                            <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold shrink-0">
                              Escolher
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {!isSearchingCid && cidSearchTerm.trim().length >= 2 && cidResults.length === 0 && (
                      <div className="absolute z-50 left-0 right-0 mt-1 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-lg text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>Nenhum CID-10 encontrado para &quot;{cidSearchTerm}&quot;. Tente outro código ou termo.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Justificativa Clínica */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Justificativa Clínica Detalhada <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {clinicalJustification.length} caracteres (mínimo 5)
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={clinicalJustification}
                  onChange={(e) => setClinicalJustification(e.target.value)}
                  placeholder="Descreva a queixa principal, tempo de evolução, sintomas, achados no exame físico e motivo claro da necessidade do encaminhamento..."
                  className="w-full p-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-xs lg:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              {/* Histórico Clínico Prévio */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Histórico Clínico e Tratamentos Prévios na UBS (Opcional):
                </label>
                <textarea
                  rows={2}
                  value={clinicalHistory}
                  onChange={(e) => setClinicalHistory(e.target.value)}
                  placeholder="Informe comorbidades crônicas, cirurgias prévias ou tratamentos já tentados na unidade..."
                  className="w-full p-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-xs lg:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Card 5: Anexos e Documentos Comprobatórios */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
            <div className="px-4 py-3 bg-indigo-50/70 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/40 rounded-t-lg flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-indigo-600 text-white rounded-md">
                  <Paperclip className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-indigo-950 dark:text-indigo-100 uppercase tracking-wide">
                  5. Anexos e Documentos Comprobatórios (Opcional)
                </h2>
              </div>
              <span className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                PDF, JPG, PNG até 10MB
              </span>
            </div>

            <div className="p-4 lg:p-6 space-y-3">
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-indigo-200 dark:border-indigo-800/80 hover:border-indigo-400 dark:hover:border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/10 rounded-md transition cursor-pointer text-center group">
                <Upload className="w-8 h-8 text-indigo-500 group-hover:scale-110 transition-transform mb-2" />
                <span className="text-xs lg:text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Clique para selecionar arquivos ou arraste aqui
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  Laudos anteriores, pedidos médicos digitalizados, receitas ou resultados de exames complementares
                </span>
                <input
                  type="file"
                  multiple
                  accept="application/pdf,image/png,image/jpeg,image/jpg"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {/* Lista de Arquivos Anexados */}
              {files.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    Arquivos selecionados ({files.length}):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {files.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-md"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Paperclip className="w-4 h-4 text-indigo-500 shrink-0" />
                          <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                            {file.name}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            ({(file.size / 1024).toFixed(0)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="p-1 text-slate-400 hover:text-red-500 transition cursor-pointer"
                          title="Remover arquivo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 4: REVISÃO & PROTOCOLO */}
      {/* ========================================================================= */}
      {currentStep === 4 && (
        <div className="space-y-4 lg:space-y-6 animate-in fade-in duration-200">
          {/* Header de Revisão */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg p-4 lg:p-5 shadow-md flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-md backdrop-blur-sm">
                <Check className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base lg:text-lg font-bold">Revisão Final da Solicitação</h2>
                <p className="text-xs text-blue-100">
                  Confira atentamente os dados antes de encaminhar para a Regulação Municipal.
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-block px-3 py-1 bg-white/20 text-white text-xs font-bold rounded-full">
              Etapa 4 de 4
            </span>
          </div>

          {/* Bloco 1: Paciente e Anamnese */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 lg:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-xs lg:text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                  1. Paciente & Condições Clínicas
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Editar Etapa 1
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block">Nome do Paciente:</span>
                <strong className="text-slate-800 dark:text-slate-200 text-sm">{selectedPatient?.name}</strong>
                <div className="flex flex-wrap gap-x-3 text-slate-500 mt-0.5">
                  <span>CPF: <strong>{formatCPF(selectedPatient?.cpf)}</strong></span>
                  <span>CNS: <strong>{formatCNS(selectedPatient?.cns)}</strong></span>
                  {selectedPatient?.birthDate && <span>Nasc: {formatDateBR(selectedPatient.birthDate)}</span>}
                </div>
              </div>

              <div>
                <span className="text-slate-400 block">Condições Clínicas / Anamnese:</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {anamnesis.isHypertensive && <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 rounded font-semibold text-[10px]">Hipertenso</span>}
                  {anamnesis.isDiabetic && <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 rounded font-semibold text-[10px]">Diabético</span>}
                  {anamnesis.isSmoker && <span className="px-2 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 rounded font-semibold text-[10px]">Fumante</span>}
                  {anamnesis.isOncological && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 rounded font-semibold text-[10px]">Oncológico ({anamnesis.oncologicalStage || 'Sim'})</span>}
                  {anamnesis.isPcd && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 rounded font-semibold text-[10px]">PcD ({anamnesis.pcdDescription || 'Sim'})</span>}
                  {!anamnesis.isHypertensive && !anamnesis.isDiabetic && !anamnesis.isSmoker && !anamnesis.isOncological && !anamnesis.isPcd && (
                    <span className="text-slate-400 italic">Sem comorbidades crônicas declaradas</span>
                  )}
                </div>
                {(anamnesis.bloodPressure || anamnesis.weight) && (
                  <div className="text-[11px] text-slate-500 mt-1">
                    {anamnesis.bloodPressure && <span>PA: {anamnesis.bloodPressure} • </span>}
                    {anamnesis.weight && <span>Peso: {anamnesis.weight}kg • </span>}
                    {anamnesis.height && <span>Alt: {anamnesis.height}m</span>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bloco 2: Tipo de Solicitação, Procedimento & Prioridade */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 lg:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-xs lg:text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                  2. Tipo de Solicitação & Prioridade
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Editar Etapa 2
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block">Modalidade:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  {requestType === 'CONSULTA' ? '🩺 Consulta Médica' : requestType === 'EXAME' ? '🧪 Exame Diagnóstico' : '⚡ Procedimento'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block">
                  {requestType === 'CONSULTA'
                    ? 'Consulta Médica:'
                    : `${requestType === 'EXAME' ? 'Exames Solicitados' : 'Procedimentos Solicitados'} (${effectiveSelectedProcedures.length}):`}
                </span>
                {requestType === 'CONSULTA' ? (
                  <strong className="text-slate-800 dark:text-slate-200 block">
                    {selectedProcedureObj
                      ? `${selectedProcedureObj.code ? `[${selectedProcedureObj.code}] ` : ''}${selectedProcedureObj.name}`
                      : 'Não selecionado'}
                  </strong>
                ) : (
                  <div>
                    {selectedGroupName && (
                      <span className="text-slate-600 dark:text-slate-300 font-semibold block text-[11px] mb-1">
                        Grupo: {selectedGroupName}
                      </span>
                    )}
                    {effectiveSelectedProcedures.length === 0 ? (
                      <span className="text-slate-400 italic">Nenhum selecionado</span>
                    ) : (
                      <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                        {effectiveSelectedProcedures.map((p: any, idx: number) => (
                          <div
                            key={p.id}
                            className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 text-[11px] bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded border border-slate-200 dark:border-slate-700/60"
                          >
                            <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center text-[9px] font-bold shrink-0">
                              {idx + 1}
                            </span>
                            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                              {p.code ? `[${p.code}]` : ''}
                            </span>
                            <span className="truncate">{p.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <span className="text-slate-400 block">Classificação de Risco:</span>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold mt-0.5 ${
                    priority === 'URGENCIA'
                      ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'
                      : priority === 'PRIORITARIO'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                  }`}
                >
                  {priority === 'URGENCIA' ? '🔴 Urgência Ambulatorial' : priority === 'PRIORITARIO' ? '🟡 Prioritário' : '🟢 Eletivo'}
                </span>
              </div>
            </div>
          </div>

          {/* Bloco 3: Diagnóstico, Justificativa & Anexos */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 lg:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                <h3 className="font-bold text-xs lg:text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                  3. Diagnóstico (CID-10), Justificativa & Anexos
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Editar Etapa 3
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block">Diagnóstico Principal (CID-10):</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="px-2 py-0.5 rounded bg-purple-600 text-white font-mono font-bold text-xs">
                    {selectedCid?.code}
                  </span>
                  <strong className="text-slate-800 dark:text-slate-200">{selectedCid?.description}</strong>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block">Justificativa Clínica:</span>
                <p className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-md text-slate-800 dark:text-slate-200 mt-1 whitespace-pre-wrap leading-relaxed">
                  {clinicalJustification}
                </p>
              </div>

              {clinicalHistory && (
                <div>
                  <span className="text-slate-400 block">Histórico Clínico na UBS:</span>
                  <p className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-md text-slate-800 dark:text-slate-200 mt-1 whitespace-pre-wrap">
                    {clinicalHistory}
                  </p>
                </div>
              )}

              <div>
                <span className="text-slate-400 block">Documentos e Laudos Anexados:</span>
                {files.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {files.map((f, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded text-xs text-indigo-700 dark:text-indigo-300"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>{f.name}</span>
                        <span className="text-[10px] text-slate-400">({(f.size / 1024).toFixed(0)} KB)</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400 italic">Nenhum anexo adicionado (opcional).</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BARRA INFERIOR DE NAVEGAÇÃO E AÇÃO */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
        {currentStep === 1 ? (
          <button
            type="button"
            onClick={() => navigate('/regulation/solicitor')}
            className="px-4 py-2 text-xs lg:text-sm font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-md transition cursor-pointer"
          >
            ← Cancelar
          </button>
        ) : (
          <button
            type="button"
            onClick={handlePrevStep}
            className="px-4 py-2 text-xs lg:text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md transition flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar Etapa</span>
          </button>
        )}

        {currentStep < 4 ? (
          <button
            type="button"
            onClick={handleNextStep}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs lg:text-sm rounded-md shadow-md transition flex items-center gap-2 cursor-pointer active:scale-98"
          >
            <span>
              {currentStep === 1
                ? 'Avançar para Tipo & Prioridade'
                : currentStep === 2
                ? 'Avançar para Diagnóstico & Anexos'
                : 'Avançar para Revisão Final'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={createRequestMutation.isPending}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs lg:text-sm rounded-md shadow-lg transition flex items-center gap-2 cursor-pointer active:scale-98"
          >
            {createRequestMutation.isPending ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Protocolando Solicitação...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Protocolar Solicitação na Regulação</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL DE CONFERÊNCIA DE DADOS DO PACIENTE */}
      {/* ========================================================================= */}
      {showPatientDetailsModal && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden my-8 max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600 text-white rounded-md">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Ficha Cadastral do Paciente
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Conferência e verificação dos dados de identificação e contato
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPatientDetailsModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-md border border-slate-200 dark:border-slate-700/60">
                  <span className="text-slate-400 block">Nome Completo:</span>
                  <strong className="text-slate-800 dark:text-slate-100 text-sm">{selectedPatient.name}</strong>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-md border border-slate-200 dark:border-slate-700/60">
                  <span className="text-slate-400 block">CPF:</span>
                  <strong className="text-slate-800 dark:text-slate-100 text-sm">{formatCPF(selectedPatient.cpf)}</strong>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-md border border-slate-200 dark:border-slate-700/60">
                  <span className="text-slate-400 block">Cartão Nacional de Saúde (CNS):</span>
                  <strong className="text-slate-800 dark:text-slate-100 text-sm">{formatCNS(selectedPatient.cns)}</strong>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-md border border-slate-200 dark:border-slate-700/60">
                  <span className="text-slate-400 block">Data de Nascimento:</span>
                  <strong className="text-slate-800 dark:text-slate-100 text-sm">
                    {formatDateBR(selectedPatient.birthDate)}
                  </strong>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-md border border-slate-200 dark:border-slate-700/60">
                  <span className="text-slate-400 block">Sexo / Gênero:</span>
                  <strong className="text-slate-800 dark:text-slate-100 text-sm">
                    {selectedPatient.gender === 'F' ? 'Feminino' : selectedPatient.gender === 'M' ? 'Masculino' : 'Outro'}
                  </strong>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-md border border-slate-200 dark:border-slate-700/60">
                  <span className="text-slate-400 block">Unidade Básica de Vínculo:</span>
                  <strong className="text-slate-800 dark:text-slate-100 text-sm">
                    {selectedPatient.healthCenter?.name || 'Não vinculada'}
                  </strong>
                </div>
              </div>

              {/* Endereço */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-md border border-slate-200 dark:border-slate-700/60 text-xs">
                <span className="text-slate-400 block mb-1">Endereço Residencial:</span>
                <p className="text-slate-800 dark:text-slate-200 font-medium">
                  {selectedPatient.address || 'Endereço não cadastrado no prontuário.'}
                </p>
              </div>

              {/* Telefones de Contato */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-md border border-slate-200 dark:border-slate-700/60 text-xs">
                <span className="text-slate-400 block mb-2">Telefones de Contato:</span>
                {selectedPatient.phones && selectedPatient.phones.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedPatient.phones.map((ph: any, i: number) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md font-medium text-slate-800 dark:text-slate-200"
                      >
                        <Phone className="w-3.5 h-3.5 text-blue-500" />
                        <span>{ph.phoneNumber}</span>
                        {ph.isWhatsapp && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded">
                            WhatsApp
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400 italic">Nenhum telefone registrado.</span>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPatientDetailsModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-sm transition cursor-pointer"
              >
                Conferência Concluída
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Agendamento em Vaga de Escala Aberta (Apenas se houver vagas disponíveis) */}
      {showBookingModal && createdRequestForBooking && (
        <BookSlotModal
          isOpen={showBookingModal}
          onClose={() => {
            setShowBookingModal(false);
            setCompletedRequest(createdRequestForBooking);
            setShowSuccessModal(true);
          }}
          request={createdRequestForBooking}
          onSuccess={() => {
            setShowBookingModal(false);
            setCompletedRequest(createdRequestForBooking);
            setShowSuccessModal(true);
          }}
        />
      )}

      {/* Modal de Conclusão / Protocolo Realizado (exibido quando não há vagas ou após agendamento) */}
      {showSuccessModal && completedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Solicitação Protocolada com Sucesso!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                A solicitação foi registrada no sistema de regulação municipal.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800 text-left text-xs space-y-1.5">
              <div className="flex justify-between items-center pb-1.5 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 font-semibold">Protocolo:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                  #{completedRequest.protocolNumber}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Paciente:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[240px]">
                  {completedRequest.patient?.name}
                </span>
              </div>
              {completedRequest.groupProcedures && completedRequest.groupProcedures.length > 0 ? (
                <div className="space-y-1">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-500 font-semibold">Grupo / Procedimentos:</span>
                    {completedRequest.procedureGroup && (
                      <span className="font-semibold text-blue-600 dark:text-blue-400 truncate max-w-[240px]">
                        {completedRequest.procedureGroup.name}
                      </span>
                    )}
                  </div>
                  <div className="pl-2.5 border-l-2 border-blue-500 space-y-0.5 max-h-28 overflow-y-auto">
                    {completedRequest.groupProcedures.map((gp, idx) => (
                      <div key={idx} className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                        {idx + 1}. {gp.name}{' '}
                        {gp.sigtapCode || gp.code ? `(${gp.sigtapCode || gp.code})` : ''}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Procedimento:</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400 truncate max-w-[240px]">
                    {completedRequest.procedure
                      ? `${completedRequest.procedure.code} - ${completedRequest.procedure.name}`
                      : completedRequest.specialty?.name}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1 border-t border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 font-semibold">Situação:</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  {completedRequest.status === 'AGENDADA'
                    ? 'AGENDADA NA ESCALA'
                    : 'AGUARDANDO ABERTURA DE VAGAS / REGULAÇÃO'}
                </span>
              </div>
            </div>

            {completedRequest.status !== 'AGENDADA' && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-lg text-left text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Não há vagas ou agendas abertas disponíveis para este procedimento no momento.
                  A solicitação permanecerá na fila de regulação para agendamento oportuno.
                </span>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2 justify-center">
              <button
                type="button"
                onClick={() => setShowPrintModal(true)}
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-98"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Ficha de Solicitação</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate('/regulation/solicitor');
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Impressão da Ficha de Solicitação */}
      {showPrintModal && (completedRequest || createdRequestForBooking) && (
        <RegulationRequestPrintModal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          request={completedRequest || createdRequestForBooking}
        />
      )}
    </div>
  );
};
