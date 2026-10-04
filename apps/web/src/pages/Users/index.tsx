import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '../../contexts/ConfirmContext';
import { toast } from 'sonner';
import { getAvatarUrl } from '../../utils/avatar';
import { useUsersQuery, useDeleteUser, useToggleUserActive } from '../../hooks/useUsers';
import {
    Search,
    Plus,
    Loader2,
    AlertCircle,
    User as UserIcon,
    ShieldAlert,
    Trash2,
    Edit,
    Power,
    Eye
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';

export const UsersList = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const confirm = useConfirm();
    const userPermissions = useAuthStore(state => state.permissions);
    const [searchTerm, setSearchTerm] = useState('');
    const [showInactive, setShowInactive] = useState(false);

    const { data: usersList, isLoading, isError, error } = useUsersQuery(showInactive);
    const deleteUserMutation = useDeleteUser();
    const toggleActiveMutation = useToggleUserActive();

    const handleDeleteUser = async (id: string) => {
        const isConfirmed = await confirm({
            title: 'Excluir Definitivamente',
            description: 'Deseja realmente excluir este utilizador DEFINITIVAMENTE? Esta ação não pode ser desfeita.',
            confirmText: 'Excluir',
            cancelText: 'Cancelar',
            variant: 'danger'
        });

        if (isConfirmed) {
            deleteUserMutation.mutate(id, {
                onSuccess: () => {
                    toast.success('Utilizador excluído definitivamente!');
                },
                onError: () => {
                    toast.error('Ocorreu um erro ao excluir o utilizador.');
                }
            });
        }
    };

    const handleToggleActive = async (id: string, currentActive: boolean) => {
        const actionName = currentActive ? 'Desabilitar' : 'Habilitar';
        const isConfirmed = await confirm({
            title: `${actionName} Utilizador`,
            description: `Deseja realmente ${actionName.toLowerCase()} este utilizador?`,
            confirmText: actionName,
            cancelText: 'Cancelar',
            variant: currentActive ? 'danger' : 'info'
        });

        if (isConfirmed) {
            toggleActiveMutation.mutate(id, {
                onSuccess: () => {
                    toast.success(`Utilizador ${currentActive ? 'desabilitado' : 'habilitado'} com sucesso!`);
                },
                onError: () => {
                    toast.error(`Erro ao ${actionName.toLowerCase()} utilizador.`);
                }
            });
        }
    };

    const filteredUsers = usersList?.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Gestão de Utilizadores</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gira os acessos e permissões do sistema</p>
                </div>

                <button
                    onClick={() => navigate('/users/create')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md text-sm transition-all duration-300 shadow-md active:scale-95 cursor-pointer"
                >
                    <Plus className="w-4 h-4" />
                    <span>Novo Utilizador</span>
                </button>
            </div>

            {/* Search and Filter bar */}
            <div className="bg-white shadow-md dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-md p-4 backdrop-blur-md flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-slate-700 dark:text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/80 transition-all text-sm"
                    />
                </div>

                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:text-slate-200 transition-colors">
                        <div className="relative inline-flex items-center">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={showInactive}
                                onChange={(e) => setShowInactive(e.target.checked)}
                            />
                            <div className="w-9 h-5 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 peer-checked:after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                        </div>
                        <span>Mostrar desabilitados</span>
                    </label>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 ml-auto">
                    <span>Total: </span>
                    <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 rounded-md font-mono text-slate-700 dark:text-slate-200">
                        {filteredUsers?.length || 0}
                    </span>
                </div>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Loader2 className="w-10 h-10 text-blue-700 dark:text-blue-500 animate-spin" />
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{t('Loading')}</p>
                </div>
            )}

            {/* Error State */}
            {isError && (
                <div className="flex items-center gap-3 p-4 bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-md max-w-xl mx-auto">
                    <AlertCircle className="w-6 h-6 shrink-0" />
                    <div>
                        <h4 className="font-semibold">{t('Error Loading')}</h4>
                        <p className="text-xs text-red-600 dark:text-red-400/80 mt-0.5">{(error as Error | null)?.message || 'Erro de conexão com o servidor.'}</p>
                    </div>
                </div>
            )}

            {/* Table Section */}
            {!isLoading && !isError && (
                <div className="bg-white shadow-md dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-md overflow-hidden backdrop-blur-md">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr className="border-b border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                                    <th className="px-6 py-4">Nome</th>
                                    <th className="px-6 py-4">E-mail</th>
                                    <th className="px-6 py-4">Perfil</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-sm">
                                {filteredUsers && filteredUsers.length > 0 ? (
                                    filteredUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-slate-200 dark:bg-slate-800/20 transition-colors duration-150 group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full ${user.isActive ? 'bg-blue-500/20' : 'bg-slate-200 dark:bg-slate-800/50'} border border-slate-300 dark:border-slate-800 flex items-center justify-center overflow-hidden`}>
                                                        {user.avatar ? (
                                                            <img src={getAvatarUrl(user.avatar) || ''} alt={user.name} className={`w-full h-full object-cover ${!user.isActive && 'grayscale opacity-50'}`} />
                                                        ) : (
                                                            <UserIcon className={`w-4 h-4 ${user.isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`} />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className={`font-medium transition-colors duration-200 ${user.isActive ? 'text-slate-900 dark:text-white group-hover:text-blue-400' : 'text-slate-500 line-through'}`}>
                                                            {user.name}
                                                        </div>
                                                        {!user.isActive && <span className="text-[10px] text-rose-600 dark:text-rose-400/80 font-semibold uppercase">Desabilitado</span>}
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="text-sm text-slate-600 dark:text-slate-300">
                                                    {user.email}
                                                </div>
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <ShieldAlert className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                                    <span className="px-2.5 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20 rounded-md">
                                                        {user.profile?.name || 'Sem perfil'}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => navigate(`/users/${user.id}`)}
                                                        className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-100 dark:bg-indigo-500/10 hover:bg-indigo-200 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/20 rounded-md transition-all cursor-pointer shadow-md"
                                                        title="Visualizar"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>

                                                    <button
                                                        onClick={() => navigate(`/users/${user.id}/edit`)}
                                                        className="p-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-100 dark:bg-blue-500/10 hover:bg-blue-200 dark:hover:bg-blue-500/20 border border-blue-200 dark:border-blue-500/20 rounded-md transition-all cursor-pointer shadow-md disabled:opacity-50"
                                                        title="Editar"
                                                        disabled={!userPermissions.includes('users:write') && !userPermissions.includes('admin:access')}
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>

                                                    {(userPermissions.includes('users:write') || userPermissions.includes('admin:access')) && (
                                                        <button
                                                            onClick={() => handleToggleActive(user.id, user.isActive)}
                                                            className={`p-1.5 border rounded-md transition-all cursor-pointer ${user.isActive
                                                                    ? 'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 bg-amber-100 dark:bg-amber-500/10 hover:bg-amber-200 dark:hover:bg-amber-500/20 border-amber-200 dark:border-amber-500/20'
                                                                    : 'text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 bg-teal-100 dark:bg-teal-500/10 hover:bg-teal-200 dark:hover:bg-teal-500/20 border-teal-200 dark:border-teal-500/20'
                                                                }`}
                                                            title={user.isActive ? "Desabilitar" : "Habilitar"}
                                                        >
                                                            <Power className="w-4 h-4" />
                                                        </button>
                                                    )}

                                                    {userPermissions.includes('admin:access') && (
                                                        <button
                                                            onClick={() => handleDeleteUser(user.id)}
                                                            className="p-1.5 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 bg-rose-100 dark:bg-rose-500/10 hover:bg-rose-200 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/20 rounded-md transition-all cursor-pointer shadow-md"
                                                            title="Excluir Definitivamente"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-10 text-center text-slate-500 italic">
                                            Nenhum utilizador encontrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
