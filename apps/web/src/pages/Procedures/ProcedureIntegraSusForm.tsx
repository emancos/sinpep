import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    useProcedure,
    useProcedureGroups,
    useCreateProcedureGroup,
    useCreateProcedure,
    useUpdateProcedure,
    useSearchIntegraSus
} from '../../hooks/useProcedures';
import { toast } from 'sonner';
import {
    Search,
    Loader2,
    HelpCircle,
    Plus,
    X,
    Database
} from 'lucide-react';

interface ProcedureFormState {
    code: string;
    name: string;
    procedureGroupId: string;
    requiresRegulation: boolean;
    maxReturns: number;
    genderAllowed: 'AMBOS' | 'FEMININO' | 'MASCULINO';
    requestIntervalDays: number;
    minAge: number;
    maxAge: number;
    consumptionType: string;
    sigtapValue: string;
    regulatorRespectsQuota: boolean;

    // Período de visualização das agendas
    viewScheduleFirstTimeDays: number;
    viewScheduleReturnDays: number;
    viewScheduleRegulatorDays: number;
    viewScheduleAutoDays: number;

    // Disponibilização das agendas
    releaseScheduleFirstTimeDays: number;
    releaseScheduleReturnDays: number;
    releaseScheduleRegulatorDays: number;
    releaseScheduleAutoDays: number;
}

const defaultValues: ProcedureFormState = {
    code: '',
    name: '',
    procedureGroupId: '',
    requiresRegulation: true,
    maxReturns: 1,
    genderAllowed: 'AMBOS',
    requestIntervalDays: 30,
    minAge: 0,
    maxAge: 120,
    consumptionType: 'Por paciente',
    sigtapValue: '0.00',
    regulatorRespectsQuota: true,

    viewScheduleFirstTimeDays: 10,
    viewScheduleReturnDays: 15,
    viewScheduleRegulatorDays: 60,
    viewScheduleAutoDays: 30,

    releaseScheduleFirstTimeDays: 1,
    releaseScheduleReturnDays: 10,
    releaseScheduleRegulatorDays: 0,
    releaseScheduleAutoDays: 15,
};

