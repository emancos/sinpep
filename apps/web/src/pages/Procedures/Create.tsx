import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import {
    useProcedure,
    useProcedureGroups,
    useCreateProcedureGroup,
    useCreateProcedure,
    useUpdateProcedure
} from '../../hooks/useProcedures';
import { toast } from 'sonner';
import {
    ArrowLeft,
    Check,
    Loader2,
    ChevronLeft,
    ChevronRight,
    Plus,
    X
} from 'lucide-react';

const procedureSchema = zod.object({
    code: zod.string().min(1, 'O código é obrigatório'),
    name: zod.string().min(3, 'O nome deve ter no mínimo 3 caracteres'),
    procedureGroupId: zod.string().min(1, 'Selecione o grupo do procedimento'),
    genderAllowed: zod.enum(['AMBOS', 'FEMININO', 'MASCULINO']),
    minAge: zod.number().int().min(0, 'A idade mínima deve ser no mínimo 0').max(130, 'A idade mínima não pode passar de 130'),
    maxAge: zod.number().int().min(0, 'A idade máxima deve ser no mínimo 0').max(130, 'A idade máxima não pode passar de 130'),
}).refine((data) => data.minAge <= data.maxAge, {
    message: 'A idade mínima não pode ser maior que a idade máxima',
    path: ['maxAge'],
});

type ProcedureFormData = zod.infer<typeof procedureSchema>;

