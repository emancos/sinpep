import React, { useState } from 'react';
import { useConfirm } from '../../contexts/ConfirmContext';
import { toast } from 'sonner';
import {
    useSpecialties,
    useCreateSpecialty,
    useUpdateSpecialty,
    useDeleteSpecialty,
    useToggleSpecialtyActive
} from '../../hooks/useSpecialties';
import {
    useProcedureGroups,
    useCreateProcedureGroup,
    useUpdateProcedureGroup,
    useDeleteProcedureGroup,
    useToggleProcedureGroupActive
} from '../../hooks/useProcedures';
import {
    Search,
    Plus,
    Loader2,
    AlertCircle,
    Award,
    Layers,
    Edit2,
    Trash2,
    X,
    Check,
    Power
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export const AuxiliaryTables: React.FC = () => {
    const confirm = useConfirm();
    const [activeTab, setActiveTab] = useState<'specialties' | 'groups'>('specialties');

    // Search States
    const [specialtySearch, setSpecialtySearch] = useState('');
    const [groupSearch, setGroupSearch] = useState('');
    const [showInactiveSpecialties, setShowInactiveSpecialties] = useState(false);
    const [showInactiveGroups, setShowInactiveGroups] = useState(false);

    const userPermissions = useAuthStore(state => state.permissions);

    // Modal / Form States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'specialty_create' | 'specialty_edit' | 'group_create' | 'group_edit' | 'sync_sisreg'>('specialty_create');

    // Form Values
    const [selectedId, setSelectedId] = useState('');
    const [nameVal, setNameVal] = useState('');
    const [descVal, setDescVal] = useState('');

    // Queries
    const { data: specialties, isLoading: loadingSpecialties, isError: errSpecialties } = useSpecialties(showInactiveSpecialties);
    const { data: groups, isLoading: loadingGroups, isError: errGroups } = useProcedureGroups(showInactiveGroups);

    // Mutations
    const createSpecialty = useCreateSpecialty();
    const updateSpecialty = useUpdateSpecialty();
    const deleteSpecialty = useDeleteSpecialty();

    const createGroup = useCreateProcedureGroup();
    const updateGroup = useUpdateProcedureGroup();
    const deleteGroup = useDeleteProcedureGroup();

    const toggleSpecialtyActive = useToggleSpecialtyActive();
    const toggleGroupActive = useToggleProcedureGroupActive();

    // Open Modals
    const handleOpenCreateSpecialty = () => {
        setNameVal('');
        setDescVal('');
        setModalType('specialty_create');
        setIsModalOpen(true);
    };

    const handleOpenEditSpecialty = (spec: { id: string; name: string; description?: string | null }) => {
        setSelectedId(spec.id);
        setNameVal(spec.name);
        setDescVal(spec.description || '');
        setModalType('specialty_edit');
        setIsModalOpen(true);
    };

    const handleOpenCreateGroup = () => {
        setNameVal('');
        setModalType('group_create');
        setIsModalOpen(true);
    };

    const handleOpenEditGroup = (grp: { id: string; name: string }) => {
        setSelectedId(grp.id);
        setNameVal(grp.name);
        setModalType('group_edit');
        setIsModalOpen(true);
    };



    // Submit Handlers
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = nameVal.trim();

        if (modalType === 'specialty_create') {
            if (!name) { toast.error('O nome é obrigatório.'); return; }
            createSpecialty.mutate(
                { name: name.toUpperCase(), description: descVal.trim() || undefined },
                {
                    onSuccess: () => {
                        toast.success('Especialidade criada com sucesso!');
                        setIsModalOpen(false);
                    },
                    onError: () => toast.error('Erro ao criar especialidade.')
                }
            );
        } else if (modalType === 'specialty_edit') {
            if (!name) { toast.error('O nome é obrigatório.'); return; }
            updateSpecialty.mutate({ id: selectedId, name: name.toUpperCase(), description: descVal.trim() || undefined },
                {
                    onSuccess: () => {
                        toast.success('Especialidade atualizada com sucesso!');
                        setIsModalOpen(false);
                    },
                    onError: () => toast.error('Erro ao atualizar especialidade.')
                }
            );
        } else if (modalType === 'group_create') {
            if (!name) { toast.error('O nome é obrigatório.'); return; }
            createGroup.mutate(
                { name: name.toUpperCase() },
                {
                    onSuccess: () => {
                        toast.success('Grupo de procedimento criado com sucesso!');
                        setIsModalOpen(false);
                    },
                    onError: () => toast.error('Erro ao criar grupo de procedimento.')
                }
            );
        } else if (modalType === 'group_edit') {
            if (!name) { toast.error('O nome é obrigatório.'); return; }
            updateGroup.mutate(
                { id: selectedId, data: { name: name.toUpperCase() } },
                {
                    onSuccess: () => {
                        toast.success('Grupo de procedimento atualizado com sucesso!');
                        setIsModalOpen(false);
                    },
                    onError: (err: any) => {
                        toast.error(err.message || 'Erro ao atualizar grupo.');
                    }
                }
            );
        }
    };

    // Delete Handlers
    const handleDeleteSpecialty = async (id: string, name: string) => {
        const isConfirmed = await confirm({
            title: 'Excluir Definitivamente',
            description: `Deseja realmente excluir a especialidade "${name}" DEFINITIVAMENTE? Excluir especialidades associadas a médicos existentes pode causar inconsistências.`,
            confirmText: 'Excluir',
            cancelText: 'Cancelar',
            variant: 'danger'
        });

        if (isConfirmed) {
            deleteSpecialty.mutate(id, {
                onSuccess: () => toast.success('Especialidade excluída com sucesso!'),
                onError: () => toast.error('Erro ao excluir especialidade. Ela pode estar vinculada a algum médico.')
            });
        }
    };

    const handleDeleteGroup = async (id: string, name: string) => {
        const isConfirmed = await confirm({
            title: 'Excluir Definitivamente',
            description: `Deseja realmente excluir o grupo "${name}" DEFINITIVAMENTE? Excluir grupos vinculados a procedimentos ativos pode causar inconsistências.`,
            confirmText: 'Excluir',
            cancelText: 'Cancelar',
            variant: 'danger'
        });

        if (isConfirmed) {
            deleteGroup.mutate(id, {
                onSuccess: () => toast.success('Grupo excluído com sucesso!'),
                onError: () => toast.error('Erro ao excluir grupo. Ele pode estar vinculado a algum procedimento cadastrado.')
            });
        }
    };

    const handleToggleSpecialtyActive = async (id: string, currentActive: boolean) => {
        const actionName = currentActive ? 'Desabilitar' : 'Habilitar';
        const isConfirmed = await confirm({
            title: `${actionName} Especialidade`,
            description: `Deseja realmente ${actionName.toLowerCase()} esta especialidade?`,
            confirmText: actionName,
            cancelText: 'Cancelar',
            variant: currentActive ? 'danger' : 'info'
        });

        if (isConfirmed) {
            toggleSpecialtyActive.mutate(id, {
                onSuccess: () => toast.success(`Especialidade ${currentActive ? 'desabilitada' : 'habilitada'} com sucesso!`),
                onError: () => toast.error(`Erro ao ${actionName.toLowerCase()} especialidade.`)
            });
        }
    };

    const handleToggleGroupActive = async (id: string, currentActive: boolean) => {
        const actionName = currentActive ? 'Desabilitar' : 'Habilitar';
        const isConfirmed = await confirm({
            title: `${actionName} Grupo`,
            description: `Deseja realmente ${actionName.toLowerCase()} este grupo?`,
            confirmText: actionName,
            cancelText: 'Cancelar',
            variant: currentActive ? 'danger' : 'info'
        });

        if (isConfirmed) {
            toggleGroupActive.mutate(id, {
                onSuccess: () => toast.success(`Grupo ${currentActive ? 'desabilitado' : 'habilitado'} com sucesso!`),
                onError: () => toast.error(`Erro ao ${actionName.toLowerCase()} grupo.`)
            });
        }
    };

    // Filtered Lists
    const filteredSpecialties = specialties?.data?.filter((spec: any) =>
        spec.name.toLowerCase().includes(specialtySearch.toLowerCase()) ||
        (spec.description && spec.description.toLowerCase().includes(specialtySearch.toLowerCase()))
    ) || [];

    const filteredGroups = groups?.filter((grp: any) =>
        grp.name.toLowerCase().includes(groupSearch.toLowerCase())
    ) || [];

    const isMutationPending =
        createSpecialty.isPending ||
        updateSpecialty.isPending ||
        createGroup.isPending ||
        updateGroup.isPending;

    return (
        <div className="space-y-6 font-sans">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Tabelas Auxiliares</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gerenciamento dos grupos taxonômicos e especialidades do sistema</p>
            </div>

            {/* Tabs Switcher */}
            <div className="flex border-b border-slate-300 dark:border-slate-800 gap-4">
                <button
                    onClick={() => setActiveTab('specialties')}
                    className={`pb-3 text-sm font-semibold transition-all relative cursor-pointer ${activeTab === 'specialties' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200'
                        }`}
                >
                    <div className="flex items-center gap-2 px-1">
                        <Award className="w-4 h-4" />
                        <span>Especialidades Médicas</span>
                    </div>
                    {activeTab === 'specialties' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
                    )}
                </button>

                <button
                    onClick={() => setActiveTab('groups')}
                    className={`pb-3 text-sm font-semibold transition-all relative cursor-pointer ${activeTab === 'groups' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200'
                        }`}
                >
                    <div className="flex items-center gap-2 px-1">
                        <Layers className="w-4 h-4" />
                        <span>Grupos de Procedimentos</span>
                    </div>
                    {activeTab === 'groups' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
                    )}
                </button>
            </div>

            {/* Content specialties */}
            {activeTab === 'specialties' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Controls */}
                    <div className="bg-white shadow-md dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 backdrop-blur-md flex flex-col sm:flex-row items-center gap-4">
                        <div className="relative w-full sm:max-w-md">
                            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Buscar especialidades..."
                                value={specialtySearch}
                                onChange={(e) => setSpecialtySearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/80 transition-all text-sm"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:text-slate-200 transition-colors">
                                <div className="relative inline-flex items-center">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={showInactiveSpecialties}
                                        onChange={(e) => setShowInactiveSpecialties(e.target.checked)}
                                    />
                                    <div className="w-9 h-5 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 peer-checked:after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                                </div>
                                <span>Mostrar desabilitadas</span>
                            </label>
                        </div>
                        <button
                            onClick={handleOpenCreateSpecialty}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition-all duration-300 shadow-md active:scale-95 cursor-pointer ml-auto w-full sm:w-auto justify-center"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Nova Especialidade</span>
                        </button>
                    </div>

                    {/* Loading / Error States */}
                    {loadingSpecialties && (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                            <Loader2 className="w-10 h-10 text-blue-700 dark:text-blue-500 animate-spin" />
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">'Carregando...'</p>
                        </div>
                    )}

                    {errSpecialties && (
                        <div className="flex items-center gap-3 p-4 bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl max-w-xl mx-auto">
                            <AlertCircle className="w-6 h-6 shrink-0" />
                            <div>
                                <h4 className="font-semibold">'Erro ao carregar'</h4>
                                <p className="text-xs text-red-600 dark:text-red-400/80 mt-0.5">Erro ao carregar lista de especialidades.</p>
                            </div>
                        </div>
                    )}

                    {/* Specialties Table */}
                    {!loadingSpecialties && !errSpecialties && (
                        <div className="bg-white shadow-md dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-left">
                                    <thead>
                                        <tr className="border-b border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                                            <th className="px-6 py-4">Nome da Especialidade</th>
                                            <th className="px-6 py-4">Descrição / Observações</th>
                                            <th className="px-6 py-4 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-sm">
                                        {filteredSpecialties.length > 0 ? (
                                            filteredSpecialties.map((spec: any) => (
                                                <tr key={spec.id} className="hover:bg-slate-200 dark:bg-slate-800/20 transition-colors duration-150 group">
                                                    <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <Award className={`w-4 h-4 ${spec.isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`} />
                                                            <div className="flex flex-col">
                                                                <span className={spec.isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 line-through'}>{spec.name}</span>
                                                                {!spec.isActive && <span className="text-[10px] text-rose-600 dark:text-rose-400/80 font-bold uppercase mt-0.5">Desabilitada</span>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-350 max-w-xs truncate">
                                                        {spec.description || <span className="text-slate-650 italic">Sem descrição</span>}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => handleOpenEditSpecialty(spec)}
                                                                className="p-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-100 dark:bg-blue-500/10 hover:bg-blue-200 dark:hover:bg-blue-500/20 border border-blue-200 dark:border-blue-500/20 rounded-lg transition-all cursor-pointer shadow-md disabled:opacity-50"
                                                                title="Editar"
                                                                disabled={!userPermissions.includes('specialties:write') && !userPermissions.includes('admin:access')}
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>

                                                            {(userPermissions.includes('specialties:write') || userPermissions.includes('admin:access')) && (
                                                                <button
                                                                    onClick={() => handleToggleSpecialtyActive(spec.id, spec.isActive)}
                                                                    className={`p-1 border rounded-lg transition-all cursor-pointer ${spec.isActive
                                                                            ? 'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 bg-amber-100 dark:bg-amber-500/10 hover:bg-amber-200 dark:hover:bg-amber-500/20 border-amber-200 dark:border-amber-500/20'
                                                                            : 'text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 bg-teal-100 dark:bg-teal-500/10 hover:bg-teal-200 dark:hover:bg-teal-500/20 border-teal-200 dark:border-teal-500/20'
                                                                        }`}
                                                                    title={spec.isActive ? "Desabilitar" : "Habilitar"}
                                                                >
                                                                    <Power className="w-4 h-4" />
                                                                </button>
                                                            )}

                                                            {userPermissions.includes('admin:access') && (
                                                                <button
                                                                    onClick={() => handleDeleteSpecialty(spec.id, spec.name)}
                                                                    className="p-1.5 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 bg-rose-100 dark:bg-rose-500/10 hover:bg-rose-200 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/20 rounded-lg transition-all cursor-pointer shadow-md"
                                                                    title="Excluir Definitivamente"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={3} className="px-6 py-10 text-center text-slate-505 italic">
                                                    Nenhuma especialidade encontrada.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Content procedure groups */}
            {activeTab === 'groups' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Controls */}
                    <div className="bg-white shadow-md dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 backdrop-blur-md flex flex-col sm:flex-row items-center gap-4">
                        <div className="relative w-full sm:max-w-md">
                            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Buscar grupos de procedimentos..."
                                value={groupSearch}
                                onChange={(e) => setGroupSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/80 transition-all text-sm"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:text-slate-200 transition-colors">
                                <div className="relative inline-flex items-center">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={showInactiveGroups}
                                        onChange={(e) => setShowInactiveGroups(e.target.checked)}
                                    />
                                    <div className="w-9 h-5 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 peer-checked:after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                                </div>
                                <span>Mostrar desabilitados</span>
                            </label>
                        </div>

                        {(userPermissions.includes('procedure-groups:write') || userPermissions.includes('admin:access')) && (
                            <div className="flex gap-2 w-full sm:w-auto">

                                <button
                                    onClick={handleOpenCreateGroup}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition-all duration-300 shadow-md active:scale-95 cursor-pointer flex-1 sm:flex-none justify-center"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Novo Grupo</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Loading / Error States */}
                    {loadingGroups && (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                            <Loader2 className="w-10 h-10 text-blue-700 dark:text-blue-500 animate-spin" />
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">'Carregando...'</p>
                        </div>
                    )}

                    {errGroups && (
                        <div className="flex items-center gap-3 p-4 bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl max-w-xl mx-auto">
                            <AlertCircle className="w-6 h-6 shrink-0" />
                            <div>
                                <h4 className="font-semibold">'Erro ao carregar'</h4>
                                <p className="text-xs text-red-600 dark:text-red-400/80 mt-0.5">Erro ao carregar lista de grupos de procedimentos.</p>
                            </div>
                        </div>
                    )}

                    {/* Groups Table */}
                    {!loadingGroups && !errGroups && (
                        <div className="bg-white shadow-md dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-left">
                                    <thead>
                                        <tr className="border-b border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                                            <th className="px-6 py-4">Nome do Grupo</th>
                                            <th className="px-6 py-4">Qtd. Itens Selecionáveis</th>
                                            <th className="px-6 py-4 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-sm">
                                        {filteredGroups.length > 0 ? (
                                            filteredGroups.map((grp) => (
                                                <tr key={grp.id} className="hover:bg-slate-200 dark:bg-slate-800/20 transition-colors duration-150 group">
                                                    <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <Layers className={`w-4 h-4 ${grp.isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`} />
                                                            <div className="flex flex-col">
                                                                <span className={grp.isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 line-through'}>{grp.name}</span>
                                                                {!grp.isActive && <span className="text-[10px] text-rose-600 dark:text-rose-400/80 font-bold uppercase mt-0.5">Desabilitado</span>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {/* maxItems was moved to variants */}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => handleOpenEditGroup(grp)}
                                                                className="p-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-100 dark:bg-blue-500/10 hover:bg-blue-200 dark:hover:bg-blue-500/20 border border-blue-200 dark:border-blue-500/20 rounded-lg transition-all cursor-pointer shadow-md disabled:opacity-50"
                                                                title="Editar"
                                                                disabled={!userPermissions.includes('procedure-groups:write') && !userPermissions.includes('admin:access')}
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>

                                                            {(userPermissions.includes('procedure-groups:write') || userPermissions.includes('admin:access')) && (
                                                                <button
                                                                    onClick={() => handleToggleGroupActive(grp.id, grp.isActive)}
                                                                    className={`p-1 border rounded-lg transition-all cursor-pointer ${grp.isActive
                                                                            ? 'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 bg-amber-100 dark:bg-amber-500/10 hover:bg-amber-200 dark:hover:bg-amber-500/20 border-amber-200 dark:border-amber-500/20'
                                                                            : 'text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 bg-teal-100 dark:bg-teal-500/10 hover:bg-teal-200 dark:hover:bg-teal-500/20 border-teal-200 dark:border-teal-500/20'
                                                                        }`}
                                                                    title={grp.isActive ? "Desabilitar" : "Habilitar"}
                                                                >
                                                                    <Power className="w-4 h-4" />
                                                                </button>
                                                            )}

                                                            {userPermissions.includes('admin:access') && (
                                                                <button
                                                                    onClick={() => handleDeleteGroup(grp.id, grp.name)}
                                                                    className="p-1.5 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 bg-rose-100 dark:bg-rose-500/10 hover:bg-rose-200 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/20 rounded-lg transition-all cursor-pointer shadow-md"
                                                                    title="Excluir Definitivamente"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={3} className="px-6 py-10 text-center text-slate-505 italic">
                                                    Nenhum grupo encontrado.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* CRUD Overlay Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in relative">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute right-4 top-4 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <form onSubmit={handleSave} className="p-6 space-y-4 font-sans">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight border-b border-slate-300 dark:border-slate-800 pb-3">
                                {modalType === 'specialty_create' && 'Nova Especialidade'}
                                {modalType === 'specialty_edit' && 'Editar Especialidade'}
                                {modalType === 'group_create' && 'Novo Grupo de Procedimento'}
                                {modalType === 'group_edit' && 'Editar Grupo de Procedimento'}
                                {modalType === 'sync_sisreg' && 'Sincronizar Catálogo SISREG'}
                            </h3>

                            <div className="space-y-3">
                                {modalType === 'sync_sisreg' ? (
                                    <div className="space-y-1">
                                        <div className="p-3 mb-4 rounded-xl bg-amber-100 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs leading-relaxed flex items-start gap-2">
                                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                            <p>Aviso: Este processo apaga as antigas Variantes de Procedimentos e atualiza toda a base. Para continuar, insira um CPF válido.</p>
                                        </div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            CPF (Apenas números)
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={''}
                                            onChange={() => {}}
                                            placeholder="12345678901"
                                            maxLength={11}
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500 transition-all text-sm font-medium"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-1">
                                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                Nome
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={nameVal}
                                                onChange={(e) => setNameVal(e.target.value)}
                                                placeholder="Ex: Cardiologia"
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500 transition-all text-sm font-medium"
                                            />
                                        </div>

                                        {(modalType === 'specialty_create' || modalType === 'specialty_edit') && (
                                            <div className="space-y-1">
                                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                    Descrição (Opcional)
                                                </label>
                                                <textarea
                                                    value={descVal}
                                                    onChange={(e) => setDescVal(e.target.value)}
                                                    placeholder="Descrição ou observações adicionais..."
                                                    rows={3}
                                                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500 transition-all text-sm font-medium resize-none"
                                                />
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            <div className="flex gap-3 justify-end pt-4 border-t border-slate-200 dark:border-slate-850">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 border border-slate-805 bg-slate-200 dark:bg-slate-850 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium rounded-xl text-xs transition-all active:scale-95 cursor-pointer shadow-md"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isMutationPending}
                                    className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-xs transition-all duration-300 shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                                >
                                    {isMutationPending ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Check className="w-3.5 h-3.5" />
                                    )}
                                    <span>{modalType === 'sync_sisreg' ? 'Sincronizar' : 'Salvar'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
