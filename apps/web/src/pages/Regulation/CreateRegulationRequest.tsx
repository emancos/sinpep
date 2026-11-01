import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Upload,
  Paperclip,
  Trash2,
  Stethoscope,
  Activity,
  Layers,
  User,
  FileText,
  Send,
  Phone,
  Check,
  Clock,
  Loader,
  X,
} from 'lucide-react';
import { usePatients } from '../../hooks/usePatients';
import { useSpecialties } from '../../hooks/useSpecialties';
import { useProcedureGroups } from '../../hooks/useProcedures';
import { useCreateRegulationRequest } from '../../hooks/useRegulation';
import { useAuthStore } from '../../store/useAuthStore';
import { apiUrl } from '../../services/api';
import axios from 'axios';
import { toast } from 'sonner';

export const CreateRegulationRequest: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const token = useAuthStore((state) => state.token);

  // Form states
  const defaultPatientFromState = location.state?.defaultPatient;
  const [selectedPatient, setSelectedPatient] = useState<any>(defaultPatientFromState || null);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const patientSearchContainerRef = useRef<HTMLDivElement>(null);

  // Debounce da busca de pacientes
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(patientSearch.trim());
    }, 250);
    return () => clearTimeout(handler);
  }, [patientSearch]);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        patientSearchContainerRef.current &&
        !patientSearchContainerRef.current.contains(event.target as Node)
      ) {
        setPatientDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [requestType, setRequestType] = useState<'CONSULTA' | 'EXAME' | 'PROCEDIMENTO'>('CONSULTA');
  const [specialtyId, setSpecialtyId] = useState('');
  const [procedureGroupId, setProcedureGroupId] = useState('');
  const [procedureId, setProcedureId] = useState('');
  const [priority, setPriority] = useState<'ELETIVO' | 'PRIORITARIO' | 'URGENCIA'>('ELETIVO');

  // CID-10 state & autocomplete
  const [cidSearchTerm, setCidSearchTerm] = useState('');
  const [cidResults, setCidResults] = useState<Array<{ code: string; description: string }>>([]);
  const [selectedCid, setSelectedCid] = useState<{ code: string; description: string } | null>(null);
  const [isSearchingCid, setIsSearchingCid] = useState(false);

  // Clinical justification & history
  const [clinicalJustification, setClinicalJustification] = useState('');
  const [clinicalHistory, setClinicalHistory] = useState('');

  // Attachments
  const [files, setFiles] = useState<File[]>([]);

  // Mutation
  const createRequestMutation = useCreateRegulationRequest();

  // Queries
  const { data: patientsData, isLoading: isSearchingPatients } = usePatients({
    page: 1,
    limit: 25,
    search: debouncedSearch,
  });

  const patientList: any[] = (patientsData as any)?.data ?? [];
  const totalPatients: number = (patientsData as any)?.total ?? patientList.length;

  const { data: specialtiesData } = useSpecialties({ page: 1, limit: 100 });
  const { data: procedureGroups } = useProcedureGroups();

  // Filtered procedures by selected group
  const [proceduresInGroup, setProceduresInGroup] = useState<any[]>([]);
  const [isLoadingProcedures, setIsLoadingProcedures] = useState(false);

  // Load procedures when procedure group changes
  useEffect(() => {
    if (!procedureGroupId) {
      setProceduresInGroup([]);
      setProcedureId('');
      return;
    }

    setIsLoadingProcedures(true);
    axios
      .get(`${apiUrl}/procedures`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { procedureGroupId, limit: 100, includeInactive: 'false' },
      })
      .then((res) => {
        setProceduresInGroup(res.data.data || []);
      })
      .catch((err) => {
        console.error('Erro ao buscar procedimentos do grupo:', err);
        setProceduresInGroup([]);
      })
      .finally(() => {
        setIsLoadingProcedures(false);
      });
  }, [procedureGroupId, token]);

  // CID Search debounce
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
    }, 350);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPatient) {
      toast.error('Selecione o paciente solicitante.');
      return;
    }
    if (requestType === 'CONSULTA' && !specialtyId) {
      toast.error('Selecione a especialidade médica desejada.');
      return;
    }
    if (requestType !== 'CONSULTA' && !procedureId) {
      toast.error('Selecione o procedimento ou exame específico.');
      return;
    }
    if (!selectedCid) {
      toast.error('Selecione o diagnóstico provável (CID-10).');
      return;
    }
    if (!clinicalJustification || clinicalJustification.trim().length < 10) {
      toast.error('Informe uma justificativa clínica detalhada (mínimo 10 caracteres).');
      return;
    }

    const formData = new FormData();
    formData.append('patientId', selectedPatient.id);
    formData.append('type', requestType);
    formData.append('priority', priority);
    formData.append('cid10', `${selectedCid.code} - ${selectedCid.description}`);
    formData.append('clinicalJustification', clinicalJustification.trim());
    if (clinicalHistory) formData.append('clinicalHistory', clinicalHistory.trim());

    if (requestType === 'CONSULTA') {
      formData.append('specialtyId', specialtyId);
    } else {
      if (procedureGroupId) formData.append('procedureGroupId', procedureGroupId);
      formData.append('procedureId', procedureId);
    }

    files.forEach((file) => {
      formData.append('attachments', file);
    });

    try {
      await createRequestMutation.mutateAsync(formData);
      toast.success('Solicitação protocolada com sucesso na Central de Regulação!');
      navigate('/regulation/solicitor');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Falha ao protocolar solicitação';
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-4 lg:space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header com Navegação */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 lg:p-5 shadow-sm">
        <div className="flex items-start sm:items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/regulation/solicitor')}
            className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md transition cursor-pointer"
            title="Voltar para a lista de solicitações"
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
              Encaminhamento de munícipe para consultas, exames ou procedimentos especializados regulados.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => navigate('/regulation/solicitor')}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={createRequestMutation.isPending}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{createRequestMutation.isPending ? 'Protocolando...' : 'Protocolar Solicitação'}</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-6">
        {/* SEÇÃO 1: Identificação do Paciente (Azul / Turquesa) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm relative z-30">
          <div className="px-4 py-3 bg-blue-50/70 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/40 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-blue-600 text-white rounded-md">
                <User className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-blue-950 dark:text-blue-100 uppercase tracking-wide">
                1. Identificação do Paciente <span className="text-red-500">*</span>
              </h2>
            </div>
            {selectedPatient && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-semibold">
                Paciente Vinculado
              </span>
            )}
          </div>

          <div className="p-4 lg:p-5">
            {selectedPatient ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/80 rounded-md gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                    {selectedPatient.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm lg:text-base">
                      {selectedPatient.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <span>CPF: <strong className="text-slate-700 dark:text-slate-300">{selectedPatient.cpf || 'Não informado'}</strong></span>
                      <span>CNS: <strong className="text-slate-700 dark:text-slate-300">{selectedPatient.cns || 'Não informado'}</strong></span>
                      {selectedPatient.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {selectedPatient.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedPatient(null);
                    setPatientSearch('');
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-md transition self-start sm:self-auto cursor-pointer"
                >
                  Trocar Paciente
                </button>
              </div>
            ) : (
              <div className="relative" ref={patientSearchContainerRef}>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Buscar paciente cadastrado por Nome, CPF ou Cartão SUS:
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      setPatientDropdownOpen(true);
                    }}
                    onFocus={() => setPatientDropdownOpen(true)}
                    placeholder="Clique para ver os pacientes ou digite Nome, CPF ou CNS..."
                    className="w-full pl-9 pr-10 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-xs lg:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                  />
                  {isSearchingPatients && (
                    <div className="absolute right-3 top-2.5">
                      <Loader className="w-4 h-4 text-blue-500 animate-spin" />
                    </div>
                  )}
                  {patientSearch && !isSearchingPatients && (
                    <button
                      type="button"
                      onClick={() => {
                        setPatientSearch('');
                        setPatientDropdownOpen(true);
                      }}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Dropdown de pacientes */}
                {patientDropdownOpen && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-72 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md shadow-2xl divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in-95 duration-150">
                    {isSearchingPatients && patientList.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                        <Loader className="w-4 h-4 animate-spin text-blue-500" />
                        <span>Carregando pacientes...</span>
                      </div>
                    ) : patientList.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500">
                        {patientSearch.trim().length > 0
                          ? `Nenhum paciente encontrado para "${patientSearch}".`
                          : 'Nenhum paciente cadastrado.'}
                      </div>
                    ) : (
                      <>
                        <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                          <span>
                            {patientSearch.trim().length > 0
                              ? `Resultados para "${patientSearch}" (${patientList.length}):`
                              : 'Pacientes cadastrados (selecione ou digite para filtrar):'}
                          </span>
                          <span className="text-[10px] text-slate-400">Total: {totalPatients}</span>
                        </div>
                        {patientList.map((p: any) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setSelectedPatient(p);
                              setPatientDropdownOpen(false);
                              setPatientSearch('');
                            }}
                            className="w-full text-left p-3 hover:bg-blue-50/70 dark:hover:bg-slate-800/80 transition flex items-center justify-between group cursor-pointer"
                          >
                            <div className="min-w-0 pr-3">
                              <div className="font-semibold text-slate-800 dark:text-slate-100 text-xs truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                {p.name}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                                <span>CPF: <strong className="font-medium text-slate-700 dark:text-slate-300">{p.cpf || 'S/N'}</strong></span>
                                {p.cns && <span>CNS: <strong className="font-medium text-slate-700 dark:text-slate-300">{p.cns}</strong></span>}
                                {p.birthDate && (
                                  <span>Nasc: {new Date(p.birthDate).toLocaleDateString('pt-BR')}</span>
                                )}
                                {p.healthCenter?.name && (
                                  <span className="text-slate-400 truncate">UBS: {p.healthCenter.name}</span>
                                )}
                              </div>
                            </div>
                            <span className="px-2.5 py-1 text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-md font-semibold shrink-0 group-hover:bg-blue-600 group-hover:text-white transition">
                              Selecionar
                            </span>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* SEÇÃO 2: Tipo de Encaminhamento & Procedimento (Cores Vivas: Ciano, Esmeralda e Roxo) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm relative z-20">
          <div className="px-4 py-3 bg-emerald-50/70 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/40 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-emerald-600 text-white rounded-md">
                <Activity className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-emerald-950 dark:text-emerald-100 uppercase tracking-wide">
                2. Tipo de Solicitação e Procedimento Desejado <span className="text-red-500">*</span>
              </h2>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
              {requestType}
            </span>
          </div>

          <div className="p-4 lg:p-5 space-y-4">
            {/* Seletor de Tipo em 3 Cards Clicáveis */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Selecione a Modalidade do Encaminhamento:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Consulta */}
                <button
                  type="button"
                  onClick={() => {
                    setRequestType('CONSULTA');
                    setProcedureId('');
                    setProcedureGroupId('');
                  }}
                  className={`p-3.5 rounded-md border text-left transition flex items-center gap-3 cursor-pointer ${
                    requestType === 'CONSULTA'
                      ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-900/30 ring-1 ring-blue-500'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div
                    className={`p-2 rounded-md shrink-0 ${
                      requestType === 'CONSULTA'
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                    }`}
                  >
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs lg:text-sm text-slate-800 dark:text-slate-100">
                      Consulta Médica
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Médico Especialista (Cardio, Orto, etc.)
                    </p>
                  </div>
                </button>

                {/* 2. Exame */}
                <button
                  type="button"
                  onClick={() => {
                    setRequestType('EXAME');
                    setSpecialtyId('');
                  }}
                  className={`p-3.5 rounded-md border text-left transition flex items-center gap-3 cursor-pointer ${
                    requestType === 'EXAME'
                      ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-900/30 ring-1 ring-emerald-500'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div
                    className={`p-2 rounded-md shrink-0 ${
                      requestType === 'EXAME'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                    }`}
                  >
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs lg:text-sm text-slate-800 dark:text-slate-100">
                      Exame Diagnóstico
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Ultrassom, TC, RM, ECG, Sangue
                    </p>
                  </div>
                </button>

                {/* 3. Procedimento */}
                <button
                  type="button"
                  onClick={() => {
                    setRequestType('PROCEDIMENTO');
                    setSpecialtyId('');
                  }}
                  className={`p-3.5 rounded-md border text-left transition flex items-center gap-3 cursor-pointer ${
                    requestType === 'PROCEDIMENTO'
                      ? 'border-purple-500 bg-purple-50/70 dark:bg-purple-900/30 ring-1 ring-purple-500'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div
                    className={`p-2 rounded-md shrink-0 ${
                      requestType === 'PROCEDIMENTO'
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                    }`}
                  >
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs lg:text-sm text-slate-800 dark:text-slate-100">
                      Procedimento Clínico
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Pequena Cirurgia, Terapia, Biópsia
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Campos condicionais de acordo com o tipo */}
            {requestType === 'CONSULTA' ? (
              <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-md">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Especialidade Médica Desejada <span className="text-red-500">*</span>
                </label>
                <select
                  value={specialtyId}
                  onChange={(e) => setSpecialtyId(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-md text-xs lg:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecione a especialidade médica...</option>
                  {(specialtiesData?.data || []).map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-md space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Grupo do Procedimento (Opcional para filtrar)
                    </label>
                    <select
                      value={procedureGroupId}
                      onChange={(e) => setProcedureGroupId(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-md text-xs lg:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="">Todos os Grupos...</option>
                      {(procedureGroups || []).map((g: any) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {requestType === 'EXAME' ? 'Exame Específico' : 'Procedimento Específico'}{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={procedureId}
                      onChange={(e) => setProcedureId(e.target.value)}
                      disabled={isLoadingProcedures}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-md text-xs lg:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50"
                    >
                      <option value="">
                        {isLoadingProcedures
                          ? 'Carregando procedimentos...'
                          : 'Selecione o procedimento...'}
                      </option>
                      {proceduresInGroup.map((proc: any) => (
                        <option key={proc.id} value={proc.id}>
                          {proc.code ? `[${proc.code}] ` : ''}
                          {proc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SEÇÃO 3: Classificação de Risco e Prioridade Clínica (Semáforo SUS) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm relative z-10">
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

          <div className="p-4 lg:p-5">
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
                  Condição estável, sem risco de agravamento a curto prazo.
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
                    🟡 Prioritário (Atenção)
                  </span>
                  {priority === 'PRIORITARIO' && <Check className="w-4 h-4 text-amber-600" />}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                  Quadro com risco de progressão ou dor limitante que demanda celeridade.
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

        {/* SEÇÃO 4: Diagnóstico CID-10 e Justificativa Clínica (Roxo / Lavanda) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm relative z-20">
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

          <div className="p-4 lg:p-5 space-y-4">
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
                    className="text-xs text-purple-700 dark:text-purple-300 hover:underline font-semibold"
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
                    className="w-full pl-9 pr-9 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-xs lg:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                  />
                  {isSearchingCid && (
                    <Loader className="absolute right-3 top-2.5 w-4 h-4 text-purple-500 animate-spin" />
                  )}

                  {cidResults.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md shadow-2xl divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in-95 duration-150">
                      {cidResults.map((c) => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => {
                            setSelectedCid(c);
                            setCidResults([]);
                            setCidSearchTerm('');
                          }}
                          className="w-full text-left p-2.5 hover:bg-purple-50/60 dark:hover:bg-slate-800 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 font-mono text-xs font-bold">
                              {c.code}
                            </span>
                            <span className="text-xs text-slate-700 dark:text-slate-300">
                              {c.description}
                            </span>
                          </div>
                          <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
                            Escolher
                          </span>
                        </button>
                      ))}
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
                  {clinicalJustification.length}/10 min caracteres
                </span>
              </div>
              <textarea
                rows={3}
                required
                value={clinicalJustification}
                onChange={(e) => setClinicalJustification(e.target.value)}
                placeholder="Descreva o quadro clínico atual, sinais, sintomas, exames prévios, tratamentos já realizados na UBS e o motivo técnico do encaminhamento..."
                className="w-full p-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-xs lg:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            {/* Histórico Pregresso */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Histórico Pregresso e Comorbidades (Opcional)
              </label>
              <textarea
                rows={2}
                value={clinicalHistory}
                onChange={(e) => setClinicalHistory(e.target.value)}
                placeholder="Informe comorbidades crônicas (DM, HAS, cardiopatias), cirurgias prévias, alergias medicamentosas relevantes..."
                className="w-full p-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-xs lg:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        {/* SEÇÃO 5: Documentos, Laudos e Anexos (Índigo) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm relative z-10">
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

          <div className="p-4 lg:p-5 space-y-3">
            <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-indigo-200 dark:border-indigo-800/80 hover:border-indigo-400 dark:hover:border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/10 rounded-md transition cursor-pointer text-center group">
              <Upload className="w-8 h-8 text-indigo-500 group-hover:scale-110 transition-transform mb-2" />
              <span className="text-xs lg:text-sm font-semibold text-slate-800 dark:text-slate-200">
                Clique para selecionar arquivos ou arraste aqui
              </span>
              <span className="text-[11px] text-slate-500 mt-1">
                Laudos anteriores, pedidos médicos digitalizados, resultados de exames complementares
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
                        className="p-1 text-slate-400 hover:text-red-500 transition"
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

        {/* Barra de Ações Final */}
        <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
          <button
            type="button"
            onClick={() => navigate('/regulation/solicitor')}
            className="px-4 py-2.5 text-xs lg:text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md transition cursor-pointer"
          >
            ← Voltar para Minhas Solicitações
          </button>

          <button
            type="submit"
            disabled={createRequestMutation.isPending}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs lg:text-sm rounded-md shadow-md transition flex items-center gap-2 cursor-pointer active:scale-98"
          >
            <Send className="w-4 h-4" />
            <span>
              {createRequestMutation.isPending
                ? 'Protocolando Solicitação...'
                : 'Protocolar Solicitação na Regulação'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};
