import React, { useState } from 'react';
import { useHealthCenters } from '../../hooks/useHealthCenters';
import {
    useExecutingOffers,
    useUpdateExecutingOffer,
    useToggleProcedureActive
} from '../../hooks/useProcedures';
import { toast } from 'sonner';
import {
    ArrowLeft,
    Layers,
    Building2,
    FileText,
    Divide,
    Edit2,
    Loader2,
    Check,
    X,
    Power,
    Plus
} from 'lucide-react';

export const GroupProceduresView: React.FC<{
    groupId: string;
    groupName: string;
    onBack: () => void;
    onOpenPreparation: (procedureId: string) => void;
    onOpenQuotas: (procedureId: string, executingId?: string) => void;
    onOpenGroupQuotas?: (groupId: string) => void;
    onEditProcedure: (procedureId: string) => void;
    onAddNewProcedure?: (groupId: string) => void;
}> = ({
    groupId,
    groupName,
    onBack,
    onOpenPreparation,
    onOpenQuotas,
    onOpenGroupQuotas,
    onEditProcedure,
    onAddNewProcedure
}) => {
    // Filtro de ativos do grupo
    const [showOnlyActive, setShowOnlyActive] = useState(true);

    // 1. Carrega unidades executantes
    const { data: healthCentersData } = useHealthCenters({
        page: 1,
        limit: 200,
        sortBy: 'name',
        sortOrder: 'asc',
    });

    const executingUnits = (healthCentersData?.data || []).filter(
        h => h.stExecutante || !h.stSolicitante
    );
    const fallbackExecutingUnits = executingUnits.length > 0 ? executingUnits : (healthCentersData?.data || []);

    const [selectedExecutingId, setSelectedExecutingId] = useState<string>(
        fallbackExecutingUnits[0]?.id || ''
    );

    // 2. Carrega procedimentos do grupo com as ofertas da executante
    const {
        data: procedures,
        isLoading: loadingProcedures,
        refetch
    } = useExecutingOffers(selectedExecutingId, groupId, !showOnlyActive);

    const updateOfferMutation = useUpdateExecutingOffer();
    const toggleProcedureActiveMutation = useToggleProcedureActive();

    const handleToggleProcedureStatus = (procedureId: string, name: string, currentActive: boolean) => {
        toggleProcedureActiveMutation.mutate(procedureId, {
            onSuccess: () => {
                toast.success(`Procedimento "${name}" ${currentActive ? 'desativado' : 'ativado'} com sucesso!`);
                refetch();
            },
            onError: () => toast.error('Erro ao alterar status do procedimento.')
        });
    };

    const handleToggleOffer = (procedureId: string, currentOffered: boolean, monthlyQty: number) => {
        if (!selectedExecutingId) {
            toast.error('Selecione uma unidade executante.');
            return;
        }

        const nextOffered = !currentOffered;

        updateOfferMutation.mutate({
            healthCenterId: selectedExecutingId,
            procedureId,
            monthlyQuantity: monthlyQty || 0,
            isOffered: nextOffered,
        }, {
            onSuccess: () => {
                toast.success(
                    nextOffered
                        ? 'Procedimento ativado nos serviços da executante!'
                        : 'Procedimento desativado nos serviços da executante!'
                );
                refetch();
            },
            onError: () => toast.error('Erro ao atualizar status da oferta.')
        });
    };

    const handleBatchToggle = async (offeredState: boolean) => {
        if (!selectedExecutingId || !procedures) return;

        try {
            await Promise.all(
                procedures.map(p =>
                    updateOfferMutation.mutateAsync({
                        healthCenterId: selectedExecutingId,
                        procedureId: p.id,
                        monthlyQuantity: p.monthlyQuantity || 0,
                        isOffered: offeredState,
                    })
                )
            );
            toast.success(
                offeredState
                    ? 'Todos os procedimentos do grupo foram habilitados!'
                    : 'Todos os procedimentos do grupo foram desabilitados!'
            );
            refetch();
        } catch {
            toast.error('Erro ao atualizar procedimentos em lote.');
        }
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onBack}
                            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                    Grupo de Procedimentos
                                </span>
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                                {groupName}
                            </h2>
                        </div>
                    </div>

                    {/* Ações em lote */}
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={() => handleBatchToggle(true)}
                            className="flex-1 sm:flex-initial justify-center flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
                        >
                            <Check className="w-3.5 h-3.5" />
                            Habilitar Todos
                        </button>

                        <button
                            type="button"
                            onClick={() => handleBatchToggle(false)}
                            className="flex-1 sm:flex-initial justify-center flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
                        >
                            <X className="w-3.5 h-3.5" />
                            Desabilitar Todos
                        </button>

                        {onOpenGroupQuotas && (
                            <button
                                type="button"
                                onClick={() => onOpenGroupQuotas(groupId)}
                                className="flex-1 sm:flex-initial justify-center flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded text-xs font-semibold transition-colors shadow-xs cursor-pointer whitespace-nowrap"
                                title="Configurar capacidade e matriz de cotas para este grupo"
                            >
                                <Divide className="w-3.5 h-3.5" />
                                Cotas do Grupo
                            </button>
                        )}

                        {onAddNewProcedure && (
                            <button
                                type="button"
                                onClick={() => onAddNewProcedure(groupId)}
                                className="flex-1 sm:flex-initial justify-center flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition-colors shadow-sm cursor-pointer whitespace-nowrap"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Novo Procedimento
                            </button>
                        )}
                    </div>
                </div>

                {/* Seletor da Executante e Filtros */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">
                                Unidade Executante:
                            </label>
                            <select
                                value={selectedExecutingId}
                                onChange={(e) => setSelectedExecutingId(e.target.value)}
                                className="w-full sm:w-auto max-w-full sm:max-w-xs px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                            >
                                {fallbackExecutingUnits.map(h => (
                                    <option key={h.id} value={h.id}>
                                        {h.name} (CNES: {h.cnes})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Opção para listar apenas itens ativos do grupo de procedimentos */}
                        <label className="flex items-center gap-2 cursor-pointer select-none bg-slate-50 dark:bg-slate-950/80 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors w-full sm:w-auto justify-center sm:justify-start">
                            <input
                                type="checkbox"
                                checked={showOnlyActive}
                                onChange={(e) => setShowOnlyActive(e.target.checked)}
                                className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                            />
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                Listar apenas procedimentos ativos
                            </span>
                        </label>
                    </div>

                    <span className="text-xs text-slate-400 italic">
                        Alterne os switches para ativar ou desativar a oferta de cada exame nesta unidade
                    </span>
                </div>
            </div>

            {/* Tabela de Procedimentos do Grupo */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
                {loadingProcedures ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <span className="text-sm">Carregando procedimentos do grupo...</span>
                    </div>
                ) : !procedures || procedures.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 text-sm">
                        Nenhum procedimento vinculado a este grupo.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="px-4 py-3">Código</th>
                                    <th className="px-4 py-3">Procedimento</th>
                                    <th className="px-4 py-3 text-center">Status Geral</th>
                                    <th className="px-4 py-3 text-center">Regulação</th>
                                    <th className="px-4 py-3 text-center">Ofertado na Executante</th>
                                    <th className="px-4 py-3 text-center">Capacidade Mensal</th>
                                    <th className="px-4 py-3 text-right">Ações Rápidas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {procedures.map((p) => {
                                    const offered = p.isOffered ?? true;

                                    return (
                                        <tr
                                            key={p.id}
                                            className={`hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors ${
                                                !offered ? 'opacity-60 bg-slate-50/20 dark:bg-slate-950/30' : ''
                                            }`}
                                        >
                                            {/* Código */}
                                            <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-600 dark:text-slate-300">
                                                {p.code || '-'}
                                            </td>

                                            {/* Nome */}
                                            <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-white">
                                                <div className="max-w-md">
                                                    <span className="block truncate">{p.name}</span>
                                                    <span className="block text-[11px] text-slate-400 mt-0.5">
                                                        Idade: {p.minAge} a {p.maxAge} anos • Sexo: {p.genderAllowed}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Status Cadastro Geral */}
                                            <td className="px-4 py-3.5 text-center">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                                                    p.isActive
                                                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                                        : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                                                }`}>
                                                    {p.isActive ? 'Ativo' : 'Inativo'}
                                                </span>
                                            </td>

                                            {/* Exige Regulação */}
                                            <td className="px-4 py-3.5 text-center">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                                                    p.requiresRegulation !== false
                                                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                                                        : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {p.requiresRegulation !== false ? 'Sim' : 'Não'}
                                                </span>
                                            </td>

                                            {/* Toggle switch: Ofertado na Executante (Item 5) */}
                                            <td className="px-4 py-3.5 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        type="button"
                                                        role="switch"
                                                        aria-checked={offered}
                                                        onClick={() => handleToggleOffer(p.id, offered, p.monthlyQuantity || 0)}
                                                        disabled={updateOfferMutation.isPending}
                                                        className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                                                            offered ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                                                        }`}
                                                    >
                                                        <div
                                                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                                                offered ? 'translate-x-5' : 'translate-x-0'
                                                            }`}
                                                        />
                                                    </button>
                                                    <span className={`text-xs font-semibold ${
                                                        offered ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'
                                                    }`}>
                                                        {offered ? 'Ofertado' : 'Suspenso'}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Quantidade Mensal */}
                                            <td className="px-4 py-3.5 text-center font-bold text-slate-800 dark:text-slate-200">
                                                {p.monthlyQuantity || 0} vagas
                                            </td>

                                            {/* Ações Rápidas */}
                                            <td className="px-4 py-3.5 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {/* Botão Preparo */}
                                                    <button
                                                        type="button"
                                                        onClick={() => onOpenPreparation(p.id)}
                                                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-600 transition-colors"
                                                        title="Editar Preparo Clínico"
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                    </button>

                                                    {/* Botão Cotas */}
                                                    <button
                                                        type="button"
                                                        onClick={() => onOpenQuotas(p.id, selectedExecutingId)}
                                                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors"
                                                        title="Gerenciar Cotas Mensais"
                                                    >
                                                        <Divide className="w-4 h-4" />
                                                    </button>

                                                    {/* Botão Editar */}
                                                    <button
                                                        type="button"
                                                        onClick={() => onEditProcedure(p.id)}
                                                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors"
                                                        title="Editar Procedimento"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>

                                                    {/* Botão Toggle Ativo Geral */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleProcedureStatus(p.id, p.name, p.isActive)}
                                                        className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                                                            p.isActive ? 'text-amber-500 hover:text-amber-600' : 'text-emerald-500 hover:text-emerald-600'
                                                        }`}
                                                        title={p.isActive ? 'Desativar Procedimento' : 'Ativar Procedimento'}
                                                    >
                                                        <Power className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
