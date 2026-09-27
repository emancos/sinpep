import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { Loader2, X, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateUser, useProfiles, usePermissions } from '../../hooks/useUsers';

const userSchema = zod.object({
  name: zod.string().min(3, 'O nome deve ter no mínimo 3 caracteres'),
  email: zod.string().email('E-mail inválido'),
  phone: zod.string().optional(),
  password: zod.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
});

type FormData = zod.infer<typeof userSchema>;

interface QuickCreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (userId: string) => void;
}

export const QuickCreateUserModal: React.FC<QuickCreateUserModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { data: profiles, isLoading: loadingProfiles } = useProfiles();
  const { data: permissions, isLoading: loadingPerms } = usePermissions();
  const createUserMutation = useCreateUser();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
    },
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      reset({ name: '', email: '', phone: '', password: '' });
    }
  }, [isOpen, reset]);

  if (!isOpen) return null;

  const onSubmit = (data: FormData) => {
    if (!profiles || profiles.length === 0) {
      toast.error('Nenhum perfil cadastrado no sistema.');
      return;
    }
    if (!permissions || permissions.length === 0) {
      toast.error('Permissões não carregadas.');
      return;
    }

    // Seleciona um perfil base (pode ser o primeiro disponível, pois sobrescreveremos as permissões)
    const baseProfileId = profiles[0].id;

    // Constrói customPermissions para permitir apenas 'medical-records'
    const customPermissions = permissions.map(p => ({
      permissionId: p.id,
      isAllowed: p.name.startsWith('medical-records')
    }));

    createUserMutation.mutate({
      ...data,
      profileId: baseProfileId,
      customPermissions,
    }, {
      onSuccess: (createdUser) => {
        toast.success('Usuário médico criado com sucesso!');
        onSuccess(createdUser.id);
        onClose();
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.message || 'Erro ao criar usuário');
      }
    });
  };

  const isLoadingData = loadingProfiles || loadingPerms;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-xl">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Criar Usuário Rápido</h2>
              <p className="text-xs text-slate-500 font-medium">Permissão restrita a Prontuários</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoadingData ? (
          <div className="p-10 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm text-slate-500">Carregando permissões...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
            
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Nome Completo
              </label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    placeholder="Ex: João Médico"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                )}
              />
              {errors.name && <p className="text-rose-500 text-xs font-semibold">{errors.name.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                E-mail
              </label>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="email"
                    placeholder="medico@exemplo.com"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                )}
              />
              {errors.email && <p className="text-rose-500 text-xs font-semibold">{errors.email.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Senha de Acesso
              </label>
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                )}
              />
              {errors.password && <p className="text-rose-500 text-xs font-semibold">{errors.password.message}</p>}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold rounded-xl text-sm transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createUserMutation.isPending}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all disabled:opacity-50"
              >
                {createUserMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Usuário'}
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  );
};
