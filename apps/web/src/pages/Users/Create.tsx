import React, { useEffect, useState } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  User,
  Check,
  Loader2,
  ShieldAlert,
  Key
} from 'lucide-react';
import { useCreateUser, useUpdateUser, useUser, useProfiles, usePermissions } from '../../hooks/useUsers';

const userSchema = zod.object({
  name: zod.string().min(3, 'O nome deve ter no mínimo 3 caracteres'),
  email: zod.string().email('E-mail inválido'),
  phone: zod.string().optional(),
  profileId: zod.string().min(1, 'Selecione um perfil'),
  password: zod.string().optional().refine(val => {
    if (val && val.length > 0 && val.length < 6) return false;
    return true;
  }, 'A senha deve ter pelo menos 6 caracteres'),
});

type FormData = zod.infer<typeof userSchema>;

const permissionFriendlyNames: Record<string, string> = {
  'admin:access': 'Acesso Total (Administração)',
  'users:read': 'Visualizar Utilizadores',
  'users:write': 'Gerir Utilizadores',
  'patients:read': 'Visualizar Pacientes',
  'patients:write': 'Gerir Pacientes',
  'patients:write_attention': 'Gerir Nível de Atenção',
  'doctors:read': 'Visualizar Médicos',
  'doctors:write': 'Gerir Médicos',
  'health-agents:read': 'Visualizar Agentes de Saúde',
  'health-agents:write': 'Gerir Agentes de Saúde',
  'health-centers:read': 'Visualizar UBS',
  'health-centers:write': 'Gerir UBS',
  'specialties:read': 'Visualizar Especialidades',
  'specialties:write': 'Gerir Especialidades',
  'procedures:read': 'Visualizar Procedimentos',
  'procedures:write': 'Gerir Procedimentos',
  'procedure-groups:read': 'Visualizar Grupos de Proc.',
  'procedure-groups:write': 'Gerir Grupos de Proc.',
  'requests:read': 'Visualizar Solicitações',
  'requests:write': 'Gerir Solicitações',
  'medical-records:read': 'Visualizar Prontuários',
  'medical-records:write': 'Gerenciar Prontuários'
};

const featureFriendlyNames: Record<string, string> = {
  admin: 'Administração',
  users: 'Utilizadores',
  patients: 'Pacientes',
  doctors: 'Médicos',
  'health-agents': 'Agentes de Saúde',
  'health-centers': 'Unidades de Saúde (UBS)',
  specialties: 'Especialidades',
  procedures: 'Procedimentos',
  'procedure-groups': 'Grupos de Procedimentos',
  requests: 'Solicitações',
  settings: 'Configurações',
  'medical-records': 'Prontuários',
};

