import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
  Key,
  Building2,
  Star,
} from 'lucide-react';
import { useCreateUser, useUpdateUser, useUser, useProfiles, usePermissions } from '../../hooks/useUsers';
import { useHealthCenters } from '../../hooks/useHealthCenters';

const userSchema = zod.object({
  name: zod.string().min(3, 'O nome deve ter no mínimo 3 caracteres'),
  email: zod.string().email('E-mail inválido'),
  phone: zod.string().optional(),
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
  'medical-records:write': 'Gerenciar Prontuários',
  'reports:read': 'Visualizar Relatórios e BI',
  'rooms:read': 'Visualizar Ambulatórios/Salas',
  'rooms:write': 'Gerenciar Ambulatórios/Salas',
  'regulation-solicitor:create': 'UBS: Criar Solicitações de Regulação',
  'regulation-solicitor:read': 'UBS: Visualizar Solicitações de Regulação',
  'regulation-solicitor:edit_returned': 'UBS: Reenviar Solicitações Devolvidas',
  'regulation-solicitor:cancel': 'UBS: Cancelar Solicitações',
  'regulation-operator:read': 'Regulação: Visualizar Fila Geral',
  'regulation-operator:evaluate': 'Regulação: Avaliar, Autorizar ou Devolver',
  'regulation-operator:schedule': 'Regulação: Agendar e Gerar Chave',
  'regulation-operator:cancel': 'Regulação: Cancelar Agendamento',
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
  reports: 'Relatórios',
  rooms: 'Ambulatórios & Salas',
  'regulation-solicitor': 'Regulação - UBS Solicitante',
  'regulation-operator': 'Regulação - Central Municipal',
};

export const CreateOrEditUser: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const { data: user, isLoading: loadingUser } = useUser(id);
  const { data: profiles, isLoading: loadingProfiles } = useProfiles();
  const { data: allPermissions, isLoading: loadingPerms } = usePermissions();
  const { data: healthCentersData, isLoading: loadingHealthCenters } = useHealthCenters({ page: 1, limit: 100 });
  const healthCenters = healthCentersData?.data || [];

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();

  const [customPerms, setCustomPerms] = useState<Record<string, boolean>>({});
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);
  const [defaultProfileId, setDefaultProfileId] = useState<string>('');
  const [selectedHealthCenterIds, setSelectedHealthCenterIds] = useState<string[]>([]);
  const [defaultHealthCenterId, setDefaultHealthCenterId] = useState<string>('');
  const [isMunicipalRegulator, setIsMunicipalRegulator] = useState<boolean>(false);
  const [unitFilter, setUnitFilter] = useState<'solicitante' | 'executante' | 'all'>('solicitante');

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
      password: '',
    },
  });

  const isAnyRegulatorSelected = profiles
    ?.filter((p) => selectedProfileIds.includes(p.id))
    .some((p) => p.name.toLowerCase().includes('regula'));

  const defaultPerms = Array.from(
    new Set(
      profiles
        ?.filter((p) => selectedProfileIds.includes(p.id))
        .flatMap((p) => p.profilePermissions?.map((pp) => pp.permissionId) || []) || [],
    ),
  );

  useEffect(() => {
    if (isEditMode && user) {
      reset({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        password: '',
      });

      // Profiles
      const userProfIds = user.userProfiles?.map((up: any) => up.profileId) || (user.profileId ? [user.profileId] : []);
      const defProf = user.userProfiles?.find((up: any) => up.isDefault)?.profileId || user.profileId || userProfIds[0] || '';
      setSelectedProfileIds(userProfIds);
      setDefaultProfileId(defProf);

      // Health Centers
      const userHcIds = user.userHealthCenters?.map((uhc: any) => uhc.healthCenterId) || (user.healthCenterId ? [user.healthCenterId] : []);
      const defHc = user.userHealthCenters?.find((uhc: any) => uhc.isDefault)?.healthCenterId || user.healthCenterId || userHcIds[0] || '';
      setSelectedHealthCenterIds(userHcIds);
      setDefaultHealthCenterId(defHc);

      setIsMunicipalRegulator(Boolean(user.isMunicipalRegulator));

      if (user.customPermissions) {
        const initialCustoms: Record<string, boolean> = {};
        user.customPermissions.forEach((cp: any) => {
          initialCustoms[cp.permissionId] = cp.isAllowed;
        });
        setCustomPerms(initialCustoms);
      }
    }
  }, [isEditMode, user, reset]);

  const toggleProfile = (profId: string) => {
    setSelectedProfileIds((prev) => {
      let next: string[];
      if (prev.includes(profId)) {
        next = prev.filter((id) => id !== profId);
        if (defaultProfileId === profId) {
          setDefaultProfileId(next[0] || '');
        }
      } else {
        next = [...prev, profId];
        if (!defaultProfileId) {
          setDefaultProfileId(profId);
        }
      }
      return next;
    });
  };

  const toggleHealthCenter = (hcId: string) => {
    setSelectedHealthCenterIds((prev) => {
      let next: string[];
      if (prev.includes(hcId)) {
        next = prev.filter((id) => id !== hcId);
        if (defaultHealthCenterId === hcId) {
          setDefaultHealthCenterId(next[0] || '');
        }
      } else {
        next = [...prev, hcId];
        if (!defaultHealthCenterId) {
          setDefaultHealthCenterId(hcId);
        }
      }
      return next;
    });
  };

  const onSubmit = (data: FormData) => {
    if (selectedProfileIds.length === 0) {
      toast.error('Selecione pelo menos um perfil de acesso.');
      return;
    }

    const customPermissionsArray = Object.entries(customPerms).map(([permissionId, isAllowed]) => ({ permissionId, isAllowed }));
    const payload = {
      ...data,
      profileIds: selectedProfileIds,
      defaultProfileId: defaultProfileId || selectedProfileIds[0],
      profileId: defaultProfileId || selectedProfileIds[0],
      healthCenterIds: selectedHealthCenterIds,
      defaultHealthCenterId: defaultHealthCenterId || selectedHealthCenterIds[0] || null,
      healthCenterId: defaultHealthCenterId || selectedHealthCenterIds[0] || null,
      isMunicipalRegulator,
      customPermissions: customPermissionsArray,
    } as any;

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

  const isMutating = createMutation.isPending || updateMutation.isPending;

  // Ajusta automaticamente o filtro recomendado quando perfis específicos forem selecionados
  useEffect(() => {
    const isSolicitanteSelected = profiles?.some(
      (p) => selectedProfileIds.includes(p.id) && p.name.includes('Solicitante')
    );
    const isRegulatorSelected = profiles?.some(
      (p) => selectedProfileIds.includes(p.id) && p.name.includes('Regulador')
    );

    if (isSolicitanteSelected && !isRegulatorSelected) {
      setUnitFilter('solicitante');
    } else if (isRegulatorSelected && !isSolicitanteSelected) {
      setUnitFilter('executante');
    }
  }, [selectedProfileIds, profiles]);

  const filteredHealthCenters = healthCenters.filter((hc) => {
    if (unitFilter === 'solicitante') return hc.stSolicitante;
    if (unitFilter === 'executante') return hc.stExecutante;
    return true;
  });

  if (isEditMode && loadingUser) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-10 h-10 text-blue-700 dark:text-blue-500 animate-spin" />
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Carregando dados do utilizador...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/users')}
          className="flex items-center justify-center w-10 h-10 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 transition-all cursor-pointer shadow-md"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
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
                    className="w-full max-w-md px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                )}
              />
              {errors.name && <p className="text-rose-700 dark:text-rose-500 text-xs">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
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
                    className="w-full max-w-md px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  />
                )}
              />
              {errors.email && <p className="text-rose-700 dark:text-rose-500 text-xs">{errors.email.message}</p>}
              {isEditMode && <p className="text-[10px] text-slate-500">O e-mail não pode ser alterado.</p>}
            </div>

            <div className="space-y-1.5">
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
                    className="w-full max-w-xs px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                )}
              />
            </div>
          </div>
        </div>

        {/* Seção: Perfis de Acesso Múltiplos */}
        <div className="pt-4 border-t border-slate-300 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
              <ShieldAlert className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-semibold">Perfis de Acesso</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              O utilizador pode acumular mais de um perfil e alternar entre eles no sistema.
            </p>
          </div>

          {loadingProfiles ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {profiles?.map((p) => {
                const isSelected = selectedProfileIds.includes(p.id);
                const isDefault = defaultProfileId === p.id;

                return (
                  <div
                    key={p.id}
                    onClick={() => toggleProfile(p.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-900/30 ring-1 ring-blue-500 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          {p.name}
                        </span>
                      </div>

                      {isSelected && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDefaultProfileId(p.id);
                          }}
                          className={`flex items-center gap-1 text-3xs px-2 py-0.5 rounded-full font-bold transition-all cursor-pointer ${
                            isDefault
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-amber-100 hover:text-amber-800'
                          }`}
                          title={isDefault ? 'Perfil Padrão' : 'Definir como Perfil Padrão'}
                        >
                          <Star className={`w-3 h-3 ${isDefault ? 'fill-white' : ''}`} />
                          <span>{isDefault ? 'Padrão' : 'Tornar Padrão'}</span>
                        </button>
                      )}
                    </div>

                    {p.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 pl-6">
                        {p.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {selectedProfileIds.length === 0 && (
            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
              * Selecione pelo menos um perfil de acesso para o utilizador.
            </p>
          )}

          {/* Opção Regulador Central Geral */}
          {isAnyRegulatorSelected && (
            <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-start gap-3 mt-3 animate-in fade-in duration-200">
              <input
                type="checkbox"
                id="isMunicipalRegulator"
                checked={isMunicipalRegulator}
                onChange={(e) => setIsMunicipalRegulator(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="isMunicipalRegulator" className="cursor-pointer text-xs space-y-1">
                <span className="font-bold text-indigo-900 dark:text-indigo-200 block text-sm">
                  Regulador Central Geral (Escopo Municipal Irrestrito)
                </span>
                <span className="text-indigo-700 dark:text-indigo-300 block leading-relaxed">
                  Permite a este regulador visualizar, avaliar, autorizar e agendar procedimentos de <strong>toda a rede municipal de saúde</strong>.
                  Se esta opção estiver <em>desmarcada</em>, o usuário será um <strong>Regulador de Unidade</strong>, com permissão restrita estritamente aos procedimentos e grupos de exames ofertados pela sua unidade executante vinculada ativa.
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Seção: Unidades de Saúde Vinculadas */}
        <div className="pt-4 border-t border-slate-300 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-lg font-semibold">Unidades de Saúde Vinculadas</h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Usuários com perfil <strong>Solicitante (UBS)</strong> devem ser vinculados a unidades solicitantes. Defina a unidade principal.
              </p>
            </div>

            {/* Alternador de Filtro de Unidades */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shrink-0">
              <button
                type="button"
                onClick={() => setUnitFilter('solicitante')}
                className={`px-2.5 py-1 text-2xs font-bold rounded-md transition-all cursor-pointer ${
                  unitFilter === 'solicitante'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Solicitantes (UBS)
              </button>
              <button
                type="button"
                onClick={() => setUnitFilter('executante')}
                className={`px-2.5 py-1 text-2xs font-bold rounded-md transition-all cursor-pointer ${
                  unitFilter === 'executante'
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Executantes
              </button>
              <button
                type="button"
                onClick={() => setUnitFilter('all')}
                className={`px-2.5 py-1 text-2xs font-bold rounded-md transition-all cursor-pointer ${
                  unitFilter === 'all'
                    ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Todas ({healthCenters.length})
              </button>
            </div>
          </div>

          {loadingHealthCenters ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto p-1">
              {filteredHealthCenters.length === 0 ? (
                <div className="col-span-full py-8 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
                  Nenhuma unidade de saúde encontrada para o filtro selecionado ({unitFilter === 'solicitante' ? 'Solicitantes' : unitFilter === 'executante' ? 'Executantes' : 'Todas'}).
                </div>
              ) : (
                filteredHealthCenters.map((hc) => {
                  const isSelected = selectedHealthCenterIds.includes(hc.id);
                  const isDefault = defaultHealthCenterId === hc.id;

                  return (
                    <div
                      key={hc.id}
                      onClick={() => toggleHealthCenter(hc.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 ring-1 ring-blue-500 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                              isSelected
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                            {hc.name}
                          </span>
                        </div>

                        {isSelected && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDefaultHealthCenterId(hc.id);
                            }}
                            className={`flex items-center gap-1 text-3xs px-2 py-0.5 rounded-full font-bold transition-all cursor-pointer shrink-0 ${
                              isDefault
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-100 hover:text-blue-800'
                            }`}
                            title={isDefault ? 'Unidade Principal' : 'Definir como Principal'}
                          >
                            <Star className={`w-2.5 h-2.5 ${isDefault ? 'fill-white' : ''}`} />
                            <span>{isDefault ? 'Principal' : 'Tornar Principal'}</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-3xs text-slate-500 dark:text-slate-400 pl-6 gap-1">
                        <span className="truncate">{hc.cnes ? `CNES: ${hc.cnes}` : 'Sem CNES'}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {hc.stSolicitante && (
                            <span className="px-1.5 py-0.5 rounded font-semibold text-3xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                              Solicitante
                            </span>
                          )}
                          {hc.stExecutante && (
                            <span className="px-1.5 py-0.5 rounded font-semibold text-3xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                              Executante
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Seção: Senha de Acesso */}
        <div className="pt-4 border-t border-slate-300 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-2 mb-2 text-slate-900 dark:text-white">
            <Key className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h2 className="text-lg font-semibold">Credenciais de Acesso</h2>
          </div>

          <div className="space-y-1 max-w-xs">
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
                  placeholder={isEditMode ? "Preencha apenas para alterar" : "Mínimo 6 caracteres"}
                  className="w-full max-w-xs px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              )}
            />
            {errors.password && <p className="text-rose-700 dark:text-rose-500 text-xs">{errors.password.message}</p>}
            {!isEditMode && <p className="text-[10px] text-slate-500">Se não informada, a senha será "123456" por padrão.</p>}
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
                                if (selectedProfileIds.length === 0) return;
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
                              disabled={selectedProfileIds.length === 0}
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
          {selectedProfileIds.length === 0 && (
            <div className="text-xs text-amber-700 dark:text-amber-500 bg-amber-100 dark:bg-amber-500/10 p-3 rounded-md border border-amber-200 dark:border-amber-500/20">
              Selecione pelo menos um perfil de acesso acima para habilitar a configuração de permissões específicas.
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
