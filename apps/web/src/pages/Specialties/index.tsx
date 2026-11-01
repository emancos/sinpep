import React, { useState } from 'react';
import { useConfirm } from '../../contexts/ConfirmContext';
import { toast } from 'sonner';
import type { Specialty } from '../../hooks/useSpecialties';
import {
    useSpecialties,
    useCreateSpecialty,
    useUpdateSpecialty,
    useDeleteSpecialty,
    useToggleSpecialtyActive
} from '../../hooks/useSpecialties';
import {
    Search,
    Plus,
    Loader2,
    AlertCircle,
    Award,
    Edit2,
    Trash2,
    X,
    Power
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { TablePagination } from '../../components/TablePagination';

export const SpecialtiesPage: React.FC = () => {
    const confirm = useConfirm();

    // Search & Filter
    const [search, setSearch] = useState('');
    const [showInactive, setShowInactive] = useState(false);

    const userPermissions = useAuthStore(state => state.permissions);
    const canWrite = userPermissions.includes('procedure-groups:write') || userPermissions.includes('admin:access');

    // Pagination
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);

    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'create' | 'edit'>('create');
    const [selectedId, setSelectedId] = useState('');
    const [nameVal, setNameVal] = useState('');
    const [descVal, setDescVal] = useState('');

    // Queries & Mutations
    const { data: specialtiesData, isLoading, isError } = useSpecialties(showInactive);
    const createSpecialty = useCreateSpecialty();
    const updateSpecialty = useUpdateSpecialty();
    const deleteSpecialty = useDeleteSpecialty();
    const toggleSpecialtyActive = useToggleSpecialtyActive();

    const handleOpenCreate = () => {
        setSelectedId('');
        setNameVal('');
        setDescVal('');
        setModalType('create');
        setIsModalOpen(true);
    };

    const handleOpenEdit = (spec: { id: string; name: string; description?: string | null }) => {
        setSelectedId(spec.id);
        setNameVal(spec.name);
        setDescVal(spec.description || '');
        setModalType('edit');
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = nameVal.trim();
        if (!name) {
            toast.error('O nome da especialidade é obrigatório.');
            return;
        }

        if (modalType === 'create') {
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
        } else {
            updateSpecialty.mutate(
                { id: selectedId, name: name.toUpperCase(), description: descVal.trim() || undefined },
                {
                    onSuccess: () => {
                        toast.success('Especialidade atualizada com sucesso!');
                        setIsModalOpen(false);
                    },
                    onError: () => toast.error('Erro ao atualizar especialidade.')
                }
            );
        }
    };

    const handleDelete = async (id: string, name: string) => {
        const confirmed = await confirm({
            title: 'Excluir Especialidade',
            description: `Deseja realmente excluir a especialidade "${name}"?`,
            confirmText: 'Excluir',
            cancelText: 'Cancelar',
            variant: 'danger'
        });
        if (confirmed) {
            deleteSpecialty.mutate(id, {
                onSuccess: () => toast.success('Especialidade excluída com sucesso!'),
                onError: () => toast.error('Erro ao excluir especialidade.')
            });
        }
    };

    const handleToggleActive = async (id: string, name: string, currentActive: boolean) => {
        const action = currentActive ? 'desativar' : 'ativar';
        const confirmed = await confirm({
            title: `${currentActive ? 'Desativar' : 'Ativar'} Especialidade`,
            description: `Deseja realmente ${action} a especialidade "${name}"?`,
            confirmText: currentActive ? 'Desativar' : 'Ativar',
            cancelText: 'Cancelar',
            variant: currentActive ? 'danger' : 'info'
        });
        if (confirmed) {
            toggleSpecialtyActive.mutate(id, {
                onSuccess: () => toast.success(`Especialidade ${currentActive ? 'desativada' : 'ativada'} com sucesso!`),
                onError: () => toast.error(`Erro ao ${action} especialidade.`)
            });
        }
    };

    // Filter & Paginate
    const allSpecialties: Specialty[] = specialtiesData?.data || [];
    const filteredSpecialties = allSpecialties.filter((s: Specialty) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(search.toLowerCase())) ||
        (s.cbo && s.cbo.toLowerCase().includes(search.toLowerCase()))
    );

    const total = filteredSpecialties.length;
    const paginatedSpecialties = filteredSpecialties.slice((page - 1) * limit, page * limit);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Award className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                        Especialidades Médicas
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Gerenciamento das especialidades clínicas para atendimento, agendamentos e regulação
                    </p>
                </div>

                {canWrite && (
                    <button
                        onClick={handleOpenCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Nova Especialidade
                    </button>
                )}
            </div>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Buscar por nome, CBO ou descrição..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer self-start sm:self-auto">
                    <input
                        type="checkbox"
                        checked={showInactive}
                        onChange={(e) => setShowInactive(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Exibir inativas
                </label>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
                {isLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <span className="text-sm">Carregando especialidades...</span>
                    </div>
                ) : isError ? (
                    <div className="py-16 flex flex-col items-center justify-center gap-2 text-rose-500">
                        <AlertCircle className="w-8 h-8" />
                        <span className="text-sm">Erro ao carregar especialidades.</span>
                    </div>
                ) : filteredSpecialties.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 text-sm">
                        Nenhuma especialidade encontrada.
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        <th className="px-4 py-3">Especialidade</th>
                                        <th className="px-4 py-3">CBO</th>
                                        <th className="px-4 py-3">Descrição</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                        {canWrite && <th className="px-4 py-3 text-right">Ações</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {paginatedSpecialties.map((spec: Specialty) => (
                                        <tr key={spec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors">
                                            <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-white">
                                                {spec.name}
                                            </td>
                                            <td className="px-4 py-3.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                                                {spec.cbo || '-'}
                                            </td>
                                            <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate">
                                                {spec.description || '-'}
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                    spec.isActive
                                                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                                }`}>
                                                    {spec.isActive ? 'Ativa' : 'Inativa'}
                                                </span>
                                            </td>
                                            {canWrite && (
                                                <td className="px-4 py-3.5 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={() => handleOpenEdit(spec)}
                                                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-blue-600 transition-colors"
                                                            title="Editar"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleToggleActive(spec.id, spec.name, spec.isActive)}
                                                            className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                                                                spec.isActive ? 'text-amber-500 hover:text-amber-600' : 'text-emerald-500 hover:text-emerald-600'
                                                            }`}
                                                            title={spec.isActive ? 'Desativar' : 'Ativar'}
                                                        >
                                                            <Power className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(spec.id, spec.name)}
                                                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-rose-600 transition-colors"
                                                            title="Excluir"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
                            <TablePagination
                                page={page}
                                limit={limit}
                                total={total}
                                onPageChange={setPage}
                                onLimitChange={(newLimit: number) => { setLimit(newLimit); setPage(1); }}
                            />
                        </div>
                    </>
                )}
            </div>

            {/* Modal de Criação / Edição */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-md w-full shadow-2xl p-6">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                {modalType === 'create' ? 'Nova Especialidade' : 'Editar Especialidade'}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4 mt-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                                    Nome da Especialidade *
                                </label>
                                <input
                                    type="text"
                                    value={nameVal}
                                    onChange={(e) => setNameVal(e.target.value)}
                                    placeholder="Ex: CARDIOLOGIA, ORTOPEDIA..."
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 uppercase"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                                    Descrição (Opcional)
                                </label>
                                <textarea
                                    value={descVal}
                                    onChange={(e) => setDescVal(e.target.value)}
                                    placeholder="Descreva detalhes ou observações sobre esta especialidade..."
                                    rows={3}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={createSpecialty.isPending || updateSpecialty.isPending}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold transition-colors flex items-center gap-2"
                                >
                                    {(createSpecialty.isPending || updateSpecialty.isPending) && (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    )}
                                    Salvar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
