import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useUpdateProfile } from '../../hooks/useUsers';
import { toast } from 'sonner';
import { getAvatarUrl } from '../../utils/avatar';
import {
    User as UserIcon,
    Shield,
    Phone,
    Lock,
    Camera,
    AlertTriangle,
    Globe
} from 'lucide-react';

const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) {
        return digits.length > 0 ? `(${digits}` : '';
    }
    if (digits.length <= 6) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }
    if (digits.length <= 10) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

export const UserProfile: React.FC = () => {
    const { user, permissions } = useAuthStore();
    const updateProfileMutation = useUpdateProfile();

    // Form states
    const [name, setName] = useState(user?.name || '');
    const [phone, setPhone] = useState(user?.phone ? formatPhone(user.phone) : '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [sisregUsername, setSisregUsername] = useState(user?.sisregUsername || '');
    const [sisregPassword, setSisregPassword] = useState('');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(getAvatarUrl(user?.avatar));
    const [validationError, setValidationError] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            setName(user.name || '');
            setPhone(user.phone ? formatPhone(user.phone) : '');
            setSisregUsername(user.sisregUsername || '');
            setAvatarPreview(getAvatarUrl(user.avatar));
        }
    }, [user]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError(null);

        if (!name.trim()) {
            setValidationError('O nome do usuário é obrigatório.');
            return;
        }

        if (password) {
            if (password.length < 6) {
                setValidationError('A nova senha deve ter pelo menos 6 caracteres.');
                return;
            }
            if (password !== confirmPassword) {
                setValidationError('As senhas digitadas não coincidem.');
                return;
            }
        }

        updateProfileMutation.mutate({
            name,
            phone: phone || '',
            password: password || undefined,
            avatarFile: avatarFile || undefined,
            sisregUsername: sisregUsername || '',
            sisregPassword: sisregPassword || undefined,
        }, {
            onSuccess: (updatedData) => {
                toast.success('Perfil atualizado com sucesso!');
                setPassword('');
                setConfirmPassword('');
                setSisregPassword('');
                setAvatarFile(null);
                setAvatarPreview(getAvatarUrl(updatedData?.avatar ?? user?.avatar));
            },
            onError: (err: any) => {
                const errMsg = err?.response?.data?.message || 'Ocorreu um erro ao atualizar o perfil.';
                toast.error(errMsg);
            }
        });
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Meu Perfil</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gerencie suas informações pessoais e permissões de acesso.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* LEFT COLUMN: User details & Permissions */}
                <div className="lg:col-span-1 space-y-6">
                    {/* User Profile Card */}
                    <div className="bg-white shadow-md dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-md p-6 backdrop-blur-md flex flex-col items-center text-center relative overflow-hidden">
                        {/* Ambient visual highlight inside card */}
                        <div className="absolute top-0 w-full h-20 bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none" />

                        {/* Avatar Preview */}
                        <div className="relative group mt-4 mb-4">
                            <div className="w-24 h-24 rounded-full border-2 border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-center overflow-hidden shadow-xl shadow-black/40">
                                {avatarPreview ? (
                                    <img
                                        src={avatarPreview}
                                        alt={user?.name}
                                        onError={() => setAvatarPreview(null)}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <UserIcon className="w-12 h-12 text-slate-655" />
                                )}
                            </div>
                        </div>

                        <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-wide">{user?.name}</h2>
                        <span className="text-xs text-slate-500 mt-0.5">{user?.email}</span>

                        <div className="w-full border-t border-slate-300 dark:border-slate-800/80 my-5 pt-4 space-y-3.5 text-left">
                            <div>
                                <span className="text-xxs text-slate-500 uppercase tracking-wider block font-semibold">Telefone</span>
                                <span className="text-slate-350 text-sm font-medium">{user?.phone ? formatPhone(user.phone) : 'Não informado'}</span>
                            </div>
                            <div>
                                <span className="text-xxs text-slate-500 uppercase tracking-wider block font-semibold">E-mail de Login</span>
                                <span className="text-slate-350 text-sm font-medium">{user?.email}</span>
                            </div>
                            <div>
                                <span className="text-xxs text-slate-500 uppercase tracking-wider block font-semibold">ID do Usuário</span>
                                <span className="text-slate-500 dark:text-slate-400 text-xs font-mono break-all">{user?.id}</span>
                            </div>
                        </div>
                    </div>

                    {/* Active Permissions Card */}
                    <div className="bg-white shadow-md dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-md p-6 backdrop-blur-md">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                            <Shield className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                            <span>Permissões de Acesso</span>
                        </h2>
                        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                            Estas permissões regulam suas ações no sistema. Modificações em tempo real serão refletidas após o próximo login.
                        </p>

                        <div className="flex flex-wrap gap-2">
                            {permissions && permissions.length > 0 ? (
                                permissions.map((perm) => (
                                    <span
                                        key={perm}
                                        className="px-2.5 py-1 bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 text-xxs font-mono rounded-md transition-transform hover:scale-105"
                                    >
                                        {perm}
                                    </span>
                                ))
                            ) : (
                                <span className="text-xs text-slate-500 italic">Nenhuma permissão atribuída</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Edit Profile Form */}
                <div className="lg:col-span-2">
                    <form onSubmit={handleSubmit} className="bg-white shadow-md dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-md p-6 backdrop-blur-md space-y-6">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-300 dark:border-slate-800/60 pb-3 flex items-center gap-2">
                            <UserIcon className="w-4.5 h-4.5 text-teal-600 dark:text-teal-400" />
                            <span>Editar Meus Dados</span>
                        </h2>

                        {validationError && (
                            <div className="p-3.5 bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-md flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                <span>{validationError}</span>
                            </div>
                        )}

                        {/* Avatar upload control with visual picker */}
                        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-white dark:bg-slate-950/40 rounded-md border border-slate-200 dark:border-slate-850">
                            <div className="w-16 h-16 rounded-full border border-slate-750 bg-white dark:bg-slate-950 flex items-center justify-center overflow-hidden shrink-0">
                                {avatarPreview ? (
                                    <img
                                        src={avatarPreview}
                                        alt="Preview"
                                        onError={() => setAvatarPreview(null)}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <UserIcon className="w-8 h-8 text-slate-655" />
                                )}
                            </div>
                            <div className="space-y-1.5 text-center sm:text-left">
                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">Avatar do Usuário</span>
                                <span className="text-xxs text-slate-500 block leading-tight">Escolha uma foto quadrada (PNG, JPG ou WEBP)</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={fileInputRef}
                                    onChange={handleAvatarChange}
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={triggerFileInput}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:bg-slate-800 border border-slate-750 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-white rounded-md text-xs font-semibold transition-all cursor-pointer shadow-md hover:shadow-black/20"
                                >
                                    <Camera className="w-3.5 h-3.5" />
                                    <span>Alterar Foto</span>
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    Nome Completo
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                                        <UserIcon className="w-4 h-4" />
                                    </span>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => {
                                            setName(e.target.value);
                                            setValidationError(null);
                                        }}
                                        placeholder="Seu nome completo"
                                        className="w-full pl-10 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-blue-500 focus:outline-none rounded-md text-sm text-slate-900 dark:text-white font-medium"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    Telefone de Contato
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                                        <Phone className="w-4 h-4" />
                                    </span>
                                    <input
                                        type="text"
                                        value={phone}
                                        onChange={(e) => {
                                            setPhone(formatPhone(e.target.value));
                                            setValidationError(null);
                                        }}
                                        placeholder="Ex: (61) 99999-9999"
                                        className="w-full pl-10 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-blue-500 focus:outline-none rounded-md text-sm text-slate-900 dark:text-white font-medium"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-slate-300 dark:border-slate-800/40">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    Nova Senha (Opcional)
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                                        <Lock className="w-4 h-4" />
                                    </span>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            setValidationError(null);
                                        }}
                                        placeholder="Mínimo 6 caracteres"
                                        className="w-full pl-10 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-blue-500 focus:outline-none rounded-md text-sm text-slate-900 dark:text-white font-medium"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    Confirmar Nova Senha
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                                        <Lock className="w-4 h-4" />
                                    </span>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => {
                                            setConfirmPassword(e.target.value);
                                            setValidationError(null);
                                        }}
                                        placeholder="Repita a nova senha"
                                        className="w-full pl-10 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-blue-500 focus:outline-none rounded-md text-sm text-slate-900 dark:text-white font-medium"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-slate-300 dark:border-slate-800/40">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <Globe className="w-4 h-4 text-emerald-700 dark:text-emerald-500" />
                                Credenciais do SISREG
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                                Estas credenciais são utilizadas pelo sistema para realizar operações automatizadas no SISREG em seu nome. A senha digitada é encriptada automaticamente.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Usuário SISREG
                                    </label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                                            <UserIcon className="w-4 h-4" />
                                        </span>
                                        <input
                                            type="text"
                                            value={sisregUsername}
                                            onChange={(e) => {
                                                setSisregUsername(e.target.value);
                                                setValidationError(null);
                                            }}
                                            placeholder="Seu usuário no SISREG"
                                            className="w-full pl-10 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-emerald-500 focus:outline-none rounded-md text-sm text-slate-900 dark:text-white font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Nova Senha SISREG
                                    </label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                                            <Lock className="w-4 h-4" />
                                        </span>
                                        <input
                                            type="password"
                                            value={sisregPassword}
                                            onChange={(e) => {
                                                setSisregPassword(e.target.value);
                                                setValidationError(null);
                                            }}
                                            placeholder="Deixe em branco para manter"
                                            className="w-full pl-10 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-emerald-500 focus:outline-none rounded-md text-sm text-slate-900 dark:text-white font-medium"
                                        />
                                    </div>
                                    {sisregPassword && (
                                        <p className="text-xxs text-emerald-600 dark:text-emerald-400 mt-1.5 flex items-center gap-1">
                                            <Shield className="w-3 h-3" />
                                            A senha será convertida para maiúsculas e encriptada (SHA-256).
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-3">
                            <button
                                type="submit"
                                disabled={updateProfileMutation.isPending}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-md text-sm transition-all duration-300 shadow-md active:scale-98 cursor-pointer flex items-center gap-2"
                            >
                                {updateProfileMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
