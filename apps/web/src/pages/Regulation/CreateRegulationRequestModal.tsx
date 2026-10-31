import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Upload,
  CheckCircle2,
  Paperclip,
  Trash2,
  Stethoscope,
  Activity,
  Layers,
  User,
} from 'lucide-react';
import { usePatients } from '../../hooks/usePatients';
import { useSpecialties } from '../../hooks/useSpecialties';
import { useProcedureGroups } from '../../hooks/useProcedures';
import { useCreateRegulationRequest } from '../../hooks/useRegulation';
import { useAuthStore } from '../../store/useAuthStore';
import { apiUrl } from '../../services/api';
import axios from 'axios';
import { toast } from 'sonner';

interface CreateRegulationRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPatient?: any;
}

export const CreateRegulationRequestModal: React.FC<CreateRegulationRequestModalProps> = ({
  isOpen,
  onClose,
  defaultPatient,
}) => {
  const token = useAuthStore((state) => state.token);

  // Form states
  const [selectedPatient, setSelectedPatient] = useState<any>(defaultPatient || null);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);

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
    limit: 10,
    search: patientSearch,
  });

  const { data: specialtiesData } = useSpecialties({ page: 1, limit: 100 });
  const { data: procedureGroups } = useProcedureGroups();

  // Filtered procedures by selected group
  const [proceduresInGroup, setProceduresInGroup] = useState<any[]>([]);
  const [isLoadingProcedures, setIsLoadingProcedures] = useState(false);

  // When defaultPatient changes
  useEffect(() => {
    if (defaultPatient) {
      setSelectedPatient(defaultPatient);
    }
  }, [defaultPatient]);

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
      onClose();
    } catch (err) {
      // Error is handled in hook onError
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl text-blue-600 dark:text-blue-400">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Nova Solicitação de Regulação (UBS)
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Encaminhamento para Central Municipal de Regulação & Agendamento
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Seção 1: Identificação do Paciente */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              1. Identificação do Paciente <span className="text-red-500">*</span>
            </label>

            {selectedPatient ? (
              <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-600 text-white rounded-lg">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{selectedPatient.name}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      CPF: {selectedPatient.cpf || 'Não informado'} | CNS: {selectedPatient.cns || 'Não informado'}
                    </p>
                  </div>
                </div>
                {!defaultPatient && (
                  <button
                    type="button"
                    onClick={() => setSelectedPatient(null)}
                    className="text-xs text-blue-600 hover:underline dark:text-blue-400 font-medium"
                  >
                    Alterar paciente
                  </button>
                )}
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      setPatientDropdownOpen(true);
                    }}
                    onFocus={() => setPatientDropdownOpen(true)}
                    placeholder="Digite o nome, CPF ou CNS do paciente..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                {patientDropdownOpen && patientSearch.length >= 2 && (
                  <div className="absolute z-30 w-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-h-56 overflow-y-auto">
                    {isSearchingPatients ? (
                      <div className="p-4 text-center text-sm text-gray-500">Buscando munícipes...</div>
                    ) : patientsData?.data && patientsData.data.length > 0 ? (
                      patientsData.data.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedPatient(p);
                            setPatientDropdownOpen(false);
                            setPatientSearch('');
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/30 border-b border-gray-100 dark:border-gray-700/50 last:border-none transition"
                        >
                          <div className="font-medium text-gray-900 dark:text-white text-sm">{p.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            CPF: {p.cpf || 'S/N'} • CNS: {p.cns || 'S/N'}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-gray-500">Nenhum paciente localizado.</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Seção 2: Tipo de Demanda e Prioridade */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                2. Tipo de Solicitação <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['CONSULTA', 'EXAME', 'PROCEDIMENTO'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setRequestType(type);
                      setSpecialtyId('');
                      setProcedureGroupId('');
                      setProcedureId('');
                    }}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition ${
                      requestType === type
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {type === 'CONSULTA' ? 'Consulta Esp.' : type === 'EXAME' ? 'Exame' : 'Procedimento'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                3. Prioridade Clínica <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'ELETIVO', label: 'Eletivo', color: 'border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20' },
                  { id: 'PRIORITARIO', label: 'Prioritário', color: 'border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-900/20' },
                  { id: 'URGENCIA', label: 'Urgência', color: 'border-red-500 text-red-700 bg-red-50 dark:bg-red-900/20' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPriority(item.id as any)}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition ${
                      priority === item.id
                        ? `${item.color} font-bold ring-2 ring-offset-1 ring-blue-400`
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Seção 3: Seleção em Cascata (Especialidade OU Grupo -> Procedimento Específico) */}
          <div className="p-4 bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
            {requestType === 'CONSULTA' ? (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Especialidade Médica Solicitada <span className="text-red-500">*</span>
                </label>
                <select
                  value={specialtyId}
                  onChange={(e) => setSpecialtyId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione uma especialidade...</option>
                  {specialtiesData?.data?.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1º Nível da Cascata: Grupo de Exames/Procedimentos */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-500" />
                    Grupo de Exames / Linha de Cuidado <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={procedureGroupId}
                    onChange={(e) => {
                      setProcedureGroupId(e.target.value);
                      setProcedureId('');
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione o Grupo (ex: Ultrassonografia, Tomografia, Laboratório...)</option>
                    {procedureGroups?.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2º Nível da Cascata: Exame/Procedimento Específico */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-emerald-500" />
                    Exame / Procedimento Específico <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={procedureId}
                    onChange={(e) => setProcedureId(e.target.value)}
                    disabled={!procedureGroupId || isLoadingProcedures}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="">
                      {!procedureGroupId
                        ? 'Selecione primeiro o Grupo acima...'
                        : isLoadingProcedures
                        ? 'Carregando exames do grupo...'
                        : 'Selecione o procedimento específico...'}
                    </option>
                    {proceduresInGroup.map((proc) => (
                      <option key={proc.id} value={proc.id}>
                        {proc.code} - {proc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Seção 4: Hipótese Diagnóstica (CID-10) */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              4. Diagnóstico Provável / Hipótese Diagnóstica (CID-10) <span className="text-red-500">*</span>
            </label>

            {selectedCid ? (
              <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                <div>
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 text-sm">{selectedCid.code}</span>
                  <span className="text-gray-700 dark:text-gray-200 text-sm ml-2">— {selectedCid.description}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCid(null)}
                  className="text-xs text-red-600 hover:underline dark:text-red-400 font-medium"
                >
                  Trocar CID
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                {isSearchingCid && (
                  <div className="absolute right-3 top-3 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                )}
                <input
                  type="text"
                  value={cidSearchTerm}
                  onChange={(e) => setCidSearchTerm(e.target.value)}
                  placeholder="Pesquisar por código CID ou nome da patologia (ex: I10, Diabetes, Cefaleia)..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                />

                {cidResults.length > 0 && !selectedCid && (
                  <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-h-48 overflow-y-auto">
                    {cidResults.map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => {
                          setSelectedCid(item);
                          setCidResults([]);
                          setCidSearchTerm('');
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-sm border-b border-gray-100 dark:border-gray-700/50 last:border-none transition"
                      >
                        <span className="font-bold text-blue-600 dark:text-blue-400 mr-2">{item.code}</span>
                        <span className="text-gray-800 dark:text-gray-200">{item.description}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Seção 5: Justificativa Clínica e Histórico */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                5. Justificativa Clínica Detalhada <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={clinicalJustification}
                onChange={(e) => setClinicalJustification(e.target.value)}
                placeholder="Descreva a indicação clínica, sintomas, tempo de evolução e objetivo da solicitação para o médico regulador..."
                className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Histórico Clínico e Tratamentos Prévios (Opcional)
              </label>
              <textarea
                rows={2}
                value={clinicalHistory}
                onChange={(e) => setClinicalHistory(e.target.value)}
                placeholder="Medicamentos em uso, comorbidades relevantes, resultados de exames anteriores já realizados na UBS..."
                className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Seção 6: Anexos e Laudos Prévios */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              6. Anexos Clínicos (Exames anteriores, laudos, fotos de lesões ou receitas)
            </label>

            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-6 text-center hover:border-blue-500 transition bg-gray-50/50 dark:bg-gray-800/50">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                Arraste arquivos ou clique para selecionar
              </p>
              <p className="text-xs text-gray-400 mt-1">PDF, PNG, JPG até 10MB por arquivo</p>
              <input
                type="file"
                multiple
                accept=".pdf,image/png,image/jpeg,image/jpg"
                onChange={handleFileChange}
                className="hidden"
                id="regulation-file-upload"
              />
              <label
                htmlFor="regulation-file-upload"
                className="inline-block mt-3 px-4 py-2 bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 border border-gray-300 dark:border-gray-600 rounded-xl text-xs font-semibold cursor-pointer hover:bg-gray-50 transition shadow-sm"
              >
                Selecionar Arquivos
              </label>
            </div>

            {files.length > 0 && (
              <div className="space-y-2 mt-2">
                {files.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-gray-100 dark:bg-gray-700/60 rounded-xl text-xs"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <Paperclip className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="font-medium text-gray-800 dark:text-gray-200 truncate">{file.name}</span>
                      <span className="text-gray-400 text-[10px]">({(file.size / 1024).toFixed(0)} KB)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="p-1 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={createRequestMutation.isPending}
              className="px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createRequestMutation.isPending}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center space-x-2"
            >
              {createRequestMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Enviando para Regulação...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Emitir Solicitação</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