export const ProcedureIntegraSusForm: React.FC<{
    procedureIdProp?: string;
    onSuccessProp?: () => void;
    onBackProp?: () => void;
}> = ({ procedureIdProp, onSuccessProp, onBackProp }) => {
    const { id: routeId } = useParams<{ id: string }>();
    const procedureId = procedureIdProp || routeId;
    const isEditMode = !!procedureId;
    const navigate = useNavigate();

    const [form, setForm] = useState<ProcedureFormState>(defaultValues);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [enableSearchQuery, setEnableSearchQuery] = useState(false);

    // Criação rápida de grupo inline
    const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');

    const { data: procedureData } = useProcedure(procedureId || '');
    const { data: groups } = useProcedureGroups();
    const createGroupMutation = useCreateProcedureGroup();
    const createProcMutation = useCreateProcedure();
    const updateProcMutation = useUpdateProcedure();

    const { data: searchResults, isFetching: searchingIntegraSus } = useSearchIntegraSus(
        searchTerm,
        enableSearchQuery
    );

    // Preenche se estiver em modo de edição
    useEffect(() => {
        if (isEditMode && procedureData) {
            setForm({
                code: procedureData.code || '',
                name: procedureData.name || '',
                procedureGroupId: procedureData.procedureGroupId || '',
                requiresRegulation: procedureData.requiresRegulation ?? true,
                maxReturns: procedureData.maxReturns ?? 1,
                genderAllowed: procedureData.genderAllowed || 'AMBOS',
                requestIntervalDays: procedureData.requestIntervalDays ?? 30,
                minAge: procedureData.minAge ?? 0,
                maxAge: procedureData.maxAge ?? 120,
                consumptionType: procedureData.consumptionType || 'Por paciente',
                sigtapValue: procedureData.sigtapValue || '0.00',
                regulatorRespectsQuota: procedureData.regulatorRespectsQuota ?? true,

                viewScheduleFirstTimeDays: procedureData.viewScheduleFirstTimeDays ?? 10,
                viewScheduleReturnDays: procedureData.viewScheduleReturnDays ?? 15,
                viewScheduleRegulatorDays: procedureData.viewScheduleRegulatorDays ?? 60,
                viewScheduleAutoDays: procedureData.viewScheduleAutoDays ?? 30,

                releaseScheduleFirstTimeDays: procedureData.releaseScheduleFirstTimeDays ?? 1,
                releaseScheduleReturnDays: procedureData.releaseScheduleReturnDays ?? 10,
                releaseScheduleRegulatorDays: procedureData.releaseScheduleRegulatorDays ?? 0,
                releaseScheduleAutoDays: procedureData.releaseScheduleAutoDays ?? 15,
            });
        }
    }, [isEditMode, procedureData]);

    const handleInputChange = (field: keyof ProcedureFormState, value: any) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleOpenSearchModal = () => {
        setSearchTerm(form.code || form.name || '');
        setEnableSearchQuery(true);
        setIsSearchModalOpen(true);
    };

    const handleSelectIntegraSusItem = (item: any) => {
        // Mapeia os dados do INTEGRA SUS para o formulário
        setForm(prev => ({
            ...prev,
            code: item.co_procedimento || item.codigo || item.code || prev.code,
            name: item.no_procedimento || item.nome || item.name || prev.name,
            genderAllowed: item.tp_sexo === 'M' ? 'MASCULINO' : item.tp_sexo === 'F' ? 'FEMININO' : 'AMBOS',
            minAge: item.nu_idade_minima !== undefined ? Math.floor(item.nu_idade_minima / 12) : prev.minAge,
            maxAge: item.nu_idade_maxima !== undefined ? Math.floor(item.nu_idade_maxima / 12) : prev.maxAge,
            sigtapValue: item.vl_sa ? Number(item.vl_sa).toFixed(2) : prev.sigtapValue,
        }));
        setIsSearchModalOpen(false);
        toast.success('Procedimento importado com sucesso da INTEGRA SUS API!');
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) return;
        try {
            const created = await createGroupMutation.mutateAsync({ name: newGroupName.trim().toUpperCase() });
            setForm(prev => ({ ...prev, procedureGroupId: created.id }));
            setIsNewGroupOpen(false);
            setNewGroupName('');
            toast.success('Grupo de procedimento criado com sucesso!');
        } catch {
            toast.error('Erro ao criar grupo de procedimento.');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.code.trim()) {
            toast.error('Informe o código interno do procedimento.');
            return;
        }
        if (!form.name.trim()) {
            toast.error('Informe o nome do procedimento.');
            return;
        }
        if (!form.procedureGroupId) {
            toast.error('Selecione um grupo para o procedimento.');
            return;
        }

        const payload: any = {
            ...form,
            minAge: Number(form.minAge),
            maxAge: Number(form.maxAge),
            maxReturns: Number(form.maxReturns),
            requestIntervalDays: Number(form.requestIntervalDays),
            viewScheduleFirstTimeDays: Number(form.viewScheduleFirstTimeDays),
            viewScheduleReturnDays: Number(form.viewScheduleReturnDays),
            viewScheduleRegulatorDays: Number(form.viewScheduleRegulatorDays),
            viewScheduleAutoDays: Number(form.viewScheduleAutoDays),
            releaseScheduleFirstTimeDays: Number(form.releaseScheduleFirstTimeDays),
            releaseScheduleReturnDays: Number(form.releaseScheduleReturnDays),
            releaseScheduleRegulatorDays: Number(form.releaseScheduleRegulatorDays),
            releaseScheduleAutoDays: Number(form.releaseScheduleAutoDays),
        };

        if (isEditMode && procedureId) {
            updateProcMutation.mutate({ id: procedureId, data: payload }, {
                onSuccess: () => {
                    toast.success('Procedimento atualizado com sucesso!');
                    if (onSuccessProp) onSuccessProp();
                    else navigate('/procedures');
                },
                onError: (err: any) => toast.error(err?.response?.data?.message || 'Erro ao atualizar procedimento.')
            });
        } else {
            createProcMutation.mutate(payload, {
                onSuccess: () => {
                    toast.success('Procedimento cadastrado com sucesso!');
                    if (onSuccessProp) onSuccessProp();
                    else navigate('/procedures');
                },
                onError: (err: any) => toast.error(err?.response?.data?.message || 'Erro ao cadastrar procedimento.')
            });
        }
    };

    const handleClear = () => {
        setForm(defaultValues);
        toast.info('Formulário limpo.');
    };

    const handleBack = () => {
        if (onBackProp) onBackProp();
        else navigate('/procedures');
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-6xl mx-auto">
            {/* CARD 1: PROCEDIMENTO */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Procedimento
                    </span>
                    <button
                        type="button"
                        onClick={handleOpenSearchModal}
                        className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded text-xs font-semibold transition-colors"
                    >
                        <Database className="w-3.5 h-3.5" />
                        Buscar no INTEGRA SUS
                    </button>
                </div>

                {/* Linha 1: Código Interno, Nome, Exige Regulação */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    {/* Código Interno com botão de busca */}
                    <div className="md:col-span-3">
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Código Interno <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={form.code}
                                onChange={(e) => handleInputChange('code', e.target.value)}
                                placeholder="00.00.00.000-0"
                                className="w-full pl-3 pr-9 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                            />
                            <button
                                type="button"
                                onClick={handleOpenSearchModal}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 p-1"
                                title="Buscar na INTEGRA SUS API"
                            >
                                <Search className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Nome do Procedimento */}
                    <div className="md:col-span-6">
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Nome do procedimento <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            placeholder="Ex: CONSULTA MÉDICA EM ATENÇÃO ESPECIALIZADA"
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 uppercase"
                        />
                    </div>

                    {/* Exige regulação (Toggle) */}
                    <div className="md:col-span-3 flex items-center justify-start md:justify-end gap-3 pb-2">
                        <button
                            type="button"
                            role="switch"
                            aria-checked={form.requiresRegulation}
                            onClick={() => handleInputChange('requiresRegulation', !form.requiresRegulation)}
                            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                                form.requiresRegulation ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                        >
                            <div
                                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                    form.requiresRegulation ? 'translate-x-5' : 'translate-x-0'
                                }`}
                            />
                        </button>
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            Exige regulação
                        </span>
                    </div>
                </div>

                {/* Linha 2: Grupo de Procedimento */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-12">
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                Grupo de Procedimento <span className="text-rose-500">*</span>
                            </label>
                            <button
                                type="button"
                                onClick={() => setIsNewGroupOpen(!isNewGroupOpen)}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                {isNewGroupOpen ? 'Cancelar novo grupo' : 'Cadastrar novo grupo'}
                            </button>
                        </div>

                        {isNewGroupOpen ? (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    placeholder="Nome do novo grupo (ex: ULTRASSONOGRAFIAS, EXAMES LABORATORIAIS)"
                                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white uppercase"
                                />
                                <button
                                    type="button"
                                    onClick={handleCreateGroup}
                                    disabled={createGroupMutation.isPending}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold transition-colors"
                                >
                                    Adicionar
                                </button>
                            </div>
                        ) : (
                            <select
                                value={form.procedureGroupId}
                                onChange={(e) => handleInputChange('procedureGroupId', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                            >
                                <option value="">Selecione o grupo do procedimento...</option>
                                {(groups || []).map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                {/* Linha 3: Retornos, Sexo, Intervalo, Idades */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Máximo de retornos */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Máximo de retornos possíveis <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="number"
                            min={0}
                            value={form.maxReturns}
                            onChange={(e) => handleInputChange('maxReturns', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white"
                        />
                    </div>

                    {/* Sexo permitido */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Sexo permitido <span className="text-rose-500">*</span>
                        </label>
                        <select
                            value={form.genderAllowed}
                            onChange={(e) => handleInputChange('genderAllowed', e.target.value as any)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white"
                        >
                            <option value="AMBOS">Ambos</option>
                            <option value="FEMININO">Feminino</option>
                            <option value="MASCULINO">Masculino</option>
                        </select>
                    </div>

                    {/* Intervalo entre solicitações */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Intervalo entre solicitações (dias) <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="number"
                            min={0}
                            value={form.requestIntervalDays}
                            onChange={(e) => handleInputChange('requestIntervalDays', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white"
                        />
                    </div>

                    {/* Idade Mínima / Máxima */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 truncate">
                                Idade mín. (anos) <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="number"
                                min={0}
                                max={130}
                                value={form.minAge}
                                onChange={(e) => handleInputChange('minAge', parseInt(e.target.value) || 0)}
                                className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 truncate">
                                Idade máx. (anos) <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="number"
                                min={0}
                                max={130}
                                value={form.maxAge}
                                onChange={(e) => handleInputChange('maxAge', parseInt(e.target.value) || 120)}
                                className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white"
                            />
                        </div>
                    </div>
                </div>

                {/* Linha 4: Consumo, Valor SIGTAP, Regulador respeita cota */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                    {/* Consumo */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Consumo <span className="text-rose-500">*</span>
                        </label>
                        <select
                            value={form.consumptionType}
                            onChange={(e) => handleInputChange('consumptionType', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white"
                        >
                            <option value="Por paciente">Por paciente</option>
                            <option value="Por procedimento">Por procedimento</option>
                            <option value="Mensal por UBS">Mensal por UBS</option>
                        </select>
                    </div>

                    {/* Valor SIGTAP (R$) */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Valor SIGTAP (R$)
                        </label>
                        <input
                            type="text"
                            value={form.sigtapValue}
                            onChange={(e) => handleInputChange('sigtapValue', e.target.value)}
                            placeholder="R$ 0,00"
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white font-mono"
                        />
                    </div>

                    {/* Toggle: Regulador respeita cota */}
                    <div className="sm:col-span-2 flex items-center gap-3 pt-4 sm:pt-0">
                        <button
                            type="button"
                            role="switch"
                            aria-checked={form.regulatorRespectsQuota}
                            onClick={() => handleInputChange('regulatorRespectsQuota', !form.regulatorRespectsQuota)}
                            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                                form.regulatorRespectsQuota ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                        >
                            <div
                                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                    form.regulatorRespectsQuota ? 'translate-x-5' : 'translate-x-0'
                                }`}
                            />
                        </button>
                        <div>
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
                                Regulador respeita cota da unidade solicitante
                            </span>
                            <span className="text-[11px] text-slate-400 block">
                                Se ativado, a aprovação do regulador é deduzida da cota mensal da UBS
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* CARD 2: PERÍODO DE VISUALIZAÇÃO DAS AGENDAS PARA */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Período de visualização das agendas para
                    </span>
                    <div className="relative group cursor-pointer text-amber-500">
                        <HelpCircle className="w-4 h-4" />
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 p-2.5 bg-slate-900 text-white text-[11px] rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                            Tem o objetivo de definir, a partir da disponibilidade da agenda, qual o período em que a agenda ficará disponível para agendamento.
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            1ª Vez <span className="text-rose-500">*</span>
                        </label>
                        <select
                            value={form.viewScheduleFirstTimeDays}
                            onChange={(e) => handleInputChange('viewScheduleFirstTimeDays', parseInt(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white"
                        >
                            <option value={5}>5 dia(s)</option>
                            <option value={10}>10 dia(s)</option>
                            <option value={15}>15 dia(s)</option>
                            <option value={30}>30 dia(s)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Retorno <span className="text-rose-500">*</span>
                        </label>
                        <select
                            value={form.viewScheduleReturnDays}
                            onChange={(e) => handleInputChange('viewScheduleReturnDays', parseInt(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white"
                        >
                            <option value={5}>5 dia(s)</option>
                            <option value={10}>10 dia(s)</option>
                            <option value={15}>15 dia(s)</option>
                            <option value={30}>30 dia(s)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Profissional Regulador <span className="text-rose-500">*</span>
                        </label>
                        <select
                            value={form.viewScheduleRegulatorDays}
                            onChange={(e) => handleInputChange('viewScheduleRegulatorDays', parseInt(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white"
                        >
                            <option value={15}>15 dia(s)</option>
                            <option value={30}>30 dia(s)</option>
                            <option value={45}>45 dia(s)</option>
                            <option value={60}>60 dia(s)</option>
                            <option value={90}>90 dia(s)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Agendamento automático <span className="text-rose-500">*</span>
                        </label>
                        <select
                            value={form.viewScheduleAutoDays}
                            onChange={(e) => handleInputChange('viewScheduleAutoDays', parseInt(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white"
                        >
                            <option value={15}>15 dia(s)</option>
                            <option value={30}>30 dia(s)</option>
                            <option value={45}>45 dia(s)</option>
                            <option value={60}>60 dia(s)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* CARD 3: DISPONIBILIZAÇÃO DAS AGENDAS PARA */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Disponibilização das agendas para
                    </span>
                    <div className="relative group cursor-pointer text-amber-500">
                        <HelpCircle className="w-4 h-4" />
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 p-2.5 bg-slate-900 text-white text-[11px] rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                            Define a partir de quantos dias de antecedência a agenda ficará visível no sistema.
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            1ª Vez <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="number"
                            min={0}
                            value={form.releaseScheduleFirstTimeDays}
                            onChange={(e) => handleInputChange('releaseScheduleFirstTimeDays', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Retorno <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="number"
                            min={0}
                            value={form.releaseScheduleReturnDays}
                            onChange={(e) => handleInputChange('releaseScheduleReturnDays', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Profissional Regulador <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="number"
                            min={0}
                            value={form.releaseScheduleRegulatorDays}
                            onChange={(e) => handleInputChange('releaseScheduleRegulatorDays', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Agendamento automático <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="number"
                            min={0}
                            value={form.releaseScheduleAutoDays}
                            onChange={(e) => handleInputChange('releaseScheduleAutoDays', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white"
                        />
                    </div>
                </div>
            </div>

            {/* BOTÕES DE AÇÃO DO RODAPÉ */}
            <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-4">
                    <button
                        type="submit"
                        disabled={createProcMutation.isPending || updateProcMutation.isPending}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold text-sm transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                        {(createProcMutation.isPending || updateProcMutation.isPending) && (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                        SALVAR
                    </button>

                    <button
                        type="button"
                        onClick={handleClear}
                        className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                        LIMPAR
                    </button>
                </div>

                <button
                    type="button"
                    onClick={handleBack}
                    className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                >
                    VOLTAR
                </button>
            </div>

            {/* MODAL DE BUSCA INTEGRA SUS API */}
            {isSearchModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-2xl w-full shadow-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Database className="w-5 h-5 text-blue-600" />
                                    Importação INTEGRA SUS API
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Consulte a tabela oficial SUS para preenchimento automático das regras
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsSearchModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Campo de pesquisa no modal */}
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            setEnableSearchQuery(true);
                                        }
                                    }}
                                    placeholder="Digite o código (ex: 0205020186) ou nome do procedimento..."
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                                    autoFocus
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => setEnableSearchQuery(true)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold transition-colors flex items-center gap-1.5"
                            >
                                {searchingIntegraSus ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                Buscar
                            </button>
                        </div>

                        {/* Lista de Resultados */}
                        <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-md">
                            {searchingIntegraSus ? (
                                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                                    <span className="text-xs">Consultando INTEGRA SUS...</span>
                                </div>
                            ) : searchResults && searchResults.length > 0 ? (
                                searchResults.map((item: any, idx: number) => {
                                    const code = item.co_procedimento || item.codigo || item.code || '';
                                    const name = item.no_procedimento || item.nome || item.name || '';
                                    const val = item.vl_sa ? Number(item.vl_sa).toFixed(2) : '0.00';
                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => handleSelectIntegraSusItem(item)}
                                            className="p-3 hover:bg-blue-50/50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors flex items-center justify-between"
                                        >
                                            <div className="min-w-0 pr-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                                                        {code}
                                                    </span>
                                                    <span className="text-xs text-slate-500">R$ {val}</span>
                                                </div>
                                                <span className="block text-sm font-medium text-slate-900 dark:text-white mt-1 truncate">
                                                    {name}
                                                </span>
                                            </div>
                                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0">
                                                Selecionar →
                                            </span>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="py-10 text-center text-xs text-slate-400">
                                    {searchTerm.length < 2 ? 'Digite ao menos 2 caracteres para pesquisar' : 'Nenhum resultado encontrado no INTEGRA SUS.'}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                onClick={() => setIsSearchModalOpen(false)}
                                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-md text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </form>
    );
};
