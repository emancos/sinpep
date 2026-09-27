import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Stethoscope, Check, Loader2, User, ChevronRight } from 'lucide-react';
import Select from 'react-select';
import { useCreateDoctor, useUpdateDoctor, useDoctor } from '../../hooks/useDoctors';
import { useUsersQuery } from '../../hooks/useUsers';
import { useSpecialties } from '../../hooks/useSpecialties';
import { useProcedures } from '../../hooks/useProcedures';

const doctorSchema = zod.object({
  userId: zod.string().min(1, 'Selecione um usuário para vincular ao médico'),
  cpf: zod.string().regex(/^\d{3}\.\d{3}\.\d{3}\-\d{2}$/, 'CPF inválido').optional().or(zod.literal('')),
  cns: zod.string().regex(/^\d{3}\s\d{4}\s\d{4}\s\d{4}$/, 'CNS inválido').optional().or(zod.literal('')),
  crm: zod.string().min(1, 'CRM é obrigatório'),
  crmState: zod.string().length(2, 'Informe a UF do CRM'),
  attendanceType: zod.enum(['CONSULTA', 'EXAME', 'AMBOS']),
  specialties: zod.array(zod.string()).optional(),
  procedures: zod.array(zod.string()).optional(),
});

export const formatCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

export const formatCNS = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1 $2')
    .replace(/(\d{4})(\d)/, '$1 $2')
    .replace(/(\d{4})(\d)/, '$1 $2')
    .replace(/( \d{4})\d+?$/, '$1');
};

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

type FormData = zod.infer<typeof doctorSchema>;

const customSelectStyles = {
  control: () => "px-2 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white shadow-sm hover:border-blue-500 transition-colors flex items-center",
  menu: () => "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg mt-2 overflow-hidden z-50",
  option: ({ isFocused, isSelected }: any) => `px-4 py-2 text-sm cursor-pointer ${isSelected ? 'bg-blue-600 text-white' : isFocused ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`,
  multiValue: () => "bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-lg m-1 flex items-center",
  multiValueLabel: () => "px-2 py-0.5 text-xs font-semibold",
  multiValueRemove: () => "px-1.5 py-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-r-lg cursor-pointer transition-colors",
  input: () => "text-slate-900 dark:text-white",
  placeholder: () => "text-slate-400 dark:text-slate-500",
  singleValue: () => "text-slate-900 dark:text-white"
};

