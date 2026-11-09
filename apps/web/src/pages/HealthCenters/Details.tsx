import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { useHealthCenter, useHealthCenters } from '../../hooks/useHealthCenters';
import { useCreateHealthAgent, useUpdateHealthAgent, useDeleteHealthAgent, useToggleHealthAgentActive } from '../../hooks/useHealthAgents';
import { useAuthStore } from '../../store/useAuthStore';
import { useConfirm } from '../../contexts/ConfirmContext';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Edit2,
  Building2,
  MapPin,
  Loader2,
  AlertCircle,
  Phone,
  Plus,
  Trash2,
  X,
  Check,
  ArrowLeftRight,
  Power,
  Search
} from 'lucide-react';
import { TablePagination } from '../../components/TablePagination';
import { formatCPF, formatCNS, formatGender } from '../../utils/brazilianFormatters';

const acsSchema = zod.object({
  name: zod.string().min(3, 'O nome deve ter no mínimo 3 caracteres'),
  phone: zod.string().min(1, 'O telefone é obrigatório').refine((val) => {
    const clean = val.replace(/\D/g, '');
    return clean.length === 10 || clean.length === 11;
  }, 'Telefone inválido (deve conter 10 ou 11 dígitos)'),
  microArea: zod.string().min(1, 'A micro área é obrigatória'),
});

type AcsFormData = zod.infer<typeof acsSchema>;

