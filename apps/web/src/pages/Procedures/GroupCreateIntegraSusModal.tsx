import React, { useState, useEffect } from 'react';
import type {
    IntegraSusSubgroup,
    IntegraSusGroup
} from '../../hooks/useProcedures';
import {
    useSearchIntegraSusSubgroups,
    useIntegraSusGroups,
    useIntegraSusGroupSubgroups,
    useIntegraSusSubgroupProcedures,
    useImportProcedureGroupFromIntegraSus,
    useCreateProcedureGroup,
    useUpdateProcedureGroup
} from '../../hooks/useProcedures';
import { toast } from 'sonner';
import {
    Search,
    Layers,
    ChevronRight,
    Check,
    Loader2,
    X,
    Database,
    Sparkles,
    FolderPlus,
    FileText,
    CheckCircle2
} from 'lucide-react';

interface GroupCreateIntegraSusModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingGroup: { id: string; name: string } | null;
    onSuccess?: () => void;
}

export const GroupCreateIntegraSusModal: React.FC<GroupCreateIntegraSusModalProps> = ({
    isOpen,
    onClose,
    editingGroup,
    onSuccess,
}) => {
    const isEditMode = !!editingGroup;

    // Estados do Modo Edição / Criação Manual
    const [groupNameInput, setGroupNameInput] = useState('');

    // Aba de Seleção do INTEGRA SUS: 'search' (busca direta por subgrupo) ou 'browse' (navegação por grupos)
    const [selectionTab, setSelectionTab] = useState<'search' | 'browse'>('search');

    // Estado da Busca Direta por Subgrupo
    const [searchSubgroupTerm, setSearchSubgroupTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    // Estado da Navegação por Grupos (Drilldown)
    const [selectedBrowseGroupCode, setSelectedBrowseGroupCode] = useState<string>('');

    // Subgrupo selecionado para importação
    const [selectedSubgroup, setSelectedSubgroup] = useState<IntegraSusSubgroup | null>(null);
    const [autoImportProcedures, setAutoImportProcedures] = useState(true);
    const [showProceduresPreview, setShowProceduresPreview] = useState(false);

    // Debounce da busca
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchSubgroupTerm);
        }, 350);
        return () => clearTimeout(timer);
    }, [searchSubgroupTerm]);

    // Reseta ou popula campos ao abrir modal
    useEffect(() => {
        if (isOpen) {
            if (editingGroup) {
                setGroupNameInput(editingGroup.name);
            } else {
                setGroupNameInput('');
                setSelectedSubgroup(null);
                setSearchSubgroupTerm('');
                setDebouncedSearchTerm('');
                setSelectedBrowseGroupCode('');
                setAutoImportProcedures(true);
                setShowProceduresPreview(false);
            }
        }
    }, [isOpen, editingGroup]);

    // Atualiza nome do grupo sugerido quando um subgrupo for selecionado
    useEffect(() => {
        if (selectedSubgroup && !isEditMode) {
            setGroupNameInput(selectedSubgroup.subgrupo_nome.toUpperCase());
        }
    }, [selectedSubgroup, isEditMode]);

    // Queries INTEGRA SUS
    const { data: searchResults, isFetching: searchingSubgroups } = useSearchIntegraSusSubgroups(
        debouncedSearchTerm,
        undefined,
        isOpen && !isEditMode && selectionTab === 'search' && debouncedSearchTerm.length >= 2
    );

    const { data: susGroups, isFetching: loadingSusGroups } = useIntegraSusGroups(
        undefined,
        false,
        isOpen && !isEditMode && selectionTab === 'browse'
    );

    const { data: susSubgroups, isFetching: loadingSusSubgroups } = useIntegraSusGroupSubgroups(
        selectedBrowseGroupCode,
        undefined,
        isOpen && !isEditMode && selectionTab === 'browse' && !!selectedBrowseGroupCode
    );

    // Query de preview de procedimentos do subgrupo selecionado
    const { data: previewProcedures, isFetching: loadingPreviewProcedures } = useIntegraSusSubgroupProcedures(
        selectedSubgroup?.grupo_codigo,
        selectedSubgroup?.subgrupo_codigo,
        isOpen && !isEditMode && !!selectedSubgroup && showProceduresPreview
    );

    // Mutations
    const importGroupMutation = useImportProcedureGroupFromIntegraSus();
    const createGroupMutation = useCreateProcedureGroup();
    const updateGroupMutation = useUpdateProcedureGroup();

    if (!isOpen) return null;

    // Submissão
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isEditMode) {
            const trimmed = groupNameInput.trim().toUpperCase();
            if (!trimmed) {
                toast.error('Informe o nome do grupo.');
                return;
            }
            updateGroupMutation.mutate(
                { id: editingGroup.id, data: { name: trimmed } },
                {
                    onSuccess: () => {
                        toast.success('Grupo atualizado com sucesso!');
                        onSuccess?.();
                        onClose();
                    },
                    onError: () => toast.error('Erro ao atualizar grupo.'),
                }
            );
            return;
        }

        // Modo Criação com INTEGRA SUS
        if (selectedSubgroup) {
            const finalName = groupNameInput.trim().toUpperCase() || selectedSubgroup.subgrupo_nome.toUpperCase();

            importGroupMutation.mutate(
                {
                    name: finalName,
                    groupCode: selectedSubgroup.grupo_codigo,
                    subgroupCode: selectedSubgroup.subgrupo_codigo,
                    groupName: selectedSubgroup.grupo_nome,
                    subgroupName: selectedSubgroup.subgrupo_nome,
                    autoImportProcedures,
                },
                {
                    onSuccess: (res) => {
                        toast.success(
                            `Grupo "${res.group.name}" cadastrado com sucesso! ${res.importedCount} procedimentos adicionados automaticamente.`
                        );
                        onSuccess?.();
                        onClose();
                    },
                    onError: () => toast.error('Erro ao importar grupo e procedimentos da INTEGRA SUS API.'),
                }
            );
            return;
        }

        // Fallback: Criação manual tradicional
        const trimmed = groupNameInput.trim().toUpperCase();
        if (!trimmed) {
            toast.error('Selecione um subgrupo do INTEGRA SUS ou informe um nome.');
            return;
        }

        createGroupMutation.mutate(
            { name: trimmed },
            {
                onSuccess: () => {
                    toast.success('Grupo criado com sucesso!');
                    onSuccess?.();
                    onClose();
                },
                onError: () => toast.error('Erro ao criar grupo.'),
            }
        );
    };

    const isSubmitting =
        importGroupMutation.isPending || createGroupMutation.isPending || updateGroupMutation.isPending;

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center">
                            {isEditMode ? <Layers className="w-4 h-4" /> : <FolderPlus className="w-4 h-4" />}
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                {isEditMode ? 'Editar Grupo de Procedimento' : 'Novo Grupo de Procedimentos (INTEGRA SUS)'}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {isEditMode
                                    ? 'Atualize o nome de identificação do grupo clínico'
                                    : 'Importe subgrupos oficiais do SUS e vincule procedimentos automaticamente'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-1"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Seção 1: Seleção via INTEGRA SUS (Apenas em Novo Cadastro) */}
                    {!isEditMode && (
                        <div className="space-y-4">
                            {/* Abas de Navegação do INTEGRA SUS */}
                            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setSelectionTab('search')}
                                    className={`pb-2.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-1.5 ${
                                        selectionTab === 'search'
                                            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                            : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                    }`}
                                >
                                    <Search className="w-3.5 h-3.5" />
                                    Busca Rápida por Subgrupo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectionTab('browse')}
                                    className={`pb-2.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-1.5 ${
                                        selectionTab === 'browse'
                                            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                            : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                    }`}
                                >
                                    <Database className="w-3.5 h-3.5" />
                                    Navegar por Grupos SUS
                                </button>
                            </div>

                            {/* TAB 1: BUSCA DIRETA */}
                            {selectionTab === 'search' && (
                                <div className="space-y-3">
                                    <div className="relative">
                                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            value={searchSubgroupTerm}
                                            onChange={(e) => setSearchSubgroupTerm(e.target.value)}
                                            placeholder="Ex: Tomografia, Ressonância, Endoscopia, Ultrassom..."
                                            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                                            autoFocus
                                        />
                                        {searchingSubgroups && (
                                            <Loader2 className="w-4 h-4 text-blue-500 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                                        )}
                                    </div>

                                    {/* Resultados da busca direta */}
                                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                                        {debouncedSearchTerm.length < 2 ? (
                                            <p className="text-xs text-slate-400 py-3 text-center">
                                                Digite pelo menos 2 caracteres para pesquisar subgrupos no INTEGRA SUS API.
                                            </p>
                                        ) : searchingSubgroups ? (
                                            <div className="py-6 flex justify-center items-center gap-2 text-xs text-slate-400">
                                                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                                Buscando no catálogo INTEGRA SUS...
                                            </div>
                                        ) : searchResults && searchResults.length > 0 ? (
                                            searchResults.map((item, idx) => {
                                                const isCurrent =
                                                    selectedSubgroup?.grupo_codigo === item.grupo_codigo &&
                                                    selectedSubgroup?.subgrupo_codigo === item.subgrupo_codigo;

                                                return (
                                                    <div
                                                        key={idx}
                                                        onClick={() => setSelectedSubgroup(item)}
                                                        className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                                                            isCurrent
                                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 shadow-sm'
                                                                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                                                        }`}
                                                    >
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300">
                                                                    {item.grupo_codigo}.{item.subgrupo_codigo}
                                                                </span>
                                                                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                                                                    {item.subgrupo_nome}
                                                                </span>
                                                            </div>
                                                            <span className="text-[11px] text-slate-400 block mt-0.5">
                                                                Grupo: {item.grupo_nome}
                                                            </span>
                                                        </div>
                                                        {isCurrent && (
                                                            <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                                        )}
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <p className="text-xs text-slate-400 py-4 text-center">
                                                Nenhum subgrupo encontrado para &quot;{debouncedSearchTerm}&quot;.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: NAVEGAÇÃO HIERÁRQUICA (DRILLDOWN) */}
                            {selectionTab === 'browse' && (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {/* Coluna 1: Grupos Principais */}
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                                1. Grupo Principal do SUS
                                            </label>
                                            <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-100 dark:divide-slate-800">
                                                {loadingSusGroups ? (
                                                    <div className="py-6 flex justify-center text-xs text-slate-400">
                                                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                                    </div>
                                                ) : (susGroups || []).map((grp: IntegraSusGroup) => (
                                                    <div
                                                        key={grp.codigo}
                                                        onClick={() => setSelectedBrowseGroupCode(grp.codigo)}
                                                        className={`p-2 text-xs cursor-pointer flex items-center justify-between transition-colors ${
                                                            selectedBrowseGroupCode === grp.codigo
                                                                ? 'bg-blue-50 dark:bg-blue-950/50 font-bold text-blue-700 dark:text-blue-300'
                                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                                        }`}
                                                    >
                                                        <span className="truncate pr-1">
                                                            {grp.codigo} - {grp.nome}
                                                        </span>
                                                        <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Coluna 2: Subgrupos do Grupo Selecionado */}
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                                2. Subgrupo Vinculado
                                            </label>
                                            <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-100 dark:divide-slate-800">
                                                {!selectedBrowseGroupCode ? (
                                                    <p className="text-xs text-slate-400 py-6 text-center">
                                                        Selecione um grupo ao lado para listar os subgrupos.
                                                    </p>
                                                ) : loadingSusSubgroups ? (
                                                    <div className="py-6 flex justify-center text-xs text-slate-400">
                                                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                                    </div>
                                                ) : (susSubgroups || []).length > 0 ? (
                                                    susSubgroups?.map((sub: any, idx: number) => {
                                                        const subCode = sub.subgrupo_codigo || sub.codigo;
                                                        const subName = sub.subgrupo_nome || sub.nome;
                                                        const isSelected =
                                                            selectedSubgroup?.subgrupo_codigo === subCode &&
                                                            selectedSubgroup?.grupo_codigo === selectedBrowseGroupCode;

                                                        return (
                                                            <div
                                                                key={idx}
                                                                onClick={() => {
                                                                    const currentGroup = susGroups?.find(
                                                                        g => g.codigo === selectedBrowseGroupCode
                                                                    );
                                                                    setSelectedSubgroup({
                                                                        grupo_codigo: selectedBrowseGroupCode,
                                                                        grupo_nome: currentGroup?.nome || '',
                                                                        subgrupo_codigo: subCode,
                                                                        subgrupo_nome: subName,
                                                                    });
                                                                }}
                                                                className={`p-2 text-xs cursor-pointer flex items-center justify-between transition-colors ${
                                                                    isSelected
                                                                        ? 'bg-blue-50 dark:bg-blue-950/50 font-bold text-blue-700 dark:text-blue-300'
                                                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                                                }`}
                                                            >
                                                                <span className="truncate pr-1">
                                                                    {subCode} - {subName}
                                                                </span>
                                                                {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <p className="text-xs text-slate-400 py-6 text-center">
                                                        Nenhum subgrupo retornado.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Detalhes do Subgrupo Selecionado */}
                            {selectedSubgroup && (
                                <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                            <div>
                                                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                                                    Subgrupo Oficial Selecionado
                                                </span>
                                                <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                    {selectedSubgroup.grupo_codigo}.{selectedSubgroup.subgrupo_codigo} -{' '}
                                                    {selectedSubgroup.subgrupo_nome}
                                                </span>
                                                <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                                                    Grupo: {selectedSubgroup.grupo_nome}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedSubgroup(null)}
                                            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline"
                                        >
                                            Trocar
                                        </button>
                                    </div>

                                    {/* Opção de Importação Automática de Procedimentos */}
                                    <div className="pt-2 border-t border-blue-200/60 dark:border-blue-900/60 flex flex-col gap-2">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={autoImportProcedures}
                                                onChange={(e) => setAutoImportProcedures(e.target.checked)}
                                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                                            />
                                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                                Adicionar e vincular automaticamente todos os exames/procedimentos deste grupo
                                            </span>
                                        </label>

                                        {/* Botão de Pré-visualização de Procedimentos */}
                                        {autoImportProcedures && (
                                            <div>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowProceduresPreview(!showProceduresPreview)}
                                                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
                                                >
                                                    <FileText className="w-3.5 h-3.5" />
                                                    {showProceduresPreview
                                                        ? 'Ocultar procedimentos a serem importados'
                                                        : 'Visualizar procedimentos vinculados no INTEGRA SUS'}
                                                </button>

                                                {showProceduresPreview && (
                                                    <div className="mt-2 max-h-36 overflow-y-auto border border-blue-200 dark:border-blue-900/60 rounded bg-white dark:bg-slate-900 p-2 text-xs divide-y divide-slate-100 dark:divide-slate-800">
                                                        {loadingPreviewProcedures ? (
                                                            <div className="py-3 flex justify-center items-center gap-1.5 text-slate-400">
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                                                                Carregando procedimentos do subgrupo...
                                                            </div>
                                                        ) : previewProcedures && previewProcedures.length > 0 ? (
                                                            previewProcedures.map((p: any, idx: number) => (
                                                                <div key={idx} className="py-1 flex items-center justify-between">
                                                                    <div className="min-w-0 pr-2">
                                                                        <span className="font-mono text-[10px] text-blue-700 dark:text-blue-300 mr-2">
                                                                            {p.co_procedimento || p.codigo || p.code}
                                                                        </span>
                                                                        <span className="text-slate-800 dark:text-slate-200 font-medium truncate">
                                                                            {p.no_procedimento || p.nome || p.name}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-[10px] text-slate-400 shrink-0">
                                                                        R$ {p.vl_sa ? Number(p.vl_sa).toFixed(2) : '0.00'}
                                                                    </span>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <p className="text-slate-400 py-2 text-center text-[11px]">
                                                                Nenhum procedimento listado para este subgrupo na API.
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Seção 2: Nome do Grupo no Sistema */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Nome do Grupo no Sistema *
                        </label>
                        <input
                            type="text"
                            value={groupNameInput}
                            onChange={(e) => setGroupNameInput(e.target.value)}
                            placeholder="Ex: DIAGNÓSTICO POR TOMOGRAFIA, ULTRASSONOGRAFIA..."
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white uppercase focus:outline-none focus:border-blue-500 font-semibold"
                            required
                        />
                        <span className="text-[11px] text-slate-400">
                            {isEditMode
                                ? 'Altera o nome de exibição do grupo clínico'
                                : 'Nome sugerido a partir do subgrupo SUS selecionado acima'}
                        </span>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || (!groupNameInput.trim() && !selectedSubgroup)}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isEditMode
                                ? 'Atualizar Nome'
                                : autoImportProcedures && selectedSubgroup
                                ? 'Importar Grupo e Procedimentos'
                                : 'Cadastrar Grupo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