export const CreateOrEditDoctor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [step, setStep] = useState(1);

  const { data: doctor, isLoading: loadingDoctor } = useDoctor(id);
  const { data: usersData, isLoading: loadingUsers } = useUsersQuery();
  const { data: specialtiesData, isLoading: loadingSpecialties } = useSpecialties({ page: 1, limit: 1000 });
  const { data: proceduresData, isLoading: loadingProcedures } = useProcedures({ page: 1, limit: 1000 });

  const createMutation = useCreateDoctor();
  const updateMutation = useUpdateDoctor();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    trigger,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      userId: '',
      cpf: '',
      cns: '',
      crm: '',
      crmState: 'PB',
      attendanceType: 'CONSULTA',
      specialties: [],
      procedures: [],
    },
  });

  const attendanceType = watch('attendanceType');

  useEffect(() => {
    if (isEditMode && doctor) {
      reset({
        userId: doctor.userId || '',
        cpf: doctor.cpf || '',
        cns: doctor.cns || '',
        crm: doctor.crm,
        crmState: doctor.crmState || 'PB',
        attendanceType: (doctor.attendanceType as any) || 'AMBOS',
        specialties: doctor.doctorSpecialties?.map((ds: any) => ds.specialtyId) || [],
        procedures: doctor.doctorProcedures?.map((dp: any) => dp.procedureId) || [],
      });
    }
  }, [isEditMode, doctor, reset]);

  const handleNext = async () => {
    const isStep1Valid = await trigger(['userId', 'cpf', 'cns', 'crm', 'crmState']);
    if (isStep1Valid) {
      setStep(2);
    }
  };

  const onSubmit = (data: FormData) => {
    if (isEditMode && id) {
      updateMutation.mutate(
        { id, ...data },
        {
          onSuccess: () => {
            toast.success('Médico atualizado com sucesso!');
            navigate('/doctors');
          },
          onError: () => toast.error('Erro ao atualizar médico.'),
        }
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          toast.success('Médico cadastrado com sucesso!');
          navigate('/doctors');
        },
        onError: () => toast.error('Erro ao cadastrar médico.'),
      });
    }
  };

  const isMutating = createMutation.isPending || updateMutation.isPending;

  if (isEditMode && loadingDoctor) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-10 h-10 text-blue-700 animate-spin" />
      </div>
    );
  }

  const userOptions = usersData?.map(u => ({ value: u.id, label: `${u.name} (${u.email})` })) || [];
  const specialtyOptions = specialtiesData?.data?.map(s => ({ value: s.id, label: s.name })) || [];
  const procedureOptions = proceduresData?.data?.map(p => ({ value: p.id, label: p.name })) || [];

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/doctors')}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all shadow-md"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {isEditMode ? 'Editar Médico' : 'Novo Médico'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Etapa {step} de 2
            </p>
          </div>
        </div>
        
        {/* Progress Dots */}
        <div className="flex gap-2">
          <div className={`h-2 w-8 rounded-full transition-colors ${step >= 1 ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
          <div className={`h-2 w-8 rounded-full transition-colors ${step >= 2 ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white shadow-xl shadow-slate-200/50 dark:shadow-none dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden">
        
        {/* Step 1: Identificação */}
        <div className={`p-6 md:p-8 space-y-8 ${step === 1 ? 'block' : 'hidden'}`}>
          <div className="flex items-center gap-3 text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-xl">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Identificação e Documentos</h2>
              <p className="text-sm text-slate-500 font-medium">Vincule um usuário e informe os documentos</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                Usuário do Sistema <span className="text-rose-500">*</span>
              </label>
              <Controller
                name="userId"
                control={control}
                render={({ field }) => (
                  <Select
                    unstyled
                    options={userOptions}
                    value={userOptions.find(opt => opt.value === field.value) || null}
                    onChange={(val) => field.onChange(val?.value || '')}
                    placeholder="Busque pelo nome ou email do usuário..."
                    noOptionsMessage={() => "Nenhum usuário encontrado"}
                    classNames={customSelectStyles}
                    isLoading={loadingUsers}
                  />
                )}
              />
              {errors.userId && <p className="text-rose-500 text-xs font-semibold">{errors.userId.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">CRM <span className="text-rose-500">*</span></label>
                <Controller
                  name="crm"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      placeholder="Ex: 123456"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  )}
                />
                {errors.crm && <p className="text-rose-500 text-xs font-semibold">{errors.crm.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">UF do CRM <span className="text-rose-500">*</span></label>
                <Controller
                  name="crmState"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                    >
                      <option value="" disabled>Selecione a UF</option>
                      {UFS.map(uf => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  )}
                />
                {errors.crmState && <p className="text-rose-500 text-xs font-semibold">{errors.crmState.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">CPF (Opcional)</label>
                <Controller
                  name="cpf"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      onChange={e => field.onChange(formatCPF(e.target.value))}
                      placeholder="000.000.000-00"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  )}
                />
                {errors.cpf && <p className="text-rose-500 text-xs font-semibold">{errors.cpf.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">CNS (Opcional)</label>
                <Controller
                  name="cns"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      onChange={e => field.onChange(formatCNS(e.target.value))}
                      placeholder="000 0000 0000 0000"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  )}
                />
                {errors.cns && <p className="text-rose-500 text-xs font-semibold">{errors.cns.message}</p>}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800 mt-8">
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-blue-500/30 active:scale-95"
            >
              <span>Próxima Etapa</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step 2: Atuação */}
        <div className={`p-6 md:p-8 space-y-8 ${step === 2 ? 'block' : 'hidden'}`}>
          <div className="flex items-center gap-3 text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-xl">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Atuação Profissional</h2>
              <p className="text-sm text-slate-500 font-medium">Defina as especialidades e procedimentos</p>
            </div>
          </div>

          <div className="space-y-8">
            {/* Tipo de Atendimento */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                Tipo de Atendimento <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {['CONSULTA', 'EXAME', 'AMBOS'].map((type) => (
                  <label 
                    key={type} 
                    className={`flex items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${attendanceType === type ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                  >
                    <Controller
                      name="attendanceType"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="radio"
                          className="sr-only"
                          value={type}
                          checked={field.value === type}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      )}
                    />
                    <span className="font-bold tracking-wide capitalize">{type.toLowerCase()}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                Especialidades (Opcional)
              </label>
              <Controller
                name="specialties"
                control={control}
                render={({ field }) => (
                  <Select
                    isMulti
                    unstyled
                    options={specialtyOptions}
                    value={specialtyOptions.filter(opt => field.value?.includes(opt.value))}
                    onChange={(selected) => field.onChange(selected ? selected.map(s => s.value) : [])}
                    placeholder="Selecione as especialidades..."
                    noOptionsMessage={() => "Nenhuma especialidade encontrada"}
                    classNames={customSelectStyles}
                    isLoading={loadingSpecialties}
                  />
                )}
              />
            </div>

            {/* Renderizar Procedimentos condicionalmente se EXAME ou AMBOS */}
            {(attendanceType === 'EXAME' || attendanceType === 'AMBOS') && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                  Procedimentos Permitidos (Exames)
                </label>
                <Controller
                  name="procedures"
                  control={control}
                  render={({ field }) => (
                    <Select
                      isMulti
                      unstyled
                      options={procedureOptions}
                      value={procedureOptions.filter(opt => field.value?.includes(opt.value))}
                      onChange={(selected) => field.onChange(selected ? selected.map(s => s.value) : [])}
                      placeholder="Selecione os procedimentos (exames) que o médico realiza..."
                      noOptionsMessage={() => "Nenhum procedimento encontrado"}
                      classNames={customSelectStyles}
                      isLoading={loadingProcedures}
                    />
                  )}
                />
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 mt-8">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-2 px-6 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold rounded-xl text-sm transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
            <button
              type="submit"
              disabled={isMutating}
              className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/30 active:scale-95 disabled:opacity-55 disabled:cursor-not-allowed"
            >
              {isMutating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>{isEditMode ? 'Salvar Alterações' : 'Concluir Cadastro'}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
};