export const HealthCenterDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const confirm = useConfirm();

  const [activeTab, setActiveTab] = useState<'geral' | 'agents' | 'patients'>('geral');
  const [isAcsModalOpen, setIsAcsModalOpen] = useState(false);
  const [editingAcs, setEditingAcs] = useState<any | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferringAcs, setTransferringAcs] = useState<any | null>(null);
  const [selectedTargetCenterId, setSelectedTargetCenterId] = useState('');
  const [showInactiveAgents, setShowInactiveAgents] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientPage, setPatientPage] = useState(1);
  const [patientLimit, setPatientLimit] = useState(15);

  const userPermissions = useAuthStore(state => state.permissions);

  const { data: healthCenter, isLoading, isError, error } = useHealthCenter(id || '');

  const { data: healthCentersData, isLoading: isLoadingCenters } = useHealthCenters({
    page: 1,
    limit: 200,
    sortBy: 'name',
    sortOrder: 'asc',
  });

  const createAcsMutation = useCreateHealthAgent();
  const updateAcsMutation = useUpdateHealthAgent();
  const deleteAcsMutation = useDeleteHealthAgent();
  const toggleAcsActiveMutation = useToggleHealthAgentActive();

  const searchParams = new URLSearchParams(location.search);
  const searchHighlight = searchParams.get('search') || '';

  const {
    control,
    handleSubmit,
    clearErrors,
    reset,
    formState: { errors },
  } = useForm<AcsFormData>({
    resolver: zodResolver(acsSchema),
    defaultValues: {
      name: '',
      phone: '',
      microArea: '',
    },
  });

  const formatPhone = (phone: string) => {
    const clean = phone.replace(/\D/g, '').slice(0, 11);
    if (clean.length <= 2) return clean.length > 0 ? `(${clean}` : '';
    if (clean.length <= 6) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
    if (clean.length <= 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`;
  };

  // Redirect to ACS tab on load if search matches an ACS
  useEffect(() => {
    if (healthCenter && searchHighlight) {
      const hasMatchingAgent = healthCenter.healthAgents?.some((agent) =>
        agent.name.toLowerCase().includes(searchHighlight.toLowerCase())
      );
      if (hasMatchingAgent) {
        setActiveTab('agents');
      }
    }
  }, [healthCenter, searchHighlight]);

  // Open modal for Create
  const handleOpenCreateAcs = () => {
    setEditingAcs(null);
    reset({ name: '', phone: '', microArea: '' });
    clearErrors();
    setIsAcsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditAcs = (agent: any) => {
    setEditingAcs(agent);
    reset({
      name: agent.name,
      phone: agent.phone ? formatPhone(agent.phone) : '',
      microArea: agent.microArea || '',
    });
    clearErrors();
    setIsAcsModalOpen(true);
  };

  // Handle Delete
  const handleDeleteAcs = async (agentId: string, agentName: string) => {
    const isConfirmed = await confirm({
      title: 'Excluir Definitivamente',
      description: `Deseja realmente excluir o(a) agente ${agentName} DEFINITIVAMENTE? Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      variant: 'danger',
    });

    if (isConfirmed) {
      deleteAcsMutation.mutate(agentId, {
        onSuccess: () => {
          toast.success('Agente de saúde excluído com sucesso!');
        },
        onError: () => {
          toast.error('Ocorreu um erro ao tentar excluir o agente.');
        },
      });
    }
  };

  const handleToggleAcsActive = async (agentId: string, currentActive: boolean) => {
    const actionName = currentActive ? 'Desabilitar' : 'Habilitar';
    const isConfirmed = await confirm({
      title: `${actionName} Agente`,
      description: `Deseja realmente ${actionName.toLowerCase()} este agente?`,
      confirmText: actionName,
      cancelText: 'Cancelar',
      variant: currentActive ? 'danger' : 'info'
    });

    if (isConfirmed) {
      toggleAcsActiveMutation.mutate(agentId, {
        onSuccess: () => {
          toast.success(`Agente ${currentActive ? 'desabilitado' : 'habilitado'} com sucesso!`);
        },
        onError: () => {
          toast.error(`Erro ao ${actionName.toLowerCase()} agente.`);
        }
      });
    }
  };

  // Open Transfer Modal
  const handleOpenTransferAcs = (agent: any) => {
    setTransferringAcs(agent);
    setSelectedTargetCenterId('');
    setIsTransferModalOpen(true);
  };

  // Submit Transfer
  const handleTransferAcsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferringAcs || !selectedTargetCenterId) {
      toast.error('Por favor, selecione a unidade de destino.');
      return;
    }

    updateAcsMutation.mutate(
      {
        id: transferringAcs.id,
        data: {
          healthCenterId: selectedTargetCenterId,
        },
      },
      {
        onSuccess: () => {
          toast.success('Agente de saúde transferido com sucesso!');
          setIsTransferModalOpen(false);
          setTransferringAcs(null);
          setSelectedTargetCenterId('');
        },
        onError: (err) => {
          console.error(err);
          toast.error('Erro ao transferir o agente.');
        },
      }
    );
  };

  // Submit Modal
  const onSubmitAcs = (data: AcsFormData) => {
    const payload = {
      name: data.name,
      phone: data.phone ? data.phone.replace(/\D/g, '') : undefined,
      microArea: data.microArea || undefined,
      healthCenterId: id!,
    };

    if (editingAcs) {
      updateAcsMutation.mutate(
        { id: editingAcs.id, data: payload },
        {
          onSuccess: () => {
            toast.success('Agente de saúde atualizado com sucesso!');
            setIsAcsModalOpen(false);
          },
          onError: (err) => {
            console.error(err);
            toast.error('Erro ao atualizar o agente.');
          },
        }
      );
    } else {
      createAcsMutation.mutate(payload, {
        onSuccess: () => {
          toast.success('Agente de saúde cadastrado com sucesso!');
          setIsAcsModalOpen(false);
        },
        onError: (err) => {
          console.error(err);
          toast.error('Erro ao cadastrar o agente.');
        },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-10 h-10 text-blue-700 dark:text-blue-500 animate-spin" />
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium font-sans">Carregando detalhes da UBS...</p>
      </div>
    );
  }

  if (isError || !healthCenter) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-md max-w-xl mx-auto my-10 font-sans">
        <AlertCircle className="w-6 h-6 shrink-0" />
        <div>
          <h4 className="font-semibold">Erro ao carregar detalhes</h4>
          <p className="text-xs text-red-600 dark:text-red-400/80 mt-0.5">
            {(error as Error | null)?.message || 'UBS não encontrada ou erro de conexão.'}
          </p>
          <button
            onClick={() => navigate('/health-centers')}
            className="mt-3 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-400 rounded-md text-xs font-semibold transition-all cursor-pointer shadow-md"
          >
            Voltar para Listagem
          </button>
        </div>
      </div>
    );
  }

  const isAcsPending = createAcsMutation.isPending || updateAcsMutation.isPending;

  const filteredPatients = (healthCenter.patients || []).filter((patient: any) => {
    if (!patientSearch) return true;
    const term = patientSearch.toLowerCase().trim();
    const nameMatch = patient.name?.toLowerCase().includes(term);
    const cleanTerm = term.replace(/\D/g, '');
    const cpfMatch = cleanTerm && patient.cpf?.replace(/\D/g, '').includes(cleanTerm);
    const cnsMatch = cleanTerm && patient.cns?.replace(/\D/g, '').includes(cleanTerm);
    return Boolean(nameMatch || cpfMatch || cnsMatch);
  });

  const paginatedPatients = filteredPatients.slice(
    (patientPage - 1) * patientLimit,
    patientPage * patientLimit
  );

  return (
    <div className="space-y-6 font-sans">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/health-centers')}
            className="flex items-center justify-center w-10 h-10 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 transition-all cursor-pointer shadow-md"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{healthCenter.name}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Detalhamento e equipes vinculadas da unidade</p>
          </div>
        </div>

        <button
          onClick={() => navigate(`/health-centers/${healthCenter.id}/edit`)}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:bg-slate-850 border border-slate-300 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-200 font-medium rounded-md text-sm transition-all duration-300 shadow-md active:scale-95 cursor-pointer animate-fade-in"
        >
          <Edit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Editar UBS</span>
        </button>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-850 gap-2">
        <button
          onClick={() => setActiveTab('geral')}
          className={`px-4 py-2.5 text-sm font-medium transition-all relative cursor-pointer ${activeTab === 'geral' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500 font-semibold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}
        >
          Informações Gerais
        </button>
        <button
          onClick={() => setActiveTab('agents')}
          className={`px-4 py-2.5 text-sm font-medium transition-all relative cursor-pointer flex items-center gap-2 ${activeTab === 'agents' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500 font-semibold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}
        >
          <span>Agentes de Saúde (ACS)</span>
          <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === 'agents' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'bg-slate-50 dark:bg-slate-900 text-slate-500'}`}>
            {healthCenter.healthAgents?.length || 0}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('patients')}
          className={`px-4 py-2.5 text-sm font-medium transition-all relative cursor-pointer flex items-center gap-2 ${activeTab === 'patients' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500 font-semibold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}
        >
          <span>Pacientes</span>
          <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === 'patients' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'bg-slate-50 dark:bg-slate-900 text-slate-500'}`}>
            {healthCenter.patients?.length || 0}
          </span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in-up">
        {/* TAB 1: General Info */}
        {activeTab === 'geral' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white shadow-md dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-md p-6 backdrop-blur-md space-y-4 lg:col-span-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-300 dark:border-slate-800/60 pb-3">
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>Identificação</span>
              </h3>
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Nome da UBS</span>
                  <span className="text-sm text-slate-700 dark:text-slate-200 font-semibold">{healthCenter.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Código CNES</span>
                  <span className="text-sm text-slate-600 dark:text-slate-300 font-mono">
                    {healthCenter.cnes || <span className="text-slate-500 italic">Não informado</span>}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Enfermeira Chefe / Responsável</span>
                  <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                    {healthCenter.nurseName || <span className="text-slate-500 italic">Não informado</span>}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold mb-1">Papel na Regulação</span>
                  <div className="flex flex-wrap gap-1.5">
                    {healthCenter.stSolicitante && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        Unidade Solicitante
                      </span>
                    )}
                    {healthCenter.stExecutante && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        Unidade Executante
                      </span>
                    )}
                    {!healthCenter.stSolicitante && !healthCenter.stExecutante && (
                      <span className="text-xs text-slate-400 italic">Não parametrizado</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white shadow-md dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-md p-6 backdrop-blur-md space-y-4 lg:col-span-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-300 dark:border-slate-800/60 pb-3">
                <MapPin className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <span>Endereço e Localização</span>
              </h3>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Endereço de Atendimento</span>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-1.5 font-medium">
                  {healthCenter.address || <span className="text-slate-500 italic">Nenhum endereço registrado.</span>}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ACS management */}
        {activeTab === 'agents' && (
          <div className="bg-white shadow-md dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-md p-6 backdrop-blur-md space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-300 dark:border-slate-800/60">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Agentes Comunitários de Saúde (ACS)</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Gerencie os agentes alocados a essa unidade e suas respectivas microáreas.</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer hover:text-slate-700 dark:text-slate-200 transition-colors">
                  <div className="relative inline-flex items-center">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={showInactiveAgents}
                      onChange={(e) => setShowInactiveAgents(e.target.checked)}
                    />
                    <div className="w-9 h-5 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 peer-checked:after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                  </div>
                  <span>Mostrar desabilitados</span>
                </label>
                <button
                  onClick={handleOpenCreateAcs}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-semibold transition-all duration-300 active:scale-95 cursor-pointer shadow-md "
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar ACS</span>
                </button>
              </div>
            </div>

            <div className="overflow-hidden border border-slate-200 dark:border-slate-850 rounded-md">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-semibold tracking-wider border-b border-slate-300 dark:border-slate-800">
                    <th className="px-4 py-3">Agente de Saúde</th>
                    <th className="px-4 py-3">Telefone</th>
                    <th className="px-4 py-3">Micro Área</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/40 text-xs text-slate-600 dark:text-slate-300">
                  {healthCenter.healthAgents && healthCenter.healthAgents.length > 0 ? (
                    healthCenter.healthAgents
                      .filter((agent: any) => showInactiveAgents || agent.isActive !== false)
                      .map((agent: any) => {
                        const isHighlighted = searchHighlight && agent.name.toLowerCase().includes(searchHighlight.toLowerCase());

                        return (
                          <tr
                            key={agent.id}
                            className={`transition-colors ${isHighlighted
                                ? 'bg-indigo-100 dark:bg-indigo-500/10 hover:bg-indigo-500/15 border-l-2 border-indigo-500'
                                : 'hover:bg-slate-200 dark:bg-slate-800/15'
                              }`}
                          >
                            <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                              <div className="flex items-center gap-2">
                                <span className={agent.isActive !== false ? 'text-slate-700 dark:text-slate-200' : 'text-slate-500 line-through'}>{agent.name}</span>
                                {agent.isActive === false && <span className="text-[9px] bg-rose-500/20 border border-rose-300 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 px-1 py-0.5 rounded-md uppercase tracking-wider font-bold">Desabilitado</span>}
                                {isHighlighted && (
                                  <span className="text-[9px] bg-indigo-500/20 border border-indigo-300 dark:border-indigo-500/30 text-indigo-300 px-1 py-0.5 rounded-md uppercase tracking-wider font-bold">
                                    Correspondência
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono">
                              {agent.phone ? (
                                <div className="flex items-center gap-1.5">
                                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                                  <span>{formatPhone(agent.phone)}</span>
                                </div>
                              ) : (
                                <span className="text-slate-500">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-semibold text-teal-600 dark:text-teal-400">
                              {agent.microArea ? `Área ${agent.microArea}` : <span className="text-slate-500 font-normal italic">Não definida</span>}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-2.5">
                                <button
                                  onClick={() => handleOpenTransferAcs(agent)}
                                  className="px-2 py-1 bg-slate-200 dark:bg-slate-850 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-800 rounded-md hover:text-slate-900 transition-all cursor-pointer shadow-md text-[10px] font-semibold flex items-center gap-1 disabled:opacity-50"
                                  title="Transferir Agente para outra UBS"
                                  disabled={!userPermissions.includes('health-agents:write') && !userPermissions.includes('admin:access')}
                                >
                                  <ArrowLeftRight className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                                  <span>Transferir</span>
                                </button>
                                <button
                                  onClick={() => handleOpenEditAcs(agent)}
                                  className="px-2 py-1 bg-slate-200 dark:bg-slate-850 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-800 rounded-md hover:text-slate-900 transition-all cursor-pointer shadow-md text-[10px] font-semibold disabled:opacity-50"
                                  disabled={!userPermissions.includes('health-agents:write') && !userPermissions.includes('admin:access')}
                                >
                                  Editar
                                </button>

                                {(userPermissions.includes('health-agents:write') || userPermissions.includes('admin:access')) && (
                                  <button
                                    onClick={() => handleToggleAcsActive(agent.id, agent.isActive !== false)}
                                    className={`p-1 border rounded-md transition-all cursor-pointer ${agent.isActive !== false
                                        ? 'bg-amber-100 dark:bg-amber-500/10 hover:bg-amber-200 dark:hover:bg-amber-500/20 border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400'
                                        : 'bg-teal-100 dark:bg-teal-500/10 hover:bg-teal-200 dark:hover:bg-teal-500/20 border-teal-200 dark:border-teal-500/20 text-teal-600 dark:text-teal-400'
                                      }`}
                                    title={agent.isActive !== false ? "Desabilitar" : "Habilitar"}
                                  >
                                    <Power className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {userPermissions.includes('admin:access') && (
                                  <button
                                    onClick={() => handleDeleteAcs(agent.id, agent.name)}
                                    className="p-1 bg-rose-100 dark:bg-rose-500/10 hover:bg-rose-200 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-md transition-all cursor-pointer shadow-md"
                                    title="Excluir Definitivamente"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500 italic">
                        Nenhum Agente de Saúde vinculado a esta UBS.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Patients List */}
        {activeTab === 'patients' && (
          <div className="bg-white shadow-md dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-md p-6 backdrop-blur-md space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-300 dark:border-slate-800/60">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Pacientes Cadastrados</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {healthCenter.patients?.length || 0} cidadão{(healthCenter.patients?.length || 0) === 1 ? '' : 's'} atendido{(healthCenter.patients?.length || 0) === 1 ? '' : 's'} por esta UBS.
                </p>
              </div>

              {healthCenter.patients && healthCenter.patients.length > 0 && (
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscar por nome, CPF ou CNS..."
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      setPatientPage(1);
                    }}
                    className="w-full pl-9 pr-8 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  {patientSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setPatientSearch('');
                        setPatientPage(1);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="overflow-hidden border border-slate-200 dark:border-slate-850 rounded-md">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-semibold tracking-wider border-b border-slate-300 dark:border-slate-800">
                    <th className="px-4 py-3">Paciente</th>
                    <th className="px-4 py-3">CPF</th>
                    <th className="px-4 py-3">Cartão SUS (CNS)</th>
                    <th className="px-4 py-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/40 text-xs text-slate-600 dark:text-slate-300">
                  {paginatedPatients.length > 0 ? (
                    paginatedPatients.map((patient: any) => (
                      <tr key={patient.id} className="hover:bg-slate-200 dark:bg-slate-800/10 transition-colors group">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-700 dark:text-slate-200 group-hover:text-blue-500 transition-colors">
                            {patient.name || 'Nome não informado'}
                          </div>
                          <span className="text-[10px] text-slate-500">
                            Gênero: {formatGender(patient.gender)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono">{formatCPF(patient.cpf)}</td>
                        <td className="px-4 py-3 font-mono">{formatCNS(patient.cns)}</td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            to={`/patients/${patient.id}`}
                            className="shadow-md inline-block px-2.5 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 rounded-md transition-all font-semibold"
                          >
                            Ver Ficha
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500 italic">
                        {patientSearch
                          ? 'Nenhum paciente encontrado para os termos da busca.'
                          : 'Nenhum paciente cadastrado nesta UBS.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredPatients.length > 0 && (
              <TablePagination
                page={patientPage}
                limit={patientLimit}
                total={filteredPatients.length}
                onPageChange={setPatientPage}
                onLimitChange={(newLimit) => {
                  setPatientLimit(newLimit);
                  setPatientPage(1);
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Floating Modal for ACS CRUD */}
      {isAcsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-2xl p-6 space-y-5">
            {/* Close Button */}
            <button
              onClick={() => setIsAcsModalOpen(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-slate-900 dark:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingAcs ? 'Editar Agente de Saúde' : 'Novo Agente de Saúde'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {editingAcs
                  ? 'Modifique os dados do agente abaixo.'
                  : 'Insira as informações do novo agente que será vinculado a esta UBS.'}
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmitAcs)} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Nome Completo
                </label>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      className={`w-full px-3 py-2 bg-white dark:bg-slate-950 border rounded-md text-sm text-slate-900 dark:text-white focus:outline-none transition-all ${errors.name
                          ? 'border-rose-500/80 shadow-[0_0_10px_rgba(244,63,94,0.15)] focus:border-rose-400'
                          : field.value
                            ? 'border-teal-500/80 shadow-[0_0_10px_rgba(20,184,166,0.15)] focus:border-teal-400'
                            : 'border-slate-300 dark:border-slate-800 focus:border-blue-500'
                        }`}
                    />
                  )}
                />
                {errors.name && <p className="text-rose-700 dark:text-rose-500 text-xs mt-0.5">{errors.name.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Telefone (WhatsApp / Contato)
                </label>
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      placeholder="Ex: (83) 99999-9999"
                      onChange={(e) => field.onChange(formatPhone(e.target.value))}
                      className={`w-full px-3 py-2 bg-white dark:bg-slate-950 border rounded-md text-sm text-slate-900 dark:text-white focus:outline-none font-mono transition-all ${errors.phone
                          ? 'border-rose-500/80 shadow-[0_0_10px_rgba(244,63,94,0.15)] focus:border-rose-400'
                          : field.value
                            ? 'border-teal-500/80 shadow-[0_0_10px_rgba(20,184,166,0.15)] focus:border-teal-400'
                            : 'border-slate-300 dark:border-slate-800 focus:border-blue-500'
                        }`}
                    />
                  )}
                />
                {errors.phone && <p className="text-rose-700 dark:text-rose-500 text-xs mt-0.5">{errors.phone.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Micro Área de Trabalho
                </label>
                <Controller
                  name="microArea"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      placeholder="Ex: 01 ou Centro A"
                      className={`w-full px-3 py-2 bg-white dark:bg-slate-950 border rounded-md text-sm text-slate-900 dark:text-white focus:outline-none transition-all ${errors.microArea
                          ? 'border-rose-500/80 shadow-[0_0_10px_rgba(244,63,94,0.15)] focus:border-rose-400'
                          : field.value
                            ? 'border-teal-500/80 shadow-[0_0_10px_rgba(20,184,166,0.15)] focus:border-teal-400'
                            : 'border-slate-300 dark:border-slate-800 focus:border-blue-500'
                        }`}
                    />
                  )}
                />
                {errors.microArea && <p className="text-rose-700 dark:text-rose-500 text-xs mt-0.5">{errors.microArea.message}</p>}
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-300 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAcsModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-850 hover:bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 rounded-md text-xs font-semibold transition-all cursor-pointer shadow-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isAcsPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold transition-all duration-300 active:scale-95 disabled:opacity-50 cursor-pointer shadow-md"
                >
                  {isAcsPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{editingAcs ? 'Salvar Alterações' : 'Cadastrar Agente'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Modal for ACS Transfer */}
      {isTransferModalOpen && transferringAcs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-2xl p-6 space-y-5">
            {/* Close Button */}
            <button
              onClick={() => {
                setIsTransferModalOpen(false);
                setTransferringAcs(null);
              }}
              className="absolute right-4 top-4 text-slate-500 hover:text-slate-900 dark:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <span>Transferir Agente de Saúde</span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Selecione a nova Unidade Básica de Saúde para a qual deseja transferir o(a) agente <strong className="text-slate-700 dark:text-slate-200">{transferringAcs.name}</strong>.
              </p>
            </div>

            <form onSubmit={handleTransferAcsSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Unidade de Destino
                </label>
                <select
                  value={selectedTargetCenterId}
                  onChange={(e) => setSelectedTargetCenterId(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer shadow-md"
                  disabled={isLoadingCenters}
                >
                  <option value="">Selecione uma UBS...</option>
                  {healthCentersData?.data
                    ?.filter((center: any) => center.id !== healthCenter.id)
                    ?.map((center: any) => (
                      <option key={center.id} value={center.id}>
                        {center.name} {center.cnes ? `(CNES: ${center.cnes})` : ''}
                      </option>
                    ))}
                </select>
                {isLoadingCenters && (
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Carregando unidades...</span>
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-300 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsTransferModalOpen(false);
                    setTransferringAcs(null);
                  }}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-850 hover:bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 rounded-md text-xs font-semibold transition-all cursor-pointer shadow-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updateAcsMutation.isPending || !selectedTargetCenterId}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold transition-all duration-300 active:scale-95 disabled:opacity-50 cursor-pointer shadow-md"
                >
                  {updateAcsMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Transferindo...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirmar Transferência</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
