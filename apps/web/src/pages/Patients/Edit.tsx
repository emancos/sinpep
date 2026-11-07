import React, { useState, useEffect } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { usePatient, useUpdatePatient, checkPatientUnique } from '../../hooks/usePatients';
import { useHealthCenters } from '../../hooks/useHealthCenters';
import { useHealthAgents } from '../../hooks/useHealthAgents';
import { useAuthStore } from '../../store/useAuthStore';
import { toast } from 'sonner';
import { fetchAddressByCep } from '../../services/viacep';
import { formatDateBR } from '../../utils/brazilianFormatters';
import {
    ArrowLeft,
    User,
    MapPin,
    Phone,
    Building,
    Check,
    Plus,
    Trash2,
    Loader2,
    Info,
    ChevronRight,
    ChevronLeft
} from 'lucide-react';

const editPatientSchema = zod.object({
    name: zod.string().min(3, 'O nome deve ter no mínimo 3 caracteres'),
    cpf: zod.string().refine((val) => {
        const clean = val.replace(/\D/g, '');
        return clean.length === 11;
    }, 'CPF inválido (deve conter 11 dígitos)'),
    cns: zod.string().optional().refine((val) => {
        if (!val) return true;
        const clean = val.replace(/\D/g, '');
        return clean.length === 15;
    }, 'CNS deve conter exatamente 15 dígitos'),
    birthDate: zod.string().refine((val) => {
        return !isNaN(Date.parse(val));
    }, 'Data de nascimento inválida'),
    gender: zod.string().min(1, 'Selecione o gênero'),
    healthCenterId: zod.string().uuid('Selecione uma UBS válida'),
    healthAgentId: zod.string().optional(),

    // Endereço (Opcional)
    zipCode: zod.string().optional(),
    street: zod.string().optional(),
    number: zod.string().optional(),
    complement: zod.string().optional(),
    neighborhood: zod.string().optional(),
    city: zod.string().optional(),
    state: zod.string().optional(),
    ibgeCode: zod.string().optional(),

    // Regra de Contatos
    noPhone: zod.boolean(),
    phones: zod.array(
        zod.object({
            phoneNumber: zod.string().min(8, 'Telefone muito curto'),
            isWhatsapp: zod.boolean(),
        })
    ).optional(),
}).superRefine((data, ctx) => {
    if (!data.noPhone) {
        if (!data.phones || data.phones.length === 0) {
            ctx.addIssue({
                code: zod.ZodIssueCode.custom,
                path: ['phones'],
                message: 'Adicione pelo menos um telefone ou marque a opção "Contactar Agente de Saúde"',
            });
        }
    }
});

type FormData = zod.infer<typeof editPatientSchema>;

const parseAddressString = (addressString?: string | null) => {
    const defaultAddress = {
        zipCode: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: 'PB',
        ibgeCode: '',
    };

    if (!addressString) return defaultAddress;

    try {
        const parts = addressString.split(' - ').map((p) => p.trim());

        let zipCode = '';
        let neighborhood = '';
        let city = '';
        let state = 'PB';
        let street = '';
        let number = '';
        let complement = '';

        // 1. Check if the last part is CEP
        const lastPart = parts[parts.length - 1];
        if (lastPart && lastPart.startsWith('CEP:')) {
            zipCode = lastPart.replace('CEP:', '').trim();
            parts.pop();
        }

        // 2. The first part is usually street, number, and complement
        const firstPart = parts[0];
        if (firstPart) {
            let remaining = firstPart;

            const compStart = remaining.indexOf('(');
            const compEnd = remaining.lastIndexOf(')');
            if (compStart !== -1 && compEnd !== -1 && compEnd > compStart) {
                complement = remaining.substring(compStart + 1, compEnd).trim();
                remaining = remaining.substring(0, compStart).trim();
            }

            const commaIndex = remaining.lastIndexOf(',');
            if (commaIndex !== -1) {
                number = remaining.substring(commaIndex + 1).trim();
                street = remaining.substring(0, commaIndex).trim();
            } else {
                street = remaining;
            }
            parts.shift();
        }

        // 3. Now check what is left
        if (parts.length === 2) {
            neighborhood = parts[0];
            const cityStatePart = parts[1];
            if (cityStatePart.includes('/')) {
                const [c, s] = cityStatePart.split('/');
                city = c.trim();
                state = s.trim();
            } else {
                city = cityStatePart;
            }
        } else if (parts.length === 1) {
            const cityStatePart = parts[0];
            if (cityStatePart.includes('/')) {
                const [c, s] = cityStatePart.split('/');
                city = c.trim();
                state = s.trim();
            } else {
                neighborhood = cityStatePart;
            }
        }

        return {
            zipCode,
            street,
            number,
            complement,
            neighborhood,
            city,
            state,
            ibgeCode: '',
        };
    } catch (error) {
        console.error('Error parsing address string:', error);
        return defaultAddress;
    }
};