export const CreateOrEditUser: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const { data: user, isLoading: loadingUser } = useUser(id);
  const { data: profiles, isLoading: loadingProfiles } = useProfiles();
  const { data: allPermissions, isLoading: loadingPerms } = usePermissions();

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();

  const [customPerms, setCustomPerms] = useState<Record<string, boolean>>({});

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(userSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      profileId: '',
      password: '',
    },
  });

  const selectedProfileId = useWatch({ control, name: 'profileId' });
  const selectedProfile = profiles?.find(p => p.id === selectedProfileId);
  const defaultPerms = selectedProfile?.profilePermissions?.map(pp => pp.permissionId) || [];

  useEffect(() => {
    if (isEditMode && user) {
      reset({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        profileId: user.profileId || user.profile?.id || '',
        password: '',
      });
      if (user.customPermissions) {
        const initialCustoms: Record<string, boolean> = {};
        user.customPermissions.forEach((cp: any) => {
          initialCustoms[cp.permissionId] = cp.isAllowed;
        });
        setCustomPerms(initialCustoms);
      }
    }
  }, [isEditMode, user, reset]);

  // When profile changes (not on initial load edit mode), we could clear customPerms, but let's keep it simple: 
  // If the admin changes the profile, the visual representation of customPerms might change (added vs removed), 
  // but it's an edge case. For a perfect UX, we might clear `customPerms` if they change `profileId` manually.
  // We will leave them intact for now.

  const onSubmit = (data: FormData) => {
    const customPermissionsArray = Object.entries(customPerms).map(([permissionId, isAllowed]) => ({ permissionId, isAllowed }));
    const payload = { ...data, customPermissions: customPermissionsArray } as any;

    if (isEditMode && !payload.password) {
      delete payload.password;
    }

    if (isEditMode && id) {
      updateMutation.mutate(
        { id, ...payload },
        {
          onSuccess: () => {
            toast.success('Utilizador atualizado com sucesso!');
            navigate('/users');
          },
          onError: (err) => {
            console.error(err);
            toast.error('Erro ao atualizar o utilizador.');
          },
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success('Utilizador cadastrado com sucesso!');
          navigate('/users');
        },
        onError: (err) => {
          console.error(err);
          toast.error('Erro ao cadastrar o utilizador.');
        },
      });
    }
  };

  if (isEditMode && loadingUser) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-10 h-10 text-blue-700 dark:text-blue-500 animate-spin" />
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Carregando dados do utilizador...</p>
      </div>
    );
  }

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/users')}
          className="flex items-center justify-center w-10 h-10 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-all cursor-pointer shadow-md"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {isEditMode ? 'Editar Utilizador' : 'Novo Utilizador'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {isEditMode
              ? 'Atualize os dados e acessos deste utilizador.'
              : 'Cadastre um novo utilizador e defina o seu nível de acesso.'}
          </p>
        </div>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white shadow-md dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-md p-6 backdrop-blur-md space-y-6">

        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4 text-slate-900 dark:text-white">
            <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold">Dados do Utilizador</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 md:col-span-2">
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
                    placeholder="Ex: João Silva"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                )}
              />
              {errors.name && <p className="text-rose-700 dark:text-rose-500 text-xs">{errors.name.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                E-mail
              </label>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="email"
                    placeholder="Ex: joao@exemplo.com"
                    disabled={isEditMode}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  />
                )}
              />
              {errors.email && <p className="text-rose-700 dark:text-rose-500 text-xs">{errors.email.message}</p>}
              {isEditMode && <p className="text-[10px] text-slate-500">O e-mail não pode ser alterado.</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Telefone
              </label>
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    placeholder="Ex: (83) 99999-9999"
                    onChange={(e) => {
                      const val = e.target.value;
                      const clean = val.replace(/\D/g, '').slice(0, 11);
                      let formatted = clean;
                      if (clean.length > 0) {
                        if (clean.length <= 2) formatted = `(${clean}`;
                        else if (clean.length <= 6) formatted = `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
                        else if (clean.length <= 10) formatted = `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
                        else formatted = `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
                      }
                      field.onChange(formatted);
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                )}
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-300 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-2 mb-4 text-slate-900 dark:text-white">
            <ShieldAlert className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h2 className="text-lg font-semibold">Segurança e Acessos</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Perfil de Acesso
              </label>
              <Controller
                name="profileId"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className="w-full px-3 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 appearance-none"
                  >
                    <option value="" disabled className="bg-slate-50 dark:bg-slate-900 text-slate-500">Selecione um perfil...</option>
                    {loadingProfiles ? (
                      <option disabled className="bg-slate-50 dark:bg-slate-900 text-slate-500">Carregando perfis...</option>
                    ) : (
                      profiles?.map(p => (
                        <option key={p.id} value={p.id} className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200">{p.name}</option>
                      ))
                    )}
                  </select>
                )}
              />
              {errors.profileId && <p className="text-rose-700 dark:text-rose-500 text-xs">{errors.profileId.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Senha {isEditMode && '(Opcional)'}
              </label>
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="password"
                    placeholder={isEditMode ? "Preencha para alterar" : "Mínimo 6 caracteres"}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                )}
              />
              {errors.password && <p className="text-rose-700 dark:text-rose-500 text-xs">{errors.password.message}</p>}
              {!isEditMode && <p className="text-[10px] text-slate-500">Se não informada, a senha será "123456" por defeito.</p>}
            </div>
          </div>
        </div>

        {/* Permissions Grid */}
        <div className="pt-4 border-t border-slate-300 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Key className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-lg font-semibold">Permissões Específicas</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-left sm:text-right">Ative ou desative permissões para sobrescrever o padrão do perfil selecionado.</p>
          </div>

          {loadingPerms ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-6 h-6 text-indigo-700 dark:text-indigo-500 animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {(() => {
                const groupedPermissions = allPermissions?.reduce((acc, perm) => {
                  let [feature] = perm.name.split(':');
                  if (feature === 'health-agents') {
                    feature = 'health-centers';
                  }
                  if (!acc[feature]) acc[feature] = [];
                  acc[feature].push(perm);
                  return acc;
                }, {} as Record<string, typeof allPermissions>);

                return groupedPermissions && Object.entries(groupedPermissions).map(([feature, perms]) => (
                  <div key={feature} className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide border-b border-slate-200 dark:border-slate-800 pb-1">
                      {featureFriendlyNames[feature] || feature}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {perms.map(perm => {
                        const isDefaultGranted = defaultPerms.includes(perm.id);
                        const isCustomSet = customPerms[perm.id] !== undefined;
                        const isCurrentlyGranted = isCustomSet ? customPerms[perm.id] : isDefaultGranted;
                        const friendlyName = permissionFriendlyNames[perm.name] || perm.name;

                        return (
                          <div key={perm.id} className="shadow-md flex items-start gap-3 p-3 rounded-md bg-slate-100 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-800/80 transition-colors hover:bg-slate-100 dark:bg-slate-900">
                            <button
                              type="button"
                              onClick={() => {
                                if (!selectedProfileId) return;
                                setCustomPerms(prev => {
                                  const next = { ...prev };
                                  const nextValue = !isCurrentlyGranted;
                                  if (nextValue === isDefaultGranted) {
                                    delete next[perm.id];
                                  } else {
                                    next[perm.id] = nextValue;
                                  }
                                  return next;
                                });
                              }}
                              disabled={!selectedProfileId}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer shadow-md items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${isCurrentlyGranted ? 'bg-indigo-500' : 'bg-slate-700'}`}
                            >
                              <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition duration-200 ease-in-out ${isCurrentlyGranted ? 'translate-x-2' : '-translate-x-2'}`} />
                            </button>
                            <div className="flex flex-col flex-1">
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-none">{friendlyName}</span>
                              <span className="text-xs text-slate-500 mt-1 leading-snug">{perm.description}</span>
                              {isCustomSet && (
                                <span className={`text-[10px] font-bold mt-1.5 px-1.5 py-0.5 rounded-md inline-block w-max ${isCurrentlyGranted ? 'bg-teal-100 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400' : 'bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                                  {isCurrentlyGranted ? 'Permissão Adicionada' : 'Permissão Removida'}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
          {!selectedProfileId && (
            <div className="text-xs text-amber-700 dark:text-amber-500 bg-amber-100 dark:bg-amber-500/10 p-3 rounded-md border border-amber-200 dark:border-amber-500/20">
              Selecione um perfil de acesso primeiro para habilitar a configuração de permissões específicas.
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="flex justify-end pt-6 border-t border-slate-300 dark:border-slate-800">
          <button
            key="submit-btn"
            type="submit"
            disabled={isMutating}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md text-sm transition-all duration-300 shadow-md active:scale-95 disabled:opacity-55 disabled:cursor-not-allowed ml-auto cursor-pointer"
          >
            {isMutating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Check className="w-4.5 h-4.5" />
                <span>{isEditMode ? 'Salvar Alterações' : 'Cadastrar Utilizador'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
