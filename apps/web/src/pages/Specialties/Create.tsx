import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, FileText, Check, Loader2 } from 'lucide-react';
import { useCreateSpecialty, useUpdateSpecialty, useSpecialty } from '../../hooks/useSpecialties';

const specialtySchema = zod.object({
  cbo: zod.string().min(1, 'CBO é obrigatório').regex(/^\d+$/, 'Apenas números'),
  name: zod.string().min(3, 'O nome deve ter no mínimo 3 caracteres'),
  description: zod.string().optional(),
});

type FormData = zod.infer<typeof specialtySchema>;

export const CreateOrEditSpecialty: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const { data: specialty, isLoading: loadingSpecialty } = useSpecialty(id);

  const createMutation = useCreateSpecialty();
  const updateMutation = useUpdateSpecialty();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(specialtySchema),
    defaultValues: {
      cbo: '',
      name: '',
      description: '',
    },
  });

  useEffect(() => {
    if (isEditMode && specialty) {
      reset({
        cbo: specialty.cbo || '',
        name: specialty.name,
        description: specialty.description || '',
      });
    }
  }, [isEditMode, specialty, reset]);

  const onSubmit = (data: FormData) => {
    if (isEditMode && id) {
      updateMutation.mutate(
        { id, ...data },
        {
          onSuccess: () => {
            toast.success('Especialidade atualizada com sucesso!');
            navigate('/specialties');
          },
          onError: () => toast.error('Erro ao atualizar especialidade.'),
        }
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          toast.success('Especialidade cadastrada com sucesso!');
          navigate('/specialties');
        },
        onError: () => toast.error('Erro ao cadastrar especialidade.'),
      });
    }
  };

  const isMutating = createMutation.isPending || updateMutation.isPending;

  if (isEditMode && loadingSpecialty) {
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
          onClick={() => navigate('/specialties')}
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all shadow-md"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {isEditMode ? 'Editar Especialidade' : 'Nova Especialidade'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {isEditMode ? 'Atualize as informações da especialidade.' : 'Cadastre uma nova especialidade.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white shadow-md dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4 text-slate-900 dark:text-white">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold">Dados da Especialidade</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1 md:col-span-1">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                CBO
              </label>
              <Controller
                name="cbo"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                    placeholder="CBO"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                )}
              />
              {errors.cbo && <p className="text-rose-600 text-xs">{errors.cbo.message}</p>}
            </div>

            <div className="space-y-1 md:col-span-3">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Nome da Especialidade
              </label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    placeholder="Ex: Cardiologia"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                )}
              />
              {errors.name && <p className="text-rose-600 text-xs">{errors.name.message}</p>}
            </div>

            <div className="space-y-1 md:col-span-4">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Descrição (Opcional)
              </label>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <textarea
                    {...field}
                    rows={3}
                    placeholder="Descrição da especialidade..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                )}
              />
            </div>
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
                <span>{isEditMode ? 'Salvar Alterações' : 'Cadastrar Especialidade'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
