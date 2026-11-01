import React, { useState, useEffect } from 'react';
import { useHealthCenters } from '../../hooks/useHealthCenters';
import {
    useProcedures,
    useProcedureQuotasMatrix,
    useUpdateExecutingOffer,
    useAutoDistributeQuotas,
    useRebalanceQuotas
} from '../../hooks/useProcedures';
import { toast } from 'sonner';
import {
    Divide,
    Save,
    Loader2,
    Lock,
    Unlock,
    RefreshCw
} from 'lucide-react';

export const ProcedureQuotasManager: React.FC<{
    initialProcedureId?: string;
    initialExecutingId?: string;
}> = ({ initialProcedureId, initialExecutingId }) => {
    // 1. Carregar Unidades Executantes
    const { data: healthCentersData } = useHealthCenters({
        page: 1,
        limit: 200,
        sortBy: 'name',
        sortOrder: 'asc',
    });

    // Filtra executantes (ou exibe todas caso ainda não tenham flag)
    const executingUnits = (healthCentersData?.data || []).filter(
        h => h.stExecutante || !h.stSolicitante
    );
    const fallbackExecutingUnits = executingUnits.length > 0 ? executingUnits : (healthCentersData?.data || []);

    const [selectedExecutingId, setSelectedExecutingId] = useState<string>(
        initialExecutingId || fallbackExecutingUnits[0]?.id || ''
    );

    // 2. Carregar Procedimentos
    const { data: proceduresData } = useProcedures({
        page: 1,
        limit: 300,
        sortBy: 'name',
        sortOrder: 'asc',
    });

    const [selectedProcedureId, setSelectedProcedureId] = useState<string>(
        initialProcedureId || proceduresData?.data?.[0]?.id || ''
    );

    // Atualiza seleção padrão quando carregar dados
    useEffect(() => {
        if (!selectedExecutingId && fallbackExecutingUnits.length > 0) {
            setSelectedExecutingId(fallbackExecutingUnits[0].id);
        }
    }, [fallbackExecutingUnits, selectedExecutingId]);

    useEffect(() => {
        if (!selectedProcedureId && proceduresData?.data && proceduresData.data.length > 0) {
            setSelectedProcedureId(proceduresData.data[0].id);
        }
    }, [proceduresData, selectedProcedureId]);

    // 3. Matriz de Cotas
    const {
        data: quotaMatrix,
        isLoading: loadingMatrix,
        refetch: refetchMatrix
    } = useProcedureQuotasMatrix(selectedExecutingId, selectedProcedureId);

    // Mutations
    const updateExecutingOfferMutation = useUpdateExecutingOffer();
    const autoDistributeMutation = useAutoDistributeQuotas();
    const rebalanceMutation = useRebalanceQuotas();

    // Estados locais de edição
    const [executingCapacity, setExecutingCapacity] = useState<number>(0);
    const [isOffered, setIsOffered] = useState<boolean>(true);
    const [solicitorInputs, setSolicitorInputs] = useState<Record<string, number>>({});

    useEffect(() => {
        if (quotaMatrix) {
            setExecutingCapacity(quotaMatrix.totalCapacity);
            setIsOffered(quotaMatrix.isOffered);

            const initialInputs: Record<string, number> = {};
            quotaMatrix.solicitors.forEach(s => {
                initialInputs[s.solicitingHealthCenterId] = s.monthlyQuota;
            });
            setSolicitorInputs(initialInputs);
        }
    }, [quotaMatrix]);

    const handleSaveExecutingCapacity = () => {
        if (!selectedExecutingId || !selectedProcedureId) return;

        updateExecutingOfferMutation.mutate({
            healthCenterId: selectedExecutingId,
            procedureId: selectedProcedureId,
            monthlyQuantity: Number(executingCapacity),
            isOffered: Boolean(isOffered),
        }, {
            onSuccess: () => {
                toast.success('Capacidade mensal da executante atualizada!');
                refetchMatrix();
            },
            onError: () => toast.error('Erro ao atualizar capacidade da executante.')
        });
    };

    const handleAutoDistribute = () => {
        if (!selectedExecutingId || !selectedProcedureId) return;

        autoDistributeMutation.mutate({
            executingHealthCenterId: selectedExecutingId,
            procedureId: selectedProcedureId,
            totalCapacity: Number(executingCapacity),
        }, {
            onSuccess: () => {
                toast.success('Cotas distribuídas igualmente entre as unidades solicitantes!');
            },
            onError: () => toast.error('Erro na distribuição automática de cotas.')
        });
    };

    const handleManualQuotaChange = (solicitingId: string, val: number) => {
        setSolicitorInputs(prev => ({ ...prev, [solicitingId]: val }));
    };

    const handleApplyManualAdjustment = (solicitingId: string) => {
        const quotaVal = solicitorInputs[solicitingId] ?? 0;

        rebalanceMutation.mutate({
            executingHealthCenterId: selectedExecutingId,
            procedureId: selectedProcedureId,
            solicitingHealthCenterId: solicitingId,
            monthlyQuota: quotaVal,
        }, {
            onSuccess: () => {
                toast.success('Ajuste manual aplicado e rebalanceamento automático concluído!');
            },
            onError: (err: any) => {
                toast.error(err?.response?.data?.message || 'Erro ao ajustar cota manual.');
            }
        });
    };

    const selectedProcedureObj = proceduresData?.data?.find(p => p.id === selectedProcedureId);
    const selectedExecutingObj = fallbackExecutingUnits.find(h => h.id === selectedExecutingId);

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header & Seleção */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Divide className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        Distribuição e Matriz de Cotas Mensais
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        Defina a capacidade da unidade executante e o rateio automático/manual entre as unidades solicitantes (UBSs).
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {/* Seletor de Unidade Executante */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            1. Unidade Executante (Ofertante do Serviço) *
                        </label>
                        <select
                            value={selectedExecutingId}
                            onChange={(e) => setSelectedExecutingId(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                        >
                            {fallbackExecutingUnits.map(hc => (
                                <option key={hc.id} value={hc.id}>
                                    {hc.name} (CNES: {hc.cnes})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Seletor de Procedimento */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            2. Procedimento Clínico / Exame *
                        </label>
                        <select
                            value={selectedProcedureId}
                            onChange={(e) => setSelectedProcedureId(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                        >
                            {(proceduresData?.data || []).map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.code ? `[${p.code}] ` : ''}{p.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Painel de Capacidade da Unidade Executante */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-850 border border-blue-200 dark:border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 block">
                            Capacidade Mensal do Serviço
                        </span>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">
                            {selectedExecutingObj?.name || 'Unidade Executante'}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                            Procedimento: <strong>{selectedProcedureObj?.name}</strong>
                        </p>
                    </div>

                    {/* Ações da Capacidade */}
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={handleSaveExecutingCapacity}
                            disabled={updateExecutingOfferMutation.isPending}
                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                        >
                            <Save className="w-3.5 h-3.5" />
                            {updateExecutingOfferMutation.isPending ? 'Salvando...' : 'Salvar Capacidade'}
                        </button>

                        <button
                            type="button"
                            onClick={handleAutoDistribute}
                            disabled={autoDistributeMutation.isPending || executingCapacity <= 0}
                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${autoDistributeMutation.isPending ? 'animate-spin' : ''}`} />
                            Distribuir Igualmente
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-blue-100 dark:border-slate-800/80">
                    {/* Input Capacidade */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Capacidade Mensal Total Ofertada *
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min={0}
                                value={executingCapacity}
                                onChange={(e) => setExecutingCapacity(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-32 px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-base font-bold text-slate-900 dark:text-white"
                            />
                            <span className="text-xs text-slate-500 font-medium">vagas / mês</span>
                        </div>
                    </div>

                    {/* Toggle Ofertado no Serviço */}
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            role="switch"
                            aria-checked={isOffered}
                            onClick={() => setIsOffered(!isOffered)}
                            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                                isOffered ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                        >
                            <div
                                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                    isOffered ? 'translate-x-5' : 'translate-x-0'
                                }`}
                            />
                        </button>
                        <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white block">
                                Procedimento Ofertado no Serviço
                            </span>
                            <span className="text-[11px] text-slate-500 block">
                                {isOffered ? 'Ativo na rede executante' : 'Desabilitado temporariamente'}
                            </span>
                        </div>
                    </div>

                    {/* Resumo da Alocação */}
                    <div className="bg-white/80 dark:bg-slate-950/60 rounded-lg p-3 border border-blue-100 dark:border-slate-800 flex justify-around items-center">
                        <div className="text-center">
                            <span className="block text-[10px] uppercase font-bold text-slate-400">Alocadas</span>
                            <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">
                                {quotaMatrix?.allocatedTotal ?? 0}
                            </span>
                        </div>
                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
                        <div className="text-center">
                            <span className="block text-[10px] uppercase font-bold text-slate-400">Disponíveis</span>
                            <span className={`text-base font-extrabold ${
                                (quotaMatrix?.unallocated ?? 0) < 0 ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'
                            }`}>
                                {quotaMatrix?.unallocated ?? 0}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Matriz de Rateio por UBS Solicitante */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            Cotas Mensais das Unidades Solicitantes (UBSs)
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Se o valor for <strong>0</strong>, o procedimento fica automaticamente invisível para a solicitação daquela unidade.
                        </p>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                        <span>Auto-balanceamento ativo</span>
                    </div>
                </div>

                {loadingMatrix ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <span className="text-sm">Carregando matriz de cotas...</span>
                    </div>
                ) : !quotaMatrix || quotaMatrix.solicitors.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-sm">
                        Nenhuma Unidade Básica de Saúde solicitante cadastrada.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="px-4 py-3">Unidade Solicitante (UBS)</th>
                                    <th className="px-4 py-3">CNES</th>
                                    <th className="px-4 py-3 text-center">Tipo de Ajuste</th>
                                    <th className="px-4 py-3 text-center">Cota Mensal</th>
                                    <th className="px-4 py-3 text-center">Consumidas</th>
                                    <th className="px-4 py-3 text-center">Saldo</th>
                                    <th className="px-4 py-3 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {quotaMatrix.solicitors.map((s) => {
                                    const currentVal = solicitorInputs[s.solicitingHealthCenterId] ?? s.monthlyQuota;
                                    const saldo = Math.max(0, currentVal - s.usedQuota);
                                    const isZero = currentVal === 0;

                                    return (
                                        <tr
                                            key={s.solicitingHealthCenterId}
                                            className={`hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors ${
                                                isZero ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''
                                            }`}
                                        >
                                            <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-white">
                                                <div className="flex items-center gap-2">
                                                    <span>{s.solicitingHealthCenterName}</span>
                                                    {isZero && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-bold">
                                                            Invisível (Cota 0)
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-4 py-3.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                                                {s.solicitingHealthCenterCnes || '-'}
                                            </td>

                                            <td className="px-4 py-3.5 text-center">
                                                {s.isManualAdjustment ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                                                        <Lock className="w-3 h-3" />
                                                        Manual
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                                        <Unlock className="w-3 h-3" />
                                                        Automático
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-4 py-3.5 text-center">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={currentVal}
                                                    onChange={(e) => handleManualQuotaChange(
                                                        s.solicitingHealthCenterId,
                                                        Math.max(0, parseInt(e.target.value) || 0)
                                                    )}
                                                    className="w-20 px-2.5 py-1 text-center font-bold border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-blue-500"
                                                />
                                            </td>

                                            <td className="px-4 py-3.5 text-center font-semibold text-slate-500 dark:text-slate-400">
                                                {s.usedQuota}
                                            </td>

                                            <td className="px-4 py-3.5 text-center font-bold text-emerald-600 dark:text-emerald-400">
                                                {saldo}
                                            </td>

                                            <td className="px-4 py-3.5 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleApplyManualAdjustment(s.solicitingHealthCenterId)}
                                                    disabled={rebalanceMutation.isPending}
                                                    className="px-3 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white dark:bg-slate-800 dark:hover:bg-blue-600 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded transition-colors shadow-sm cursor-pointer"
                                                >
                                                    Ajustar
                                                </button>
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