export const CreateOrEditProcedure: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEditMode = !!id;

    const [step, setStep] = useState(1);
    const [isNewGroupInputOpen, setIsNewGroupInputOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');

    // Queries & Mutations
    const { data: procedureData, isLoading: isLoadingProcedure } = useProcedure(id || '');
    const { data: groupsData, isLoading: isLoadingGroups } = useProcedureGroups();

    const createGroupMutation = useCreateProcedureGroup();
    const createProcedureMutation = useCreateProcedure();
    const updateProcedureMutation = useUpdateProcedure();

    const {
        control,
        handleSubmit,
        setValue,
        trigger,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<ProcedureFormData>({
        resolver: zodResolver(procedureSchema),
        defaultValues: {
            code: '',
            name: '',
            procedureGroupId: '',
            genderAllowed: 'AMBOS',
            minAge: 0,
            maxAge: 130,
        },
    });

    // Load existing data in Edit Mode
    useEffect(() => {
        if (isEditMode && procedureData) {
            reset({
                code: procedureData.code,
                name: procedureData.name,
                procedureGroupId: procedureData.procedureGroupId,
                genderAllowed: procedureData.genderAllowed,
                minAge: procedureData.minAge,
                maxAge: procedureData.maxAge,
            });
        }
    }, [isEditMode, procedureData, reset]);

    const handleNextStep = async () => {
        // Validate only Step 1 fields
        const step1Valid = await trigger(['code', 'name']);
        if (step1Valid) {
            setStep(2);
        }
    };

    const handlePrevStep = () => {
        setStep(1);
    };

    // Inline Procedure Group Creation
    const handleCreateNewGroup = async (e: React.MouseEvent) => {
        e.preventDefault();
        const cleanName = newGroupName.trim();
        if (!cleanName) {
            toast.error('Insira o nome do grupo.');
            return;
        }

        createGroupMutation.mutate(
            {
                name: cleanName.toUpperCase()
            },
            {
                onSuccess: (data) => {
                    toast.success(`Grupo "${data.name}" criado com sucesso!`);

                    // Auto-select the newly created group
                    setValue('procedureGroupId', data.id, { shouldValidate: true });

                    // Reset inline input states
                    setNewGroupName('');
                    setIsNewGroupInputOpen(false);
                },
                onError: (err) => {
                    console.error(err);
                    toast.error('Ocorreu um erro ao criar o grupo de procedimento.');
                },
            }
        );
    };

    // Submit Form
    const onSubmit = (data: ProcedureFormData) => {
        const payload = {
            code: data.code,
            name: data.name,
            procedureGroupId: data.procedureGroupId,
            genderAllowed: data.genderAllowed,
            minAge: data.minAge,
            maxAge: data.maxAge,
        };

        if (isEditMode && id) {
            updateProcedureMutation.mutate(
                { id, data: payload },
                {
                    onSuccess: () => {
                        toast.success('Procedimento atualizado com sucesso!');
                        navigate(`/procedures/${id}`);
                    },
                    onError: (err) => {
                        console.error(err);
                        toast.error('Ocorreu um erro ao atualizar o procedimento.');
                    },
                }
            );
        } else {
            createProcedureMutation.mutate(payload, {
                onSuccess: (newProc) => {
                    toast.success('Procedimento cadastrado com sucesso!');
                    navigate(`/procedures/${newProc.id}`);
                },
                onError: (err) => {
                    console.error(err);
                    toast.error('Ocorreu um erro ao cadastrar o procedimento. Verifique se o código já está em uso.');
                },
            });
        }
    };

    if (isEditMode && isLoadingProcedure) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4 font-sans">
                <Loader2 className="w-10 h-10 text-blue-700 dark:text-blue-500 animate-spin" />
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Carregando dados do procedimento...</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6 font-sans">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => (isEditMode ? navigate(`/procedures/${id}`) : navigate('/procedures'))}
                    className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-all cursor-pointer shadow-md"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {isEditMode ? 'Editar Procedimento' : 'Cadastrar Novo Procedimento'}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {isEditMode
                            ? 'Modifique os dados do procedimento e suas restrições de idade e sexo'
                            : 'Registre um novo procedimento ou exame para regulação'}
                    </p>
                </div>
            </div>

            {/* Form Steps Indicator */}
            <div className="bg-white shadow-md dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-colors ${step === 1
                            ? 'bg-blue-500 text-slate-950'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}>
                        1
                    </span>
                    <span className={`text-sm font-semibold transition-colors ${step === 1 ? 'text-slate-900 dark:text-white' : 'text-slate-500'
                        }`}>
                        Identificação do Procedimento
                    </span>
                </div>
                <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1 mx-6 hidden sm:block" />
                <div className="flex items-center gap-2.5">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-colors ${step === 2
                            ? 'bg-blue-500 text-slate-950'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}>
                        2
                    </span>
                    <span className={`text-sm font-semibold transition-colors ${step === 2 ? 'text-slate-900 dark:text-white' : 'text-slate-500'
                        }`}>
                        Grupo & Restrições de Solicitação
                    </span>
                </div>
            </div>

            {/* Main Form container */}
            <form onSubmit={handleSubmit(onSubmit)} className="bg-white shadow-md dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 backdrop-blur-md">
                {/* STEP 1: IDENTIFICATION */}
                {step === 1 && (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    Código (ex: SIGTAP/SUS)
                                </label>
                                <Controller
                                    name="code"
                                    control={control}
                                    render={({ field }) => (
                                        <input
                                            {...field}
                                            type="text"
                                            placeholder="Ex: 0204030188"
                                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500 transition-all text-sm font-mono font-medium"
                                        />
                                    )}
                                />
                                {errors.code && <p className="text-rose-700 dark:text-rose-500 text-xs mt-1 font-medium">{errors.code.message}</p>}
                            </div>

                            <div className="space-y-1 md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    Nome do Procedimento / Exame
                                </label>
                                <Controller
                                    name="name"
                                    control={control}
                                    render={({ field }) => (
                                        <input
                                            {...field}
                                            type="text"
                                            placeholder="Ex: Ultrassonografia de Abdome Total"
                                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500 transition-all text-sm font-medium"
                                        />
                                    )}
                                />
                                {errors.name && <p className="text-rose-700 dark:text-rose-500 text-xs mt-1 font-medium">{errors.name.message}</p>}
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-slate-300 dark:border-slate-800/60">
                            <button
                                type="button"
                                key="btn-advance"
                                onClick={handleNextStep}
                                className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-500 hover:bg-blue-450 text-slate-950 font-semibold rounded-xl text-sm transition-all duration-300 active:scale-95 cursor-pointer shadow-md"
                            >
                                <span>Avançar</span>
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 2: GROUP & RESTRICTIONS */}
                {step === 2 && (
                    <div className="space-y-6 animate-fade-in-up">
                        {/* Procedure Group Selection */}
                        <div className="space-y-3">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-2 border-b border-slate-300 dark:border-slate-800/40">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wider">
                                        Grupo do Procedimento
                                    </label>
                                    <p className="text-xxs text-slate-500">Selecione o grupo que engloba este procedimento.</p>
                                </div>

                                {/* Inline Creation Trigger */}
                                {!isNewGroupInputOpen ? (
                                    <button
                                        type="button"
                                        onClick={() => setIsNewGroupInputOpen(true)}
                                        className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors font-semibold cursor-pointer"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Novo Grupo</span>
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setIsNewGroupInputOpen(false)}
                                        className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-350 transition-colors font-semibold cursor-pointer"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                        <span>Fechar</span>
                                    </button>
                                )}
                            </div>

                            {/* Inline Group Creator */}
                            {isNewGroupInputOpen && (
                                <div className="space-y-3 p-3 bg-white dark:bg-slate-950/60 border border-slate-300 dark:border-slate-800 rounded-xl animate-fade-in">
                                    <div className="grid grid-cols-1 gap-3">
                                        <div className="space-y-1">
                                            <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-450 uppercase">Nome do Grupo</label>
                                            <input
                                                type="text"
                                                value={newGroupName}
                                                onChange={(e) => setNewGroupName(e.target.value)}
                                                placeholder="Ex: EXAMES DE IMAGEM"
                                                className="w-full px-3 py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 font-medium"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button
                                            type="button"
                                            disabled={createGroupMutation.isPending}
                                            onClick={handleCreateNewGroup}
                                            className="px-3 py-1.5 bg-blue-500 hover:bg-blue-450 text-slate-950 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-md"
                                        >
                                            {createGroupMutation.isPending ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Plus className="w-3.5 h-3.5" />
                                            )}
                                            <span>Salvar Grupo</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {isLoadingGroups ? (
                                <div className="flex items-center justify-center py-6 gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin text-slate-600" />
                                    <span className="text-xs text-slate-500 font-medium">Carregando grupos de procedimento...</span>
                                </div>
                            ) : (
                                <Controller
                                    name="procedureGroupId"
                                    control={control}
                                    render={({ field }) => (
                                        <select
                                            {...field}
                                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500 transition-all text-sm font-medium cursor-pointer shadow-md"
                                        >
                                            <option value="">Selecione um grupo...</option>
                                            {groupsData?.map((group) => (
                                                <option key={group.id} value={group.id}>
                                                    {group.name}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                />
                            )}
                            {errors.procedureGroupId && <p className="text-rose-700 dark:text-rose-500 text-xs font-medium">{errors.procedureGroupId.message}</p>}
                        </div>

                        {/* Restrictions: Gender and Age Limits */}
                        <div className="space-y-3 pt-2">
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wider pb-2 border-b border-slate-300 dark:border-slate-800/40">
                                Restrições para Solicitação
                            </label>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                                        Sexo Permitido
                                    </label>
                                    <Controller
                                        name="genderAllowed"
                                        control={control}
                                        render={({ field }) => (
                                            <select
                                                {...field}
                                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500 transition-all text-sm font-medium cursor-pointer shadow-md"
                                            >
                                                <option value="AMBOS">Ambos</option>
                                                <option value="FEMININO">Feminino</option>
                                                <option value="MASCULINO">Masculino</option>
                                            </select>
                                        )}
                                    />
                                    {errors.genderAllowed && <p className="text-rose-700 dark:text-rose-500 text-xs mt-1 font-medium">{errors.genderAllowed.message}</p>}
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                                        Idade Mínima (anos)
                                    </label>
                                    <Controller
                                        name="minAge"
                                        control={control}
                                        render={({ field }) => (
                                            <input
                                                {...field}
                                                type="number"
                                                min={0}
                                                max={130}
                                                onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500 transition-all text-sm font-mono font-medium"
                                            />
                                        )}
                                    />
                                    {errors.minAge && <p className="text-rose-700 dark:text-rose-500 text-xs mt-1 font-medium">{errors.minAge.message}</p>}
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                                        Idade Máxima (anos)
                                    </label>
                                    <Controller
                                        name="maxAge"
                                        control={control}
                                        render={({ field }) => (
                                            <input
                                                {...field}
                                                type="number"
                                                min={0}
                                                max={130}
                                                onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500 transition-all text-sm font-mono font-medium"
                                            />
                                        )}
                                    />
                                    {errors.maxAge && <p className="text-rose-700 dark:text-rose-500 text-xs mt-1 font-medium">{errors.maxAge.message}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Navigation buttons */}
                        <div className="flex justify-between pt-4 border-t border-slate-300 dark:border-slate-800/60">
                            <button
                                type="button"
                                key="btn-back"
                                onClick={handlePrevStep}
                                className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-200 dark:bg-slate-850 hover:bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-800 hover:border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium rounded-xl text-sm transition-all duration-300 active:scale-95 cursor-pointer shadow-md"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                <span>Voltar</span>
                            </button>

                            <button
                                type="submit"
                                key="btn-submit"
                                disabled={isSubmitting}
                                className="flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-all duration-300 active:scale-95 disabled:opacity-50 cursor-pointer shadow-md"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Salvando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        <span>{isEditMode ? 'Salvar Alterações' : 'Concluir Cadastro'}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </form>
        </div>
    );
};
