import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import {
    Lock,
    Mail,
    AlertCircle,
    Loader,
    Sun,
    Moon,
    ShieldCheck,
    Stethoscope,
    CalendarCheck,
    Send,
    Layers,
    UserCheck,
    ArrowRight,
    ArrowLeft
} from 'lucide-react';
import { useAuthStore, type ActiveProfile, type User } from '../store/useAuthStore';
import { useTheme } from '../contexts/ThemeContext';
import { isTokenExpired } from '../utils/token';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { LoginHeroBranding } from './Login/LoginHeroBranding';

interface PendingAuth {
    accessToken: string;
    user: User;
    activeProfile: ActiveProfile | null;
    availableProfiles: ActiveProfile[];
    permissions: string[];
}

export const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'CREDENTIALS' | 'SELECT_PROFILE'>('CREDENTIALS');
    const [pendingAuth, setPendingAuth] = useState<PendingAuth | null>(null);
    const [selectingProfileId, setSelectingProfileId] = useState<string | null>(null);

    const login = useAuthStore((state) => state.login);
    const token = useAuthStore((state) => state.token);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { theme, setTheme } = useTheme();

    const apiUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3333';

    // Se já estiver autenticado com token válido, redireciona diretamente
    useEffect(() => {
        if (isAuthenticated && token && !isTokenExpired(token)) {
            sessionStorage.removeItem('explicit_logout');
            const redirectUrl = sessionStorage.getItem('redirect_after_login') || '/';
            sessionStorage.removeItem('redirect_after_login');
            navigate(redirectUrl, { replace: true });
        }
    }, [isAuthenticated, token, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const response = await axios.post(`${apiUrl}/auth/login`, {
                email,
                password,
            });

            const { accessToken, user, activeProfile, availableProfiles, permissions } = response.data;

            // Se o backend retornar múltiplos perfis ou lista de perfis disponíveis
            if (availableProfiles && availableProfiles.length > 0) {
                setPendingAuth({
                    accessToken,
                    user,
                    activeProfile: activeProfile || null,
                    availableProfiles,
                    permissions: permissions || user.permissions || [],
                });
                setStep('SELECT_PROFILE');
            } else {
                // Caso não haja múltiplos perfis, limpa cache e inicializa sessão
                queryClient.clear();
                queryClient.setQueryData(['auth-me', accessToken], {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    avatar: user.avatar,
                    profileId: activeProfile?.id,
                    profileName: activeProfile?.name,
                    healthCenterId: user.healthCenterId,
                    activeProfile,
                    availableProfiles,
                    permissions: permissions || user.permissions || [],
                });

                login(accessToken, user, permissions || user.permissions || [], activeProfile, availableProfiles);
                sessionStorage.removeItem('explicit_logout');
                const redirectUrl = sessionStorage.getItem('redirect_after_login') || '/';
                sessionStorage.removeItem('redirect_after_login');
                navigate(redirectUrl, { replace: true });
            }
        } catch (err) {
            const error = err as { response?: { data?: { message?: string } } };
            if (error.response?.data?.message) {
                setError(error.response.data.message);
            } else {
                setError('Ocorreu um erro ao tentar realizar o login. Tente novamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSelectProfile = async (profile: ActiveProfile) => {
        if (!pendingAuth) return;
        setSelectingProfileId(profile.id);
        setError(null);

        try {
            let finalToken = pendingAuth.accessToken;
            let finalPermissions = pendingAuth.permissions;
            let finalActiveProfile = profile;

            // Se o perfil selecionado for diferente do que foi emitido inicialmente no login
            if (pendingAuth.activeProfile?.id !== profile.id) {
                const response = await axios.post(
                    `${apiUrl}/auth/select-profile`,
                    { profileId: profile.id },
                    {
                        headers: {
                            Authorization: `Bearer ${pendingAuth.accessToken}`,
                        },
                    }
                );

                finalToken = response.data.accessToken;
                finalPermissions = response.data.permissions;
                finalActiveProfile = response.data.activeProfile;
            }

            // Limpa queries de sessões anteriores e pré-popula a query auth-me
            queryClient.clear();
            queryClient.setQueryData(['auth-me', finalToken], {
                id: pendingAuth.user.id,
                name: pendingAuth.user.name,
                email: pendingAuth.user.email,
                phone: pendingAuth.user.phone,
                avatar: pendingAuth.user.avatar,
                profileId: finalActiveProfile.id,
                profileName: finalActiveProfile.name,
                healthCenterId: pendingAuth.user.healthCenterId,
                activeProfile: finalActiveProfile,
                availableProfiles: pendingAuth.availableProfiles,
                permissions: finalPermissions,
            });

            login(
                finalToken,
                pendingAuth.user,
                finalPermissions,
                finalActiveProfile,
                pendingAuth.availableProfiles
            );

            toast.success(`Acessando como ${finalActiveProfile.name}...`);

            sessionStorage.removeItem('explicit_logout');
            const savedRedirect = sessionStorage.getItem('redirect_after_login') || '/';
            sessionStorage.removeItem('redirect_after_login');

            // Valida se o redirect salvo é compatível com as novas permissões do perfil
            let targetRoute = savedRedirect;
            const isSolicitorPage = savedRedirect.includes('/regulation/solicitor');
            const isOperatorPage = savedRedirect.includes('/regulation/inbox');
            const isAdmin = finalPermissions.includes('admin:access');

            if (isSolicitorPage && !finalPermissions.includes('regulation-solicitor:read') && !isAdmin) {
                targetRoute = '/';
            } else if (isOperatorPage && !finalPermissions.includes('regulation-operator:read') && !isAdmin) {
                targetRoute = '/';
            }

            // Se o destino for '/' ou sem rota explícita, direciona para o módulo natural do perfil
            if (targetRoute === '/') {
                const name = finalActiveProfile.name.toLowerCase();
                if (name.includes('solicitante') || finalPermissions.includes('regulation-solicitor:read')) {
                    targetRoute = '/regulation/solicitor';
                } else if (name.includes('regula') || finalPermissions.includes('regulation-operator:read')) {
                    targetRoute = '/regulation/inbox';
                } else if (name.includes('recep') || finalPermissions.includes('rooms:read')) {
                    targetRoute = '/reception';
                }
            }

            navigate(targetRoute, { replace: true });
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Erro ao selecionar o perfil de acesso.';
            setError(msg);
        } finally {
            setSelectingProfileId(null);
        }
    };

    const getProfileIcon = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes('admin')) return <ShieldCheck className="w-6 h-6 text-purple-600 dark:text-purple-400" />;
        if (n.includes('médico') || n.includes('medico')) return <Stethoscope className="w-6 h-6 text-blue-600 dark:text-blue-400" />;
        if (n.includes('recep')) return <CalendarCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />;
        if (n.includes('solicitante')) return <Send className="w-6 h-6 text-amber-600 dark:text-amber-400" />;
        if (n.includes('regula')) return <Layers className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />;
        return <UserCheck className="w-6 h-6 text-slate-600 dark:text-slate-400" />;
    };

    const getProfileDescription = (profile: ActiveProfile) => {
        if (profile.description) return profile.description;
        const n = profile.name.toLowerCase();
        if (n.includes('admin')) return 'Acesso irrestrito a configurações, cadastros e gestão completa do sistema.';
        if (n.includes('médico') || n.includes('medico')) return 'Atendimento clínico ambulatorial, prontuário eletrônico e prescrições.';
        if (n.includes('recep')) return 'Acolhimento, recepção de pacientes, triagem e encaminhamento.';
        if (n.includes('solicitante')) return 'Unidade Básica: emissão de pedidos de exames e consultas para a Regulação.';
        if (n.includes('regula')) return 'Central de Regulação: autorização, agendamento e gestão das cotas municipais.';
        return 'Permissões específicas vinculadas à função no sistema.';
    };

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans relative">
            {/* Theme Toggle */}
            <div className="absolute top-4 right-4 z-30">
                <button
                    type="button"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="p-2 rounded-md bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all backdrop-blur-md cursor-pointer flex items-center justify-center shadow-sm"
                    title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
                >
                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
            </div>

            {/* Left Column: Informações e Soluções (Personalização Dinâmica por Município) */}
            <LoginHeroBranding />

            {/* Right Column: Formulário de Login OU Seleção de Perfil */}
            <div className="w-full lg:w-1/2 xl:w-7/12 flex items-center justify-center p-6 sm:p-10 lg:p-12 xl:p-16">
                <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 sm:p-10 shadow-xl dark:shadow-2xl transition-all">
                    {step === 'CREDENTIALS' ? (
                        <>
                            {/* Header */}
                            <div className="flex flex-col items-center text-center mb-8">
                                <img src="/logo.svg" alt="Logo SIPeP" className="w-20 h-20 mb-3 drop-shadow object-contain" />
                                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                    Acesso ao Sistema
                                </h2>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    Informe suas credenciais para acessar os módulos
                                </p>
                            </div>

                            {/* Error Alert */}
                            {error && (
                                <div className="flex items-center gap-3 p-3.5 mb-6 bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs sm:text-sm rounded-md">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <p>{error}</p>
                                </div>
                            )}

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                        E-mail Institucional
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                                        <input
                                            id="email"
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="usuario@saude.gov.br"
                                            className="w-full pl-9 pr-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                            Senha
                                        </label>
                                        <Link
                                            to="/forgot-password"
                                            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                                        >
                                            Esqueceu a senha?
                                        </Link>
                                    </div>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                                        <input
                                            id="password"
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full pl-9 pr-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-all duration-200 shadow-md active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 text-sm mt-6 cursor-pointer"
                                >
                                    {loading ? (
                                        <>
                                            <Loader className="w-4 h-4 animate-spin" />
                                            Autenticando...
                                        </>
                                    ) : (
                                        'Entrar no Sistema'
                                    )}
                                </button>
                            </form>
                        </>
                    ) : (
                        /* Step 2: Seleção de Perfil */
                        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                            <div className="text-center">
                                <div className="inline-flex p-3 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-3 shadow-inner">
                                    <ShieldCheck className="w-8 h-8" />
                                </div>
                                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                    Selecione seu Perfil de Acesso
                                </h2>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                                    Olá, <strong className="text-slate-800 dark:text-slate-200">{pendingAuth?.user.name}</strong>! Escolha como deseja atuar no sistema nesta sessão:
                                </p>
                            </div>

                            {/* Error Alert */}
                            {error && (
                                <div className="flex items-center gap-3 p-3.5 bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs sm:text-sm rounded-md">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <p>{error}</p>
                                </div>
                            )}

                            {/* Cards de Perfis Disponíveis */}
                            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                                {pendingAuth?.availableProfiles.map((p) => {
                                    const isPending = selectingProfileId === p.id;
                                    const isInitialActive = pendingAuth.activeProfile?.id === p.id;

                                    return (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => handleSelectProfile(p)}
                                            disabled={!!selectingProfileId}
                                            className="w-full text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 hover:bg-blue-50/50 dark:hover:bg-slate-800/80 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 shadow-sm hover:shadow group flex items-center justify-between gap-3 cursor-pointer disabled:opacity-50"
                                        >
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors shrink-0">
                                                    {getProfileIcon(p.name)}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                            {p.name}
                                                        </span>
                                                        {isInitialActive && (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                                Sugerido
                                                            </span>
                                                        )}
                                                        {p.isDefault && (
                                                            <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                                Padrão
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                                                        {getProfileDescription(p)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="shrink-0 flex items-center pl-2">
                                                {isPending ? (
                                                    <Loader className="w-5 h-5 text-blue-600 animate-spin" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-600 group-hover:text-white text-slate-400 flex items-center justify-center transition-all">
                                                        <ArrowRight className="w-4 h-4" />
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Voltar para login com outra conta */}
                            <div className="pt-2 text-center">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStep('CREDENTIALS');
                                        setPendingAuth(null);
                                        setPassword('');
                                        setError(null);
                                    }}
                                    className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer py-1 px-3 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    <span>Entrar com outra conta</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Links Institucionais Públicos */}
                    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-6 pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
                        <Link to="/about" className="hover:text-[#0051A2] dark:hover:text-blue-400 font-medium transition-colors">
                            Sobre o Sistema
                        </Link>
                        <span className="text-slate-300 dark:text-slate-700 select-none">•</span>
                        <Link to="/terms" className="hover:text-[#0051A2] dark:hover:text-blue-400 font-medium transition-colors">
                            Termos de Uso
                        </Link>
                        <span className="text-slate-300 dark:text-slate-700 select-none">•</span>
                        <Link to="/privacy" className="hover:text-[#0051A2] dark:hover:text-blue-400 font-medium transition-colors">
                            Políticas de Privacidade
                        </Link>
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-4 text-2xs text-slate-500 dark:text-slate-400 pt-1">
                        <div className="flex items-center justify-center gap-2">
                            <img
                                src="/logo.png"
                                alt="Logo Integra Sistemas"
                                className="w-7 h-7 object-contain"
                            />
                            <span>Desenvolvido por Integra Sistemas</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