const formatCPF = (cpf?: string | null) => {
    if (!cpf || cpf.toUpperCase().startsWith('SUS')) return '';
    const clean = cpf.replace(/\D/g, '');
    if (clean.length <= 3) return clean;
    if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
    if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
};

const formatCNS = (cns?: string | null) => {
    if (!cns) return '';
    const clean = cns.replace(/\D/g, '').slice(0, 15);
    if (clean.length <= 3) return clean;
    if (clean.length <= 7) return `${clean.slice(0, 3)} ${clean.slice(3)}`;
    if (clean.length <= 11) return `${clean.slice(0, 3)} ${clean.slice(3, 7)} ${clean.slice(7)}`;
    return `${clean.slice(0, 3)} ${clean.slice(3, 7)} ${clean.slice(7, 11)} ${clean.slice(11, 15)}`;
};

const formatPhone = (phone: string) => {
    const clean = phone.replace(/\D/g, '').slice(0, 11);
    if (clean.length <= 2) return clean.length > 0 ? `(${clean}` : '';
    if (clean.length <= 6) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
    if (clean.length <= 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`;
};

export const EditPatient: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [isLoadingCep, setIsLoadingCep] = useState(false);

    const { data: patient, isLoading: loadingPatient, error: patientError } = usePatient(id || '');
    const updatePatientMutation = useUpdatePatient();

    // Load UBS/HealthCenters for selection
    const { data: healthCentersData, isLoading: loadingCenters } = useHealthCenters({
        page: 1,
        limit: 200,
        sortBy: 'name',
        sortOrder: 'asc',
    });

    // Load ACS/HealthAgents
    const { data: healthAgentsData, isLoading: loadingAgents } = useHealthAgents({
        page: 1,
        limit: 500,
        sortBy: 'name',
        sortOrder: 'asc',
    });

    const {
        control,
        handleSubmit,
        trigger,
        watch,
        setValue,
        clearErrors,
        setError,
        reset,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(editPatientSchema),
        mode: 'onChange',
        defaultValues: {
            name: '',
            cpf: '',
            cns: '',
            birthDate: '',
            gender: '',
            healthCenterId: '',
            healthAgentId: '',
            zipCode: '',
            street: '',
            number: '',
            complement: '',
            neighborhood: '',
            city: '',
            state: 'PB',
            ibgeCode: '',
            noPhone: false,
            phones: [{ phoneNumber: '', isWhatsapp: false }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'phones',
    });

    const selectedHealthCenterId = watch('healthCenterId');
    const noPhoneValue = watch('noPhone');
    const watchPhones = watch('phones') || [];

    // Filter health agents locally based on selected health center
    const filteredAgents = healthAgentsData?.data.filter(
        (agent) => agent.healthCenterId === selectedHealthCenterId
    ) || [];

    // Initialize form when patient data is loaded
    useEffect(() => {
        if (patient) {
            const parsedAddress = parseAddressString(patient.address);
            const isNoPhone = patient.phones.some((p) => p.phoneNumber === 'Contactar Agente de Saúde');
            const phones = isNoPhone
                ? [{ phoneNumber: '', isWhatsapp: false }]
                : patient.phones.map((p) => ({ phoneNumber: formatPhone(p.phoneNumber), isWhatsapp: p.isWhatsapp }));

            const formattedBirthDate = patient.birthDate ? patient.birthDate.split('T')[0] : '';

            reset({
                name: patient.name,
                cpf: formatCPF(patient.cpf),
                cns: patient.cns ? formatCNS(patient.cns) : '',
                birthDate: formattedBirthDate,
                gender: patient.gender,
                healthCenterId: patient.healthCenterId,
                healthAgentId: patient.healthAgentId || '',
                noPhone: isNoPhone,
                phones,
                ...parsedAddress,
            });
        }
    }, [patient, reset]);

    // Handle phone validation bypassing when checking "Contactar Agente de Saúde"
    useEffect(() => {
        if (noPhoneValue) {
            setValue('phones', []);
        } else if (fields.length === 0) {
            setValue('phones', [{ phoneNumber: '', isWhatsapp: false }]);
        }
    }, [noPhoneValue, setValue]);

    const token = useAuthStore((state) => state.token);

    const handleCpfBlur = async (cpfValue: string) => {
        const cleanCpf = cpfValue.replace(/\D/g, '');
        if (cleanCpf.length === 11) {
            try {
                const res = await checkPatientUnique(token as string, { cpf: cleanCpf, excludeId: id });
                if (!res.isUnique) {
                    setError('cpf', { type: 'manual', message: res.message });
                } else if (errors.cpf?.type === 'manual') {
                    clearErrors('cpf');
                }
            } catch (error) {
                console.error('Error checking CPF', error);
            }
        }
    };

    const handleCnsBlur = async (cnsValue: string) => {
        const cleanCns = cnsValue.replace(/\D/g, '');
        if (cleanCns.length === 15) {
            try {
                const res = await checkPatientUnique(token as string, { cns: cleanCns, excludeId: id });
                if (!res.isUnique) {
                    setError('cns', { type: 'manual', message: res.message });
                } else if (errors.cns?.type === 'manual') {
                    clearErrors('cns');
                }
            } catch (error) {
                console.error('Error checking CNS', error);
            }
        }
    };

    const formatCEP = (cep: string) => {
        const clean = cep.replace(/\D/g, '').slice(0, 8);
        if (clean.length <= 5) return clean;
        return `${clean.slice(0, 5)}-${clean.slice(5)}`;
    };

    const handleCepBlur = async (cepValue: string) => {
        const cleanCep = cepValue.replace(/\D/g, '');
        if (!cleanCep) return;

        if (cleanCep.length !== 8) {
            toast.warning('Formato de CEP inválido.');
            return;
        }

        setIsLoadingCep(true);
        setValue('street', 'Buscando...');
        setValue('neighborhood', 'Buscando...');
        setValue('city', 'Buscando...');
        setValue('state', '...');

        try {
            const address = await fetchAddressByCep(cleanCep);
            setValue('street', address.logradouro);
            setValue('neighborhood', address.bairro);
            setValue('city', address.localidade);
            setValue('state', address.uf);
            setValue('ibgeCode', address.ibge);
            clearErrors(['street', 'neighborhood', 'city', 'state']);
        } catch (error: any) {
            setValue('street', '');
            setValue('neighborhood', '');
            setValue('city', '');
            setValue('state', 'PB');
            setValue('ibgeCode', '');

            if (error.message === 'CEP não encontrado') {
                toast.error('CEP não encontrado.');
            } else {
                toast.error('Erro ao consultar o CEP. Tente preencher manualmente.');
            }
        } finally {
            setIsLoadingCep(false);
        }
    };

    const handleNextStep = async () => {
        let fieldsToValidate: (keyof FormData)[] = [];
        if (step === 1) {
            fieldsToValidate = ['name', 'cpf', 'cns', 'birthDate', 'gender'];
        } else if (step === 2) {
            fieldsToValidate = ['healthCenterId', 'healthAgentId', 'zipCode', 'street', 'number', 'complement', 'neighborhood', 'city', 'state'];
        }

        const isStepValid = await trigger(fieldsToValidate);
        if (isStepValid) {
            setStep((prev) => prev + 1);
        }
    };

    const handlePrevStep = () => {
        setStep((prev) => prev - 1);
    };

    // Build a single concatenated string from the address options
    const buildAddressString = (data: FormData) => {
        const parts = [];
        if (data.street) {
            let streetPart = data.street.trim();
            if (data.number) streetPart += `, ${data.number.trim()}`;
            if (data.complement) streetPart += ` (${data.complement.trim()})`;
            parts.push(streetPart);
        }
        if (data.neighborhood) parts.push(data.neighborhood.trim());
        if (data.city) {
            let cityPart = data.city.trim();
            if (data.state) cityPart += `/${data.state.trim()}`;
            parts.push(cityPart);
        }
        if (data.zipCode) parts.push(`CEP: ${data.zipCode.trim()}`);
        return parts.join(' - ');
    };

    const onSubmit = (data: FormData) => {
        if (!id) return;
        const addressString = buildAddressString(data);

        // Resolve phones payload
        let resolvedPhones = data.phones || [];
        if (data.noPhone) {
            resolvedPhones = [{ phoneNumber: 'Contactar Agente de Saúde', isWhatsapp: false }];
        }

        const payload = {
            name: data.name,
            cpf: data.cpf.replace(/\D/g, ''),
            cns: data.cns ? data.cns.replace(/\D/g, '') : undefined,
            birthDate: new Date(data.birthDate).toISOString(),
            gender: data.gender,
            healthCenterId: data.healthCenterId,
            healthAgentId: data.healthAgentId || undefined,
            address: addressString || undefined,
            phones: resolvedPhones,
        };

        updatePatientMutation.mutate({
            id,
            data: payload,
        }, {
            onSuccess: () => {
                toast.success('Cadastro do paciente atualizado com sucesso!');
                navigate('/patients');
            },
            onError: (err) => {
                console.error(err);
                toast.error('Ocorreu um erro ao atualizar o paciente.');
            },
        });
    };

    const steps = [
        { number: 1, title: 'Identificação', description: 'Dados Demográficos', icon: User },
        { number: 2, title: 'Vínculo & Endereço', description: 'Unidade, ACS e Local', icon: Building },
        { number: 3, title: 'Contatos & Revisão', description: 'Telefones e Confirmação', icon: Phone },
    ];

    if (loadingPatient) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Carregando dados do paciente...</span>
            </div>
        );
    }

    if (patientError || !patient) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                <Info className="w-12 h-12 text-rose-700 dark:text-rose-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Paciente não encontrado</h2>
                <button
                    onClick={() => navigate('/patients')}
                    className="mt-2 px-4 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 rounded-md text-sm cursor-pointer shadow-md"
                >
                    Voltar para a Lista
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header Banner */}
            <div className="flex items-center gap-4">
                <button
                    type="button"
                    onClick={() => navigate('/patients')}
                    className="flex items-center justify-center w-10 h-10 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 transition-all cursor-pointer shadow-md"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Editar Paciente</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5 font-mono text-xs">ID: {patient.id}</p>
                </div>
            </div>

            {/* Progress Tracker */}
            <div className="grid grid-cols-3 gap-4 bg-white shadow-md dark:bg-slate-900/40 border border-slate-900 rounded-md p-4 backdrop-blur-md">
                {steps.map((s) => {
                    const Icon = s.icon;
                    const isCompleted = step > s.number;
                    const isActive = step === s.number;

                    return (
                        <div
                            key={s.number}
                            className={`flex items-center gap-3 p-2.5 rounded-md transition-all duration-300 ${isActive
                                    ? 'bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-slate-900 dark:text-white'
                                    : isCompleted
                                        ? 'text-teal-600 dark:text-teal-400'
                                        : 'text-slate-500'
                                }`}
                        >
                            <div
                                className={`w-9 h-9 rounded-md flex items-center justify-center font-bold text-sm shrink-0 ${isActive
                                        ? 'bg-blue-500 text-white'
                                        : isCompleted
                                            ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400'
                                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                                    }`}
                            >
                                {isCompleted ? <Check className="w-4.5 h-4.5" /> : <Icon className="w-4.5 h-4.5" />}
                            </div>
                            <div className="hidden sm:block min-w-0">
                                <span className="block text-[10px] font-semibold uppercase tracking-wider opacity-60">
                                    {s.title}
                                </span>
                                <span className="block text-xs font-medium truncate mt-0.5">
                                    {s.description}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Form Card */}
            <form onSubmit={handleSubmit(onSubmit)} className="bg-white shadow-md dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-md p-6 backdrop-blur-md space-y-6">

                {/* STEP 1: Demographic data */}
                {step === 1 && (
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Dados de Identificação</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Preencha os dados pessoais fundamentais do paciente.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                            placeholder="Ex: João da Silva"
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                                        />
                                    )}
                                />
                                {errors.name && <p className="text-rose-700 dark:text-rose-500 text-xs">{errors.name.message}</p>}
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    CPF (Cadastro de Pessoa Física)
                                </label>
                                <Controller
                                    name="cpf"
                                    control={control}
                                    render={({ field }) => (
                                        <input
                                            {...field}
                                            type="text"
                                            placeholder="Ex: 000.000.000-00"
                                            onChange={(e) => field.onChange(formatCPF(e.target.value))}
                                            onBlur={(e) => {
                                                field.onBlur();
                                                handleCpfBlur(e.target.value);
                                            }}
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
                                        />
                                    )}
                                />
                                {errors.cpf && <p className="text-rose-700 dark:text-rose-500 text-xs">{errors.cpf.message}</p>}
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    CNS (Cartão Nacional de Saúde - Opcional)
                                </label>
                                <Controller
                                    name="cns"
                                    control={control}
                                    render={({ field }) => (
                                        <input
                                            {...field}
                                            type="text"
                                            placeholder="Ex: 000000000000000"
                                            onChange={(e) => field.onChange(formatCNS(e.target.value))}
                                            onBlur={(e) => {
                                                field.onBlur();
                                                handleCnsBlur(e.target.value);
                                            }}
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
                                        />
                                    )}
                                />
                                {errors.cns && <p className="text-rose-700 dark:text-rose-500 text-xs">{errors.cns.message}</p>}
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    Data de Nascimento
                                </label>
                                <Controller
                                    name="birthDate"
                                    control={control}
                                    render={({ field }) => (
                                        <input
                                            {...field}
                                            type="date"
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                                        />
                                    )}
                                />
                                {errors.birthDate && <p className="text-rose-700 dark:text-rose-500 text-xs">{errors.birthDate.message}</p>}
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    Gênero
                                </label>
                                <Controller
                                    name="gender"
                                    control={control}
                                    render={({ field }) => (
                                        <select
                                            {...field}
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                                        >
                                            <option value="">Selecione...</option>
                                            <option value="MASCULINO">Masculino</option>
                                            <option value="FEMININO">Feminino</option>
                                            <option value="OUTRO">Outro</option>
                                        </select>
                                    )}
                                />
                                {errors.gender && <p className="text-rose-700 dark:text-rose-500 text-xs">{errors.gender.message}</p>}
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 2: Health Link & Optional Address */}
                {step === 2 && (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Vínculo de Saúde Territorial</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Vincule o paciente a uma Unidade e Agente de Saúde.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        UBS (Unidade Básica de Saúde)
                                    </label>
                                    <Controller
                                        name="healthCenterId"
                                        control={control}
                                        render={({ field }) => (
                                            <select
                                                {...field}
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                                            >
                                                <option value="">Selecione a UBS...</option>
                                                {loadingCenters ? (
                                                    <option>Carregando unidades...</option>
                                                ) : (
                                                    healthCentersData?.data.map((c) => (
                                                        <option key={c.id} value={c.id}>
                                                            {c.name} {c.cnes ? `(CNES: ${c.cnes})` : ''}
                                                        </option>
                                                    ))
                                                )}
                                            </select>
                                        )}
                                    />
                                    {errors.healthCenterId && <p className="text-rose-700 dark:text-rose-500 text-xs">{errors.healthCenterId.message}</p>}
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        ACS (Agente Comunitário de Saúde - Opcional)
                                    </label>
                                    <Controller
                                        name="healthAgentId"
                                        control={control}
                                        render={({ field }) => (
                                            <select
                                                {...field}
                                                disabled={!selectedHealthCenterId}
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <option value="">
                                                    {!selectedHealthCenterId
                                                        ? 'Selecione primeiro uma UBS'
                                                        : 'Selecione o Agente...'}
                                                </option>
                                                {loadingAgents ? (
                                                    <option>Carregando agentes...</option>
                                                ) : (
                                                    filteredAgents.map((a) => (
                                                        <option key={a.id} value={a.id}>
                                                            {a.name} {a.microArea ? `(M.Área: ${a.microArea})` : ''}
                                                        </option>
                                                    ))
                                                )}
                                            </select>
                                        )}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-300 dark:border-slate-800/40">
                            <div>
                                <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    <span>Endereço do Paciente (Opcional)</span>
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Preencha as informações do endereço residencial do paciente.</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-1 sm:col-span-1">
                                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        CEP
                                    </label>
                                    <Controller
                                        name="zipCode"
                                        control={control}
                                        render={({ field }) => (
                                            <input
                                                {...field}
                                                type="text"
                                                placeholder="Ex: 58000-000"
                                                onChange={(e) => field.onChange(formatCEP(e.target.value))}
                                                onBlur={(e) => {
                                                    field.onBlur();
                                                    handleCepBlur(e.target.value);
                                                }}
                                                disabled={isLoadingCep}
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                                            />
                                        )}
                                    />
                                </div>

                                <div className="space-y-1 sm:col-span-2">
                                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Logradouro (Rua, Avenida, Travessa)
                                    </label>
                                    <Controller
                                        name="street"
                                        control={control}
                                        render={({ field }) => (
                                            <input
                                                {...field}
                                                type="text"
                                                placeholder="Ex: Rua das Palmeiras"
                                                disabled={isLoadingCep}
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                                            />
                                        )}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Número
                                    </label>
                                    <Controller
                                        name="number"
                                        control={control}
                                        render={({ field }) => (
                                            <input
                                                {...field}
                                                type="text"
                                                placeholder="Ex: 123"
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                                            />
                                        )}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Complemento
                                    </label>
                                    <Controller
                                        name="complement"
                                        control={control}
                                        render={({ field }) => (
                                            <input
                                                {...field}
                                                type="text"
                                                placeholder="Ex: Bloco B Apt 201"
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                                            />
                                        )}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Bairro
                                    </label>
                                    <Controller
                                        name="neighborhood"
                                        control={control}
                                        render={({ field }) => (
                                            <input
                                                {...field}
                                                type="text"
                                                placeholder="Ex: Centro"
                                                disabled={isLoadingCep}
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                                            />
                                        )}
                                    />
                                </div>

                                <div className="space-y-1 sm:col-span-2">
                                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Cidade
                                    </label>
                                    <Controller
                                        name="city"
                                        control={control}
                                        render={({ field }) => (
                                            <input
                                                {...field}
                                                type="text"
                                                placeholder="Ex: João Pessoa"
                                                disabled={isLoadingCep}
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                                            />
                                        )}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Estado (UF)
                                    </label>
                                    <Controller
                                        name="state"
                                        control={control}
                                        render={({ field }) => (
                                            <input
                                                {...field}
                                                type="text"
                                                placeholder="Ex: PB"
                                                maxLength={2}
                                                disabled={isLoadingCep}
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 uppercase font-mono disabled:opacity-50"
                                            />
                                        )}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 3: Contacts, review & submit */}
                {step === 3 && (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Contatos Telefônicos</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Adicione contatos válidos ou indique necessidade de contato alternativo.</p>
                            </div>

                            {/* Toggle No Phone */}
                            <div className="p-4 bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 rounded-md flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 block">Paciente não possui telefone</span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400 block">
                                        Utilizar a marcação "Contactar Agente de Saúde" para este paciente.
                                    </span>
                                </div>
                                <Controller
                                    name="noPhone"
                                    control={control}
                                    render={({ field }) => (
                                        <input
                                            type="checkbox"
                                            checked={field.value}
                                            onChange={(e) => field.onChange(e.target.checked)}
                                            className="w-5 h-5 accent-blue-500 bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800 rounded-md cursor-pointer shadow-md"
                                        />
                                    )}
                                />
                            </div>

                            {/* Phone fields array */}
                            {!noPhoneValue && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Lista de Telefones</span>
                                        <button
                                            type="button"
                                            onClick={() => append({ phoneNumber: '', isWhatsapp: false })}
                                            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-100 dark:bg-blue-500/10 hover:bg-blue-200 dark:hover:bg-blue-500/20 border border-blue-500/10 rounded-md cursor-pointer shadow-md transition-all"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>Adicionar Telefone</span>
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {fields.map((f, index) => (
                                            <div key={f.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white dark:bg-slate-950/20 p-3 border border-slate-200 dark:border-slate-850 rounded-md">
                                                <div className="flex-1 w-full space-y-1">
                                                    <Controller
                                                        name={`phones.${index}.phoneNumber`}
                                                        control={control}
                                                        render={({ field }) => (
                                                            <input
                                                                {...field}
                                                                type="text"
                                                                placeholder="Ex: (83) 99999-9999"
                                                                onChange={(e) => field.onChange(formatPhone(e.target.value))}
                                                                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
                                                            />
                                                        )}
                                                    />
                                                    {errors.phones?.[index]?.phoneNumber && (
                                                        <p className="text-rose-700 dark:text-rose-500 text-xs">{errors.phones[index].phoneNumber.message}</p>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-4 w-full sm:w-auto shrink-0 justify-between sm:justify-start">
                                                    <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 select-none cursor-pointer">
                                                        <Controller
                                                            name={`phones.${index}.isWhatsapp`}
                                                            control={control}
                                                            render={({ field }) => (
                                                                <input
                                                                    type="checkbox"
                                                                    checked={field.value}
                                                                    onChange={(e) => field.onChange(e.target.checked)}
                                                                    className="w-4 h-4 accent-emerald-500 rounded-md bg-white dark:bg-slate-950"
                                                                />
                                                            )}
                                                        />
                                                        <span>É WhatsApp</span>
                                                    </label>

                                                    <button
                                                        type="button"
                                                        onClick={() => remove(index)}
                                                        disabled={fields.length === 1}
                                                        className="p-2 text-rose-700 dark:text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                                        title="Remover"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {errors.phones && !Array.isArray(errors.phones) && (
                                        <p className="text-rose-700 dark:text-rose-500 text-xs">{errors.phones.message}</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Complete Data Review */}
                        <div className="space-y-4 pt-4 border-t border-slate-300 dark:border-slate-800/40">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Revisão dos Dados</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Verifique com atenção todos os campos antes de confirmar o salvamento.</p>
                            </div>

                            <div className="bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 rounded-md p-5 space-y-4 text-sm">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-xs text-slate-500 block">Nome Completo</span>
                                        <span className="text-slate-700 dark:text-slate-200 font-semibold">{watch('name') || '-'}</span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-slate-500 block">CPF</span>
                                        <span className="text-slate-700 dark:text-slate-200 font-mono font-semibold">{watch('cpf') || '-'}</span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-slate-500 block">CNS</span>
                                        <span className="text-slate-700 dark:text-slate-200 font-mono">{watch('cns') || 'Não informado'}</span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-slate-500 block">Data de Nascimento</span>
                                        <span className="text-slate-700 dark:text-slate-200">
                                            {watch('birthDate')
                                                ? formatDateBR(watch('birthDate'))
                                                : '-'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-slate-500 block">Gênero</span>
                                        <span className="text-slate-700 dark:text-slate-200 capitalize">{watch('gender')?.toLowerCase() || '-'}</span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-slate-500 block">UBS</span>
                                        <span className="text-slate-700 dark:text-slate-200 font-semibold">
                                            {healthCentersData?.data.find((c) => c.id === selectedHealthCenterId)?.name || '-'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-slate-500 block">ACS (Agente)</span>
                                        <span className="text-slate-700 dark:text-slate-200">
                                            {filteredAgents.find((a) => a.id === watch('healthAgentId'))?.name || 'Não vinculado'}
                                        </span>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <span className="text-xs text-slate-500 block">Endereço Residencial</span>
                                        <span className="text-slate-700 dark:text-slate-200 break-words font-medium">
                                            {buildAddressString(watch() as FormData) || 'Não informado (Sem endereço)'}
                                        </span>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <span className="text-xs text-slate-500 block">Contatos de Telefone</span>
                                        {noPhoneValue ? (
                                            <span className="inline-flex items-center gap-1.5 mt-1 text-amber-600 dark:text-amber-400 font-medium bg-amber-100 dark:bg-amber-500/10 px-2.5 py-0.5 border border-amber-200 dark:border-amber-500/20 rounded-md text-xs">
                                                <Info className="w-3.5 h-3.5" />
                                                <span>Contactar Agente de Saúde</span>
                                            </span>
                                        ) : (
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {watchPhones.map((p, idx) => (
                                                    p.phoneNumber ? (
                                                        <span
                                                            key={idx}
                                                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs rounded-md border ${p.isWhatsapp
                                                                    ? 'bg-emerald-100 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                                                    : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                                                                }`}
                                                        >
                                                            <span>{p.phoneNumber}</span>
                                                            {p.isWhatsapp && <span className="text-[10px] font-bold tracking-tight bg-emerald-500/20 px-1 rounded-md">W</span>}
                                                        </span>
                                                    ) : null
                                                ))}
                                                {watchPhones.filter(p => p.phoneNumber).length === 0 && (
                                                    <span className="text-slate-500 italic">Nenhum telefone adicionado</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-between pt-4 border-t border-slate-300 dark:border-slate-800/40">
                    {step > 1 ? (
                        <button
                            key="prev-btn"
                            type="button"
                            onClick={handlePrevStep}
                            className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 hover:border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 rounded-md text-sm font-semibold transition-all cursor-pointer"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            <span>Voltar</span>
                        </button>
                    ) : (
                        <div key="prev-placeholder" />
                    )}

                    {step < 3 ? (
                        <button
                            key="next-btn"
                            type="button"
                            onClick={handleNextStep}
                            className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-sm font-semibold shadow-md transition-all cursor-pointer"
                        >
                            <span>Avançar</span>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            key="submit-btn"
                            type="submit"
                            disabled={updatePatientMutation.isPending}
                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                        >
                            {updatePatientMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Salvando...</span>
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    <span>Confirmar e Salvar</span>
                                </>
                            )}
                        </button>
                    )} </div>
            </form>
        </div>
    );
};
