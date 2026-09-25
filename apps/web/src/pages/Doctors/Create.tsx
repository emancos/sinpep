import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Stethoscope, Check, Loader2 } from 'lucide-react';
import { useCreateDoctor, useUpdateDoctor, useDoctor } from '../../hooks/useDoctors';
import { useUsersQuery } from '../../hooks/useUsers';
import { useSpecialties } from '../../hooks/useSpecialties';

const doctorSchema = zod.object({
  name: zod.string().min(3, 'O nome deve ter no mínimo 3 caracteres'),
  cpf: zod.string().regex(/^\d{3}\.\d{3}\.\d{3}\-\d{2}$/, 'CPF inválido'),
  cns: zod.string().regex(/^\d{3}\s\d{4}\s\d{4}\s\d{4}$/, 'CNS inválido').optional().or(zod.literal('')),
  crm: zod.string().min(1, 'CRM é obrigatório'),
  crmState: zod.string().length(2, 'Informe a UF do CRM'),
  userId: zod.string().optional(),
  specialties: zod.array(zod.string()).optional(),
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

export const CreateOrEditDoctor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const { data: doctor, isLoading: loadingDoctor } = useDoctor(id);
  const { data: usersData, isLoading: loadingUsers } = useUsersQuery();
  const { data: specialtiesData, isLoading: loadingSpecialties } = useSpecialties({ limit: 1000 });

  const createMutation = useCreateDoctor();
  const updateMutation = useUpdateDoctor();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      name: '',
      cpf: '',
      cns: '',
      crm: '',
      crmState: 'PB',
      userId: '',
      specialties: [],
    },
  });

  useEffect(() => {
    if (isEditMode && doctor) {
      reset({
        name: doctor.name,
        cpf: doctor.cpf || '',
        cns: doctor.cns || '',
        crm: doctor.crm,
        crmState: doctor.crmState || 'PB',
        userId: doctor.userId || '',
        specialties: doctor.doctorSpecialties?.map(ds => ds.specialtyId) || [],
      });
    }
  }, [isEditMode, doctor, reset]);

  const onSubmit = (data: FormData) => {
    const payload = {
      ...data,
      userId: data.userId || undefined,
    };

    if (isEditMode && id) {
      updateMutation.mutate(
        { id, ...payload },
        {
          onSuccess: () => {
            toast.success('Médico atualizado com sucesso!');
            navigate('/doctors');
          },
          onError: () => toast.error('Erro ao atualizar médico.'),
        }
      );
    } else {
      createMutation.mutate(payload, {
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

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
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
            {isEditMode ? 'Atualize as informações do médico e suas especialidades.' : 'Cadastre um novo médico e vincule suas especialidades.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white shadow-md dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4 text-slate-900 dark:text-white">
            <Stethoscope className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold">Dados Profissionais</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Nome Completo
              </label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    placeholder="Ex: Dr. João Silva"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                )}
              />
              {errors.name && <p className="text-rose-600 text-xs">{errors.name.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                CPF
              </label>
              <Controller
                name="cpf"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    onChange={e => field.onChange(formatCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                )}
              />
              {errors.cpf && <p className="text-rose-600 text-xs">{errors.cpf.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                CNS
              </label>
              <Controller
                name="cns"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    onChange={e => field.onChange(formatCNS(e.target.value))}
                    placeholder="000 0000 0000 0000"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                )}
              />
              {errors.cns && <p className="text-rose-600 text-xs">{errors.cns.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                CRM
              </label>
              <Controller
                name="crm"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    placeholder="Ex: 123456"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                )}
              />
              {errors.crm && <p className="text-rose-600 text-xs">{errors.crm.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                UF do CRM
              </label>
              <Controller
                name="crmState"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- UF --</option>
                    {UFS.map(uf => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                )}
              />
              {errors.crmState && <p className="text-rose-600 text-xs">{errors.crmState.message}</p>}
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Vincular a um Utilizador (Opcional)
              </label>
              <Controller
                name="userId"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Nenhum --</option>
                    {loadingUsers ? (
                      <option disabled>Carregando...</option>
                    ) : (
                      usersData?.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                      ))
                    )}
                  </select>
                )}
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-300 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
              <h2 className="text-lg font-semibold">Especialidades</h2>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-4">
            {loadingSpecialties ? (
              <div className="text-center text-slate-500 text-sm py-4">Carregando especialidades...</div>
            ) : (
              <Controller
                name="specialties"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {specialtiesData?.data?.map(spec => (
                      <label key={spec.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors border border-transparent hover:border-slate-300 dark:hover:border-slate-700">
                        <input
                          type="checkbox"
                          className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-950"
                          checked={field.value?.includes(spec.id)}
                          onChange={(e) => {
                            const current = field.value || [];
                            const updated = e.target.checked
                              ? [...current, spec.id]
                              : current.filter(id => id !== spec.id);
                            field.onChange(updated);
                          }}
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{spec.name}</span>
                          {spec.description && <span className="text-xs text-slate-500 truncate max-w-[150px]">{spec.description}</span>}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              />
            )}
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t border-slate-300 dark:border-slate-800">
          <button
            type="submit"
            disabled={isMutating}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-all shadow-md active:scale-95 disabled:opacity-55 disabled:cursor-not-allowed"
          >
            {isMutating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Check className="w-4.5 h-4.5" />
                <span>{isEditMode ? 'Salvar Alterações' : 'Cadastrar Médico'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
