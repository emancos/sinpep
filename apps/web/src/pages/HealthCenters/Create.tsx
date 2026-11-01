import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useHealthCenter, useCreateHealthCenter, useUpdateHealthCenter } from '../../hooks/useHealthCenters';
import { fetchAddressByCep } from '../../services/viacep';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Building,
  MapPin,
  Check,
  Loader2,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

const healthCenterSchema = zod.object({
  name: zod.string().min(3, 'O nome deve ter no mínimo 3 caracteres'),
  cnes: zod.string().min(1, 'CNES é obrigatório').refine((val) => {
    const clean = val.replace(/\D/g, '');
    return clean.length === 7;
  }, 'CNES deve conter exatamente 7 dígitos'),
  nurseName: zod.string().optional(),
  stSolicitante: zod.boolean().optional(),
  stExecutante: zod.boolean().optional(),

  // Endereço (Opcional)
  zipCode: zod.string().optional(),
  street: zod.string().optional(),
  number: zod.string().optional(),
  complement: zod.string().optional(),
  neighborhood: zod.string().optional(),
  city: zod.string().optional(),
  state: zod.string().optional(),
  ibgeCode: zod.string().optional(),
}).superRefine((data, ctx) => {
  if (data.zipCode && data.zipCode.trim() !== '') {
    if (!data.street || data.street.trim() === '') {
      ctx.addIssue({ code: zod.ZodIssueCode.custom, path: ['street'], message: 'Obrigatório com CEP' });
    }
    if (!data.number || data.number.trim() === '') {
      ctx.addIssue({ code: zod.ZodIssueCode.custom, path: ['number'], message: 'Obrigatório com CEP' });
    }
    if (!data.neighborhood || data.neighborhood.trim() === '') {
      ctx.addIssue({ code: zod.ZodIssueCode.custom, path: ['neighborhood'], message: 'Obrigatório com CEP' });
    }
    if (!data.city || data.city.trim() === '') {
      ctx.addIssue({ code: zod.ZodIssueCode.custom, path: ['city'], message: 'Obrigatório com CEP' });
    }
    if (!data.state || data.state.trim() === '') {
      ctx.addIssue({ code: zod.ZodIssueCode.custom, path: ['state'], message: 'Obrigatório com CEP' });
    }
  } else {
    const hasOtherFields =
      (data.street && data.street.trim() !== '') ||
      (data.number && data.number.trim() !== '') ||
      (data.complement && data.complement.trim() !== '') ||
      (data.neighborhood && data.neighborhood.trim() !== '') ||
      (data.city && data.city.trim() !== '') ||
      (data.state && data.state.trim() !== '');

    if (hasOtherFields) {
      ctx.addIssue({
        code: zod.ZodIssueCode.custom,
        path: ['zipCode'],
        message: 'Preencha o CEP ou deixe todo o endereço em branco',
      });
    }
  }
});

type FormData = zod.infer<typeof healthCenterSchema>;

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

