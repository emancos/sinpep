import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Mail, CheckCircle2, ShieldAlert, Building2, KeyRound, MapPin, Hash } from 'lucide-react';
import { useUser } from '../../hooks/useUsers';
import { useAuthStore } from '../../store/useAuthStore';
import { CachedAvatar } from '../../components/CachedAvatar';

export const UserDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const userPermissions = useAuthStore((state) => state.permissions || []);
  const { data: user, isLoading, error } = useUser(id);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-500 font-medium">Carregando detalhes do usuário...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-rose-500">
        <ShieldAlert className="w-16 h-16 mb-4 opacity-50" />
        <h2 className="text-xl font-bold">Usuário não encontrado</h2>
        <p className="text-slate-500 mb-6">O registro que você está tentando acessar não existe ou foi removido.</p>
        <button
          onClick={() => navigate('/users')}
          className="px-6 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors"
        >
          Voltar para Lista
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-md border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/users')}
            className="p-2.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-all"
            title="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-fuchsia-100 dark:from-purple-900/40 dark:to-fuchsia-900/40 text-purple-600 dark:text-purple-400 rounded-md flex items-center justify-center shadow-inner overflow-hidden">
              <CachedAvatar src={user.avatar} alt={user.name} className="w-full h-full object-cover" iconClassName="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {user.name}
                {!user.isActive && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-rose-100 text-rose-700 rounded-md">Inativo</span>
                )}
              </h1>
              <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                <Mail className="w-3.5 h-3.5" />
                {user.email}
              </p>
            </div>
          </div>
        </div>

        {(userPermissions.includes('users:write') || userPermissions.includes('admin:access')) && (
          <button
            onClick={() => navigate(`/users/${user.id}/edit`)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md transition-all shadow-md shadow-purple-500/20 active:scale-95"
          >
            <Edit className="w-4 h-4" />
            <span>Editar Usuário</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Perfil e Acessos */}
          <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-purple-500" />
                Controle de Acesso
              </h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Perfis de Acesso Vinculados</p>
                <div className="flex flex-wrap gap-2">
                  {user.userProfiles && user.userProfiles.length > 0 ? (
                    user.userProfiles.map((up: any) => (
                      <span
                        key={up.id || up.profileId}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${
                          up.isDefault
                            ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-700 shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <span>{up.profile?.name}</span>
                        {up.isDefault && (
                          <span className="text-3xs px-1.5 py-0.5 rounded-full bg-purple-600 text-white font-semibold">
                            Padrão
                          </span>
                        )}
                      </span>
                    ))
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-md text-sm font-bold border border-purple-100 dark:border-purple-800/30">
                      <ShieldAlert className="w-4 h-4" />
                      {user.profile?.name || 'Sem perfil definido'}
                    </span>
                  )}
                </div>

                {user.isMunicipalRegulator && (
                  <div className="mt-3 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-center gap-2 text-xs text-indigo-900 dark:text-indigo-200 font-semibold">
                    <ShieldAlert className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>Regulador Central Geral: Escopo Municipal Irrestrito (Todo o Município)</span>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Status de Login</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {user.forcePasswordChange ? 'Aguardando troca de senha no 1º acesso' : 'Senha já definida'}
                </p>
              </div>

              {user.customPermissions && user.customPermissions.length > 0 && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-medium text-slate-500 mb-3">Permissões Específicas Concedidas</p>
                  <div className="flex flex-wrap gap-2">
                    {user.customPermissions.map((cp: any) => (
                      <span key={cp.permissionId} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700">
                        {cp.permission?.name || cp.permissionId}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Coluna Direita - Vínculo Institucional */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-900/10">
              <h2 className="text-sm font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Vínculo Institucional
              </h2>
            </div>
            <div className="p-6">
              {user.userHealthCenters && user.userHealthCenters.length > 0 ? (
                <div className="space-y-3">
                  {user.userHealthCenters.map((uhc: any) => (
                    <div
                      key={uhc.id || uhc.healthCenterId}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-start gap-3"
                    >
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0 mt-0.5">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {uhc.healthCenter?.name}
                          </p>
                          {uhc.isDefault && (
                            <span className="text-3xs px-1.5 py-0.5 rounded-full bg-emerald-600 text-white font-bold shrink-0">
                              Principal
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          CNES: {uhc.healthCenter?.cnes || 'Não informado'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : user.healthCenter ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-md">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                        {user.healthCenter.name || user.healthCenter.noFantasia}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        CNES: {user.healthCenter.cnes}
                      </p>
                    </div>
                  </div>
                  
                  {(user.healthCenter.noMunicipio || user.healthCenter.sgUf) && (
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-md border border-slate-100 dark:border-slate-700">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{user.healthCenter.noLogradouro ? `${user.healthCenter.noLogradouro}, ` : ''}{user.healthCenter.noBairro ? `${user.healthCenter.noBairro}, ` : ''}{user.healthCenter.noMunicipio} - {user.healthCenter.sgUf}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center text-center py-4">
                  <ShieldAlert className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Acesso Global</p>
                  <p className="text-xs text-slate-500 mt-1">Este usuário não está restrito a uma unidade de saúde específica.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
