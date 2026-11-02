import React, { useState, useEffect } from 'react';
import {
    useProcedures,
    useProcedureGroups,
    useDeleteProcedureGroup,
    useToggleProcedureGroupActive,
    useDeleteProcedure,
    useToggleProcedureActive
} from '../../hooks/useProcedures';
import { useConfirm } from '../../contexts/ConfirmContext';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
    Search,
    Plus,
    Loader2,
    AlertCircle,
    Activity,
    Layers,
    Trash2,
    Power,
    Edit2,
    FileText,
    Divide,
    Database,
    ChevronRight,
    FolderKanban
} from 'lucide-react';
import { TablePagination } from '../../components/TablePagination';
import { useAuthStore } from '../../store/useAuthStore';
import { ProcedureIntegraSusForm } from './ProcedureIntegraSusForm';
import { ProcedureQuotasManager } from './ProcedureQuotasManager';
import { PreparationEditor } from './PreparationEditor';
import { GroupProceduresView } from './GroupProceduresView';
import { GroupCreateIntegraSusModal } from './GroupCreateIntegraSusModal';

type TabType = 'procedures' | 'groups' | 'integra-sus' | 'quotas' | 'preparation' | 'group-view';

export const ProceduresList: React.FC = () => {
    const confirm = useConfirm();
    const [searchParams] = useSearchParams();
    const userPermissions = useAuthStore(state => state.permissions);
    const canWrite = userPermissions.includes('procedures:write') || userPermissions.includes('admin:access');

    // Tab state from URL query or default
    const initialTab = (searchParams.get('tab') as TabType) || 'procedures';
    const [activeTab, setActiveTab] = useState<TabType>(initialTab);

    // Selected items for context switching
    const [selectedProcedureId, setSelectedProcedureId] = useState<string>(searchParams.get('procId') || '');
    const [selectedGroupId, setSelectedGroupId] = useState<string>(searchParams.get('groupId') || '');
    const [selectedGroupName, setSelectedGroupName] = useState<string>('');

    // --- State for Procedures Tab ---
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [sortBy, setSortBy] = useState('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [showInactive, setShowInactive] = useState(false);
    const [selectedFilterGroup, setSelectedFilterGroup] = useState<string>('');

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(1);
        }, 300);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    // Queries
    const { data: proceduresData, isLoading: loadingProcedures, isError: errProcedures } = useProcedures({
        page,
        limit,
        sortBy,
        sortOrder,
        search: debouncedSearch,
        includeInactive: showInactive,
        procedureGroupId: selectedFilterGroup || undefined,
    });

    const { data: groups } = useProcedureGroups(true);

    // Mutations
    const deleteProcedureMutation = useDeleteProcedure();
    const toggleActiveMutation = useToggleProcedureActive();
    const deleteGroupMutation = useDeleteProcedureGroup();
    const toggleGroupActiveMutation = useToggleProcedureGroupActive();

    // Group Modal states
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<{ id: string; name: string } | null>(null);
    const [showOnlyActiveGroups, setShowOnlyActiveGroups] = useState(false);

    const handleSort = (field: string) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
        setPage(1);
    };

    const handleDeleteProcedure = async (id: string, name: string, isGroupLinked?: boolean) => {
        if (isGroupLinked) {
            toast.error('Procedimentos vinculados a um grupo não podem ser excluídos, apenas desativados.');
            return;
        }

        const isConfirmed = await confirm({
            title: 'Excluir Procedimento',
            description: `Deseja realmente excluir definitivamente o procedimento "${name}"?`,
            confirmText: 'Excluir',
            cancelText: 'Cancelar',
            variant: 'danger'
        });

        if (isConfirmed) {
            deleteProcedureMutation.mutate(id, {
                onSuccess: () => toast.success('Procedimento excluído com sucesso!'),
                onError: (err: any) => toast.error(err?.response?.data?.message || 'Erro ao excluir procedimento.')
            });
        }
    };

    const handleToggleActiveProcedure = async (id: string, currentActive: boolean, name: string) => {
        const action = currentActive ? 'desativar' : 'ativar';
        const isConfirmed = await confirm({
            title: `${currentActive ? 'Desativar' : 'Ativar'} Procedimento`,
            description: `Deseja realmente ${action} o procedimento "${name}"?`,
            confirmText: currentActive ? 'Desativar' : 'Ativar',
            cancelText: 'Cancelar',
            variant: currentActive ? 'danger' : 'info'
        });

        if (isConfirmed) {
            toggleActiveMutation.mutate(id, {
                onSuccess: () => toast.success(`Procedimento ${currentActive ? 'desativado' : 'ativado'} com sucesso!`),
                onError: () => toast.error(`Erro ao ${action} procedimento.`)
            });
        }
    };

    // Group Actions
    const handleOpenCreateGroup = () => {
        setEditingGroup(null);
        setIsGroupModalOpen(true);
    };

    const handleOpenEditGroup = (g: { id: string; name: string }) => {
        setEditingGroup(g);
        setIsGroupModalOpen(true);
    };

    const handleDeleteGroup = async (id: string, name: string) => {
        const confirmed = await confirm({
            title: 'Excluir Grupo e Procedimentos',
            description: `Deseja realmente excluir definitivamente o grupo "${name}" e TODOS os procedimentos vinculados a ele? Esta ação é irreversível.`,
            confirmText: 'Excluir Grupo e Procedimentos',
            cancelText: 'Cancelar',
            variant: 'danger'
        });
        if (confirmed) {
            deleteGroupMutation.mutate(id, {
                onSuccess: () => toast.success('Grupo e todos os procedimentos vinculados foram excluídos com sucesso!'),
                onError: () => toast.error('Erro ao excluir grupo.')
            });
        }
    };

    const handleToggleActiveGroup = async (id: string, name: string, currentActive: boolean) => {
        const action = currentActive ? 'desativar' : 'ativar';
        const description = currentActive
            ? `Deseja realmente desativar o grupo "${name}"? Todos os procedimentos vinculados a este grupo serão desativados automaticamente.`
            : `Deseja realmente ativar o grupo "${name}"?`;

        const confirmed = await confirm({
            title: `${currentActive ? 'Desativar' : 'Ativar'} Grupo de Procedimentos`,
            description,
            confirmText: currentActive ? 'Desativar Grupo e Procedimentos' : 'Ativar Grupo',
            cancelText: 'Cancelar',
            variant: currentActive ? 'danger' : 'info'
        });
        if (confirmed) {
            toggleGroupActiveMutation.mutate(id, {
                onSuccess: () => {
                    toast.success(
                        currentActive
                            ? `Grupo "${name}" e todos os procedimentos vinculados foram desativados!`
                            : `Grupo "${name}" ativado com sucesso!`
                    );
                },
                onError: () => toast.error(`Erro ao ${action} grupo.`)
            });
        }
    };

    const handleOpenGroupView = (grp: { id: string; name: string }) => {
        setSelectedGroupId(grp.id);
        setSelectedGroupName(grp.name);
        setActiveTab('group-view');
    };

    const handleOpenPreparation = (procId: string) => {
        setSelectedProcedureId(procId);
        setActiveTab('preparation');
    };

    const handleOpenQuotas = (procId: string) => {
        setSelectedProcedureId(procId);
        setActiveTab('quotas');
    };

    const handleOpenEditProcedure = (procId: string) => {
        setSelectedProcedureId(procId);
        setActiveTab('integra-sus');
    };

    return (
        <div className="space-y-6">
            {/* Header Geral do Hub */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <FolderKanban className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                        Central de Procedimentos & Cotas
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Gerenciamento unificado de procedimentos, grupos, integração SIGTAP, matriz de cotas e preparos clínicos
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedProcedureId('');
                            setActiveTab('integra-sus');
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Novo Procedimento
                    </button>
                </div>
            </div>

            {/* Navigation Tabs Bar */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('procedures')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${activeTab === 'procedures'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                        }`}
                >
                    <Activity className="w-4 h-4" />
                    Procedimentos
                </button>

                <button
                    onClick={() => setActiveTab('groups')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${activeTab === 'groups'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                        }`}
                >
                    <Layers className="w-4 h-4" />
                    Grupos de Procedimentos
                </button>

                <button
                    onClick={() => {
                        setSelectedProcedureId('');
                        setActiveTab('integra-sus');
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${activeTab === 'integra-sus'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                        }`}
                >
                    <Database className="w-4 h-4" />
                    Importação INTEGRA SUS
                </button>

                <button
                    onClick={() => setActiveTab('quotas')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${activeTab === 'quotas'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                        }`}
                >
                    <Divide className="w-4 h-4" />
                    Matriz de Cotas
                </button>

                {activeTab === 'preparation' && (
                    <button
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 whitespace-nowrap cursor-pointer"
                    >
                        <FileText className="w-4 h-4" />
                        Editor de Preparo
                    </button>
                )}

                {activeTab === 'group-view' && (
                    <button
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 whitespace-nowrap cursor-pointer"
                    >
                        <Layers className="w-4 h-4" />
                        Visão do Grupo: {selectedGroupName}
                    </button>
                )}
            </div>

            {/* TAB 1: PROCEDIMENTOS */}
            {activeTab === 'procedures' && (
                <div className="space-y-4">
                    {/* Barra de Filtros */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
                        <div className="flex flex-1 flex-col sm:flex-row gap-3 w-full">
                            {/* Input de Busca */}
                            <div className="relative flex-1">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Buscar por código ou nome do procedimento..."
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            {/* Filtro por Grupo */}
                            <select
                                value={selectedFilterGroup}
                                onChange={(e) => { setSelectedFilterGroup(e.target.value); setPage(1); }}
                                className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 min-w-[200px]"
                            >
                                <option value="">Todos os Grupos</option>
                                {(groups || []).filter(g => g.isActive).map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </div>

                        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer self-start md:self-auto shrink-0">
                            <input
                                type="checkbox"
                                checked={showInactive}
                                onChange={(e) => setShowInactive(e.target.checked)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            Exibir inativos
                        </label>
                    </div>

                    {/* Tabela de Procedimentos */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
                        {loadingProcedures ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                <span className="text-sm">Carregando procedimentos...</span>
                            </div>
                        ) : errProcedures ? (
                            <div className="py-16 flex flex-col items-center justify-center gap-2 text-rose-500">
                                <AlertCircle className="w-8 h-8" />
                                <span className="text-sm">Erro ao carregar procedimentos.</span>
                            </div>
                        ) : proceduresData?.data?.length === 0 ? (
                            <div className="py-16 text-center text-slate-400 text-sm">
                                Nenhum procedimento encontrado.
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-200 dark:border-slate-800">
                                            <tr>
                                                <th onClick={() => handleSort('code')} className="px-4 py-3 cursor-pointer hover:text-blue-600">
                                                    Código
                                                </th>
                                                <th onClick={() => handleSort('name')} className="px-4 py-3 cursor-pointer hover:text-blue-600">
                                                    Procedimento
                                                </th>
                                                <th className="px-4 py-3">Grupo</th>
                                                <th className="px-4 py-3 text-center">Regulação</th>
                                                <th className="px-4 py-3 text-center">Status</th>
                                                <th className="px-4 py-3 text-right">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {(proceduresData?.data || []).map((proc) => (
                                                <tr key={proc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors">
                                                    <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-600 dark:text-slate-300">
                                                        {proc.code || '-'}
                                                    </td>
                                                    <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-white">
                                                        <span className="block">{proc.name}</span>
                                                        <span className="block text-[11px] text-slate-400 font-normal">
                                                            Idade: {proc.minAge} a {proc.maxAge} anos • Sexo: {proc.genderAllowed}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-400">
                                                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium">
                                                            {proc.procedureGroup?.name || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-center">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${proc.requiresRegulation !== false
                                                                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                                                                : 'bg-slate-100 text-slate-500'
                                                            }`}>
                                                            {proc.requiresRegulation !== false ? 'Exige' : 'Dispensada'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-center">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${proc.isActive
                                                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                                            }`}>
                                                            {proc.isActive ? 'Ativo' : 'Inativo'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {/* Atalho Preparo */}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenPreparation(proc.id)}
                                                                className="p-1.5 rounded hover:bg-amber-50 dark:hover:bg-amber-950/50 text-slate-500 hover:text-amber-600 transition-colors"
                                                                title="Editar Instruções de Preparo"
                                                            >
                                                                <FileText className="w-4 h-4" />
                                                            </button>

                                                            {/* Atalho Cotas */}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenQuotas(proc.id)}
                                                                className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-950/50 text-slate-500 hover:text-blue-600 transition-colors"
                                                                title="Gerenciar Cotas Mensais"
                                                            >
                                                                <Divide className="w-4 h-4" />
                                                            </button>

                                                            {/* Editar */}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenEditProcedure(proc.id)}
                                                                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-blue-600 transition-colors"
                                                                title="Editar Procedimento"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>

                                                            {/* Toggle Ativo */}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleActiveProcedure(proc.id, proc.isActive, proc.name)}
                                                                className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${proc.isActive ? 'text-amber-500 hover:text-amber-600' : 'text-emerald-500 hover:text-emerald-600'
                                                                    }`}
                                                                title={proc.isActive ? 'Desativar' : 'Ativar'}
                                                            >
                                                                <Power className="w-4 h-4" />
                                                            </button>

                                                            {/* Excluir (Bloqueado se vinculado a grupo) */}
                                                            <button
                                                                type="button"
                                                                disabled={!!proc.procedureGroupId}
                                                                onClick={() => handleDeleteProcedure(proc.id, proc.name, !!proc.procedureGroupId)}
                                                                className={`p-1.5 rounded transition-colors ${
                                                                    proc.procedureGroupId
                                                                        ? 'opacity-30 cursor-not-allowed text-slate-400 dark:text-slate-600'
                                                                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-rose-600'
                                                                }`}
                                                                title={
                                                                    proc.procedureGroupId
                                                                        ? 'Procedimentos vinculados a um grupo não podem ser excluídos, apenas desativados.'
                                                                        : 'Excluir Procedimento'
                                                                }
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="p-3 border-t border-slate-200 dark:border-slate-800">
                                    <TablePagination
                                        page={page}
                                        limit={limit}
                                        total={proceduresData?.total || 0}
                                        onPageChange={setPage}
                                        onLimitChange={(newLimit: number) => { setLimit(newLimit); setPage(1); }}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: GRUPOS DE PROCEDIMENTOS */}
            {activeTab === 'groups' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm">
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                Grupos de Procedimentos & Exames
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Agrupamentos clínicos para filtros de regulação, cotas e habilitação nos serviços executantes
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Opção para listar apenas grupos ativos */}
                            <label className="flex items-center gap-2 cursor-pointer select-none bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={showOnlyActiveGroups}
                                    onChange={(e) => setShowOnlyActiveGroups(e.target.checked)}
                                    className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                />
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    Listar apenas grupos ativos
                                </span>
                            </label>

                            {canWrite && (
                                <button
                                    type="button"
                                    onClick={handleOpenCreateGroup}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
                                >
                                    <Plus className="w-4 h-4" />
                                    Novo Grupo
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(groups || []).filter(grp => showOnlyActiveGroups ? grp.isActive : true).map((grp) => (
                            <div
                                key={grp.id}
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm space-y-4 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
                                            <Layers className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white text-base">
                                                {grp.name}
                                            </h4>
                                            <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded mt-0.5 ${grp.isActive
                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                                                    : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                {grp.isActive ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </div>
                                    </div>

                                    {canWrite && (
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => handleOpenEditGroup(grp)}
                                                className="p-1 rounded text-slate-400 hover:text-blue-600"
                                                title="Editar Nome do Grupo"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleToggleActiveGroup(grp.id, grp.name, grp.isActive)}
                                                className={`p-1 rounded ${grp.isActive ? 'text-amber-500' : 'text-emerald-500'}`}
                                                title={grp.isActive ? 'Desativar Grupo' : 'Ativar Grupo'}
                                            >
                                                <Power className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteGroup(grp.id, grp.name)}
                                                className="p-1 rounded text-slate-400 hover:text-rose-600"
                                                title="Excluir Grupo"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Botão de Ação: Ver Procedimentos Vinculados (Item 5) */}
                                <button
                                    type="button"
                                    onClick={() => handleOpenGroupView(grp)}
                                    className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 hover:text-blue-700 dark:text-slate-300 dark:hover:text-white rounded-lg text-xs font-bold transition-all border border-slate-200 dark:border-slate-700"
                                >
                                    <span>Acessar Procedimentos do Grupo</span>
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 3: IMPORTAÇÃO INTEGRA SUS */}
            {activeTab === 'integra-sus' && (
                <ProcedureIntegraSusForm
                    procedureIdProp={selectedProcedureId}
                    procedureGroupIdProp={selectedGroupId}
                    onSuccessProp={() => setActiveTab('procedures')}
                    onBackProp={() => setActiveTab('procedures')}
                />
            )}

            {/* TAB 4: MATRIZ DE COTAS */}
            {activeTab === 'quotas' && (
                <ProcedureQuotasManager
                    initialProcedureId={selectedProcedureId}
                    initialGroupId={selectedGroupId}
                />
            )}

            {/* TAB 5: EDITOR DE PREPARO */}
            {activeTab === 'preparation' && (
                <PreparationEditor
                    procedureIdProp={selectedProcedureId}
                    onBackProp={() => setActiveTab('procedures')}
                />
            )}

            {/* TAB 6: VISÃO DO GRUPO (Item 5) */}
            {activeTab === 'group-view' && (
                <GroupProceduresView
                    groupId={selectedGroupId}
                    groupName={selectedGroupName}
                    onBack={() => setActiveTab('groups')}
                    onOpenPreparation={handleOpenPreparation}
                    onOpenQuotas={handleOpenQuotas}
                    onOpenGroupQuotas={(gId) => {
                        setSelectedGroupId(gId);
                        setSelectedProcedureId('');
                        setActiveTab('quotas');
                    }}
                    onEditProcedure={handleOpenEditProcedure}
                    onAddNewProcedure={(gId) => {
                        setSelectedProcedureId('');
                        setSelectedGroupId(gId);
                        setActiveTab('integra-sus');
                    }}
                />
            )}

            {/* MODAL DE CRIAÇÃO / IMPORTAÇÃO INTEGRA SUS / EDIÇÃO DE GRUPO */}
            <GroupCreateIntegraSusModal
                isOpen={isGroupModalOpen}
                onClose={() => setIsGroupModalOpen(false)}
                editingGroup={editingGroup}
            />
        </div>
    );
};