export const CreateOrEditHealthCenter: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoadingCep, setIsLoadingCep] = useState(false);

  const isEditMode = !!id;
  const { data: healthCenter, isLoading: loadingHC } = useHealthCenter(id || '');
  const createMutation = useCreateHealthCenter();
  const updateMutation = useUpdateHealthCenter();

  const {
    control,
    handleSubmit,
    trigger,
    setValue,
    clearErrors,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(healthCenterSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      cnes: '',
      nurseName: '',
      stSolicitante: true,
      stExecutante: false,
      zipCode: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: 'PB',
      ibgeCode: '',
    },
  });

  // Load existing data if in Edit Mode
  useEffect(() => {
    if (isEditMode && healthCenter) {
      const parsedAddress = parseAddressString(healthCenter.address);
      reset({
        name: healthCenter.name,
        cnes: healthCenter.cnes || '',
        nurseName: healthCenter.nurseName || '',
        stSolicitante: healthCenter.stSolicitante ?? true,
        stExecutante: healthCenter.stExecutante ?? false,
        ...parsedAddress,
      });
    }
  }, [isEditMode, healthCenter, reset]);

  const formatCNES = (val: string) => {
    return val.replace(/\D/g, '').slice(0, 7);
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
      fieldsToValidate = ['name', 'cnes', 'nurseName'];
    }

    const isStepValid = await trigger(fieldsToValidate);
    if (isStepValid) {
      setStep((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setStep((prev) => prev - 1);
  };

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
    const addressString = buildAddressString(data);
    const payload = {
      name: data.name,
      cnes: data.cnes || undefined,
      nurseName: data.nurseName || undefined,
      address: addressString || undefined,
      stSolicitante: data.stSolicitante,
      stExecutante: data.stExecutante,
    };

    if (isEditMode && id) {
      updateMutation.mutate(
        { id, data: payload },
        {
          onSuccess: () => {
            toast.success('Unidade Básica de Saúde atualizada com sucesso!');
            navigate(`/health-centers/${id}`);
          },
          onError: (err) => {
            console.error(err);
            toast.error('Erro ao atualizar a UBS.');
          },
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success('Unidade Básica de Saúde cadastrada com sucesso!');
          navigate('/health-centers');
        },
        onError: (err) => {
          console.error(err);
          toast.error('Erro ao cadastrar a UBS.');
        },
      });
    }
  };

  const steps = [
    { number: 1, title: 'Identificação', description: 'Dados da Unidade', icon: Building },
    { number: 2, title: 'Localização', description: 'Endereço Completo', icon: MapPin },
  ];

  if (isEditMode && loadingHC) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-10 h-10 text-blue-700 dark:text-blue-500 animate-spin" />
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Carregando dados da UBS...</p>
      </div>
    );
  }

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => (isEditMode ? navigate(`/health-centers/${id}`) : navigate('/health-centers'))}
          className="flex items-center justify-center w-10 h-10 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 transition-all cursor-pointer shadow-md"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {isEditMode ? 'Editar Unidade de Saúde' : 'Nova Unidade Básica de Saúde'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {isEditMode
              ? 'Atualize as informações cadastrais e de localização da UBS.'
              : 'Cadastre uma nova UBS para gerenciar ACS e vincular pacientes.'}
          </p>
        </div>
      </div>

      {/* Progress Tracker */}
      <div className="grid grid-cols-2 gap-4 bg-white shadow-md dark:bg-slate-900/40 border border-slate-900 rounded-md p-4 backdrop-blur-md">
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

        {/* STEP 1: Identification data */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Dados de Identificação</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Preencha as informações básicas de registro da UBS.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Nome da UBS
                </label>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      placeholder="Ex: UBS São Bento Centro"
                      className={`w-full px-3 py-2 bg-white dark:bg-slate-950 border rounded-md text-sm text-slate-900 dark:text-white focus:outline-none transition-all ${errors.name
                          ? 'border-rose-500/80 shadow-[0_0_10px_rgba(244,63,94,0.15)] focus:border-rose-400'
                          : field.value
                            ? 'border-teal-500/80 shadow-[0_0_10px_rgba(20,184,166,0.15)] focus:border-teal-400'
                            : 'border-slate-300 dark:border-slate-800 focus:border-blue-500'
                        }`}
                    />
                  )}
                />
                {errors.name && <p className="text-rose-700 dark:text-rose-500 text-xs">{errors.name.message}</p>}
                {errors.name && <p className="text-rose-700 dark:text-rose-500 text-xs">{errors.name.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Código CNES (7 dígitos)
                </label>
                <Controller
                  name="cnes"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      placeholder="Ex: 1234567"
                      onChange={(e) => field.onChange(formatCNES(e.target.value))}
                      className={`w-full px-3 py-2 bg-white dark:bg-slate-950 border rounded-md text-sm text-slate-900 dark:text-white focus:outline-none font-mono transition-all ${errors.cnes
                          ? 'border-rose-500/80 shadow-[0_0_10px_rgba(244,63,94,0.15)] focus:border-rose-400'
                          : field.value
                            ? 'border-teal-500/80 shadow-[0_0_10px_rgba(20,184,166,0.15)] focus:border-teal-400'
                            : 'border-slate-300 dark:border-slate-800 focus:border-blue-500'
                        }`}
                    />
                  )}
                />
                {errors.cnes && <p className="text-rose-700 dark:text-rose-500 text-xs">{errors.cnes.message}</p>}
                {errors.cnes && <p className="text-rose-700 dark:text-rose-500 text-xs">{errors.cnes.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Enfermeira Responsável
                </label>
                <Controller
                  name="nurseName"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      placeholder="Ex: Enf. Maria Souza"
                      className={`w-full px-3 py-2 bg-white dark:bg-slate-950 border rounded-md text-sm text-slate-900 dark:text-white focus:outline-none transition-all ${errors.nurseName
                          ? 'border-rose-500/80 shadow-[0_0_10px_rgba(244,63,94,0.15)] focus:border-rose-400'
                          : field.value
                            ? 'border-teal-500/80 shadow-[0_0_10px_rgba(20,184,166,0.15)] focus:border-teal-400'
                            : 'border-slate-300 dark:border-slate-800 focus:border-blue-500'
                        }`}
                    />
                  )}
                />
                {errors.nurseName && <p className="text-rose-700 dark:text-rose-500 text-xs">{errors.nurseName.message}</p>}
              </div>
              <div className="space-y-2 md:col-span-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Papel da Unidade na Regulação Municipal
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 cursor-pointer hover:border-blue-400 transition-colors">
                    <Controller
                      name="stSolicitante"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                      )}
                    />
                    <div>
                      <span className="block text-sm font-semibold text-slate-900 dark:text-white">Unidade Solicitante</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">Emite solicitações de regulação (UBS) e consome cotas municipais</span>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 cursor-pointer hover:border-blue-400 transition-colors">
                    <Controller
                      name="stExecutante"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                      )}
                    />
                    <div>
                      <span className="block text-sm font-semibold text-slate-900 dark:text-white">Unidade Executante</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">Realiza exames/consultas, oferta capacidade mensal e valida chaves de atendimento</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Address data */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Localização e Endereço</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Preencha o endereço oficial de atendimento da unidade.</p>
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
                      className={`w-full px-3 py-2 bg-white dark:bg-slate-950 border rounded-md text-sm text-slate-900 dark:text-white focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed font-mono transition-all ${errors.zipCode
                          ? 'border-rose-500/80 shadow-[0_0_10px_rgba(244,63,94,0.15)] focus:border-rose-400'
                          : field.value
                            ? 'border-teal-500/80 shadow-[0_0_10px_rgba(20,184,166,0.15)] focus:border-teal-400'
                            : 'border-slate-300 dark:border-slate-800 focus:border-blue-500'
                        }`}
                    />
                  )}
                />
                {errors.zipCode && <p className="text-rose-700 dark:text-rose-500 text-xs">{errors.zipCode.message}</p>}
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
                      className={`w-full px-3 py-2 bg-white dark:bg-slate-950 border rounded-md text-sm text-slate-900 dark:text-white focus:outline-none disabled:opacity-50 transition-all ${errors.street
                          ? 'border-rose-500/80 shadow-[0_0_10px_rgba(244,63,94,0.15)] focus:border-rose-400'
                          : field.value
                            ? 'border-teal-500/80 shadow-[0_0_10px_rgba(20,184,166,0.15)] focus:border-teal-400'
                            : 'border-slate-300 dark:border-slate-800 focus:border-blue-500'
                        }`}
                    />
                  )}
                />
                {errors.street && <p className="text-rose-700 dark:text-rose-500 text-xs">{errors.street.message}</p>}
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
                      placeholder="Ex: S/N ou 120"
                      className={`w-full px-3 py-2 bg-white dark:bg-slate-950 border rounded-md text-sm text-slate-900 dark:text-white focus:outline-none transition-all ${errors.number
                          ? 'border-rose-500/80 shadow-[0_0_10px_rgba(244,63,94,0.15)] focus:border-rose-400'
                          : field.value
                            ? 'border-teal-500/80 shadow-[0_0_10px_rgba(20,184,166,0.15)] focus:border-teal-400'
                            : 'border-slate-300 dark:border-slate-800 focus:border-blue-500'
                        }`}
                    />
                  )}
                />
                {errors.number && <p className="text-rose-700 dark:text-rose-500 text-xs">{errors.number.message}</p>}
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
                      placeholder="Ex: Próximo ao Hospital"
                      className={`w-full px-3 py-2 bg-white dark:bg-slate-950 border rounded-md text-sm text-slate-900 dark:text-white focus:outline-none transition-all ${errors.complement
                          ? 'border-rose-500/80 shadow-[0_0_10px_rgba(244,63,94,0.15)] focus:border-rose-400'
                          : field.value
                            ? 'border-teal-500/80 shadow-[0_0_10px_rgba(20,184,166,0.15)] focus:border-teal-400'
                            : 'border-slate-300 dark:border-slate-800 focus:border-blue-500'
                        }`}
                    />
                  )}
                />
                {errors.complement && <p className="text-rose-700 dark:text-rose-500 text-xs">{errors.complement.message}</p>}
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
                      className={`w-full px-3 py-2 bg-white dark:bg-slate-950 border rounded-md text-sm text-slate-900 dark:text-white focus:outline-none disabled:opacity-50 transition-all ${errors.neighborhood
                          ? 'border-rose-500/80 shadow-[0_0_10px_rgba(244,63,94,0.15)] focus:border-rose-400'
                          : field.value
                            ? 'border-teal-500/80 shadow-[0_0_10px_rgba(20,184,166,0.15)] focus:border-teal-400'
                            : 'border-slate-300 dark:border-slate-800 focus:border-blue-500'
                        }`}
                    />
                  )}
                />
                {errors.neighborhood && <p className="text-rose-700 dark:text-rose-500 text-xs">{errors.neighborhood.message}</p>}
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
                      placeholder="Ex: São Bento"
                      disabled={isLoadingCep}
                      className={`w-full px-3 py-2 bg-white dark:bg-slate-950 border rounded-md text-sm text-slate-900 dark:text-white focus:outline-none disabled:opacity-50 transition-all ${errors.city
                          ? 'border-rose-500/80 shadow-[0_0_10px_rgba(244,63,94,0.15)] focus:border-rose-400'
                          : field.value
                            ? 'border-teal-500/80 shadow-[0_0_10px_rgba(20,184,166,0.15)] focus:border-teal-400'
                            : 'border-slate-300 dark:border-slate-800 focus:border-blue-500'
                        }`}
                    />
                  )}
                />
                {errors.city && <p className="text-rose-700 dark:text-rose-500 text-xs">{errors.city.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Estado (UF)
                </label>
                <Controller
                  name="state"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      disabled={isLoadingCep}
                      className={`w-full px-3 py-2 bg-white dark:bg-slate-950 border rounded-md text-sm text-slate-900 dark:text-white focus:outline-none disabled:opacity-50 transition-all ${errors.state
                          ? 'border-rose-500/80 shadow-[0_0_10px_rgba(244,63,94,0.15)] focus:border-rose-400'
                          : field.value
                            ? 'border-teal-500/80 shadow-[0_0_10px_rgba(20,184,166,0.15)] focus:border-teal-400'
                            : 'border-slate-300 dark:border-slate-800 focus:border-blue-500'
                        }`}
                    >
                      <option value="">Selecione...</option>
                      <option value="AC">Acre</option>
                      <option value="AL">Alagoas</option>
                      <option value="AP">Amapá</option>
                      <option value="AM">Amazonas</option>
                      <option value="BA">Bahia</option>
                      <option value="CE">Ceará</option>
                      <option value="DF">Distrito Federal</option>
                      <option value="ES">Espírito Santo</option>
                      <option value="GO">Goiás</option>
                      <option value="MA">Maranhão</option>
                      <option value="MT">Mato Grosso</option>
                      <option value="MS">Mato Grosso do Sul</option>
                      <option value="MG">Minas Gerais</option>
                      <option value="PA">Pará</option>
                      <option value="PB">Paraíba</option>
                      <option value="PR">Paraná</option>
                      <option value="PE">Pernambuco</option>
                      <option value="PI">Piauí</option>
                      <option value="RJ">Rio de Janeiro</option>
                      <option value="RN">Rio Grande do Norte</option>
                      <option value="RS">Rio Grande do Sul</option>
                      <option value="RO">Rondônia</option>
                      <option value="RR">Roraima</option>
                      <option value="SC">Santa Catarina</option>
                      <option value="SP">São Paulo</option>
                      <option value="SE">Sergipe</option>
                      <option value="TO">Tocantins</option>
                    </select>
                  )}
                />
                {errors.state && <p className="text-rose-700 dark:text-rose-500 text-xs">{errors.state.message}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Footer Navigation Buttons */}
        <div className="flex justify-between pt-6 border-t border-slate-300 dark:border-slate-800">
          {step > 1 ? (
            <button
              key="prev-btn"
              type="button"
              onClick={handlePrevStep}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-200 dark:bg-slate-850 hover:bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 font-medium rounded-md text-sm transition-all duration-300 isActive:scale-95 cursor-pointer shadow-md"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
          ) : (
            <div />
          )}

          {step < 2 ? (
            <button
              key="next-btn"
              type="button"
              onClick={handleNextStep}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-md text-sm transition-all duration-300 isActive:scale-95 ml-auto cursor-pointer shadow-md"
            >
              <span>Avançar</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              key="submit-btn"
              type="submit"
              disabled={isMutating}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md text-sm transition-all duration-300 shadow-md isActive:scale-95 disabled:opacity-55 disabled:cursor-not-allowed ml-auto cursor-pointer"
            >
              {isMutating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="w-4.5 h-4.5" />
                  <span>{isEditMode ? 'Salvar Alterações' : 'Cadastrar Unidade'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
