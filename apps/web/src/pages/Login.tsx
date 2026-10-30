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
    FileText,
    Users,
    Building2,
    Network,
    Pill,
    ShieldCheck
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useTheme } from '../contexts/ThemeContext';
import { isTokenExpired } from '../utils/token';

export const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const login = useAuthStore((state) => state.login);
    const token = useAuthStore((state) => state.token);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const navigate = useNavigate();
    const { theme, setTheme } = useTheme();

    // Se já estiver autenticado com token válido, redireciona diretamente
    useEffect(() => {
        if (isAuthenticated && token && !isTokenExpired(token)) {
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
            const apiUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3333';
            const response = await axios.post(`${apiUrl}/auth/login`, {
                email,
                password,
            });

            const { accessToken, user } = response.data;
            login(accessToken, user, user.permissions);

            // Redireciona para a página que o usuário tentou acessar anteriormente ou para a home
            const redirectUrl = sessionStorage.getItem('redirect_after_login') || '/';
            sessionStorage.removeItem('redirect_after_login');
            navigate(redirectUrl, { replace: true });
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

            {/* Left Column: Informações e Soluções */}
            <div className="w-full lg:w-1/2 xl:w-5/12 bg-gradient-to-br from-[#003366] via-[#002852] to-[#001c3a] text-white p-8 sm:p-10 lg:p-12 xl:p-14 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-700/50">
                {/* Subtle background decoration */}
                <div className="absolute top-[-15%] right-[-15%] w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
                <div className="absolute bottom-[-15%] left-[-15%] w-80 h-80 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

                {/* Top: Brasão da Unidade */}
                <div className="relative z-10 flex items-center gap-4">
                    <img
                        src="/brasao.png"
                        alt="Brasão da Unidade"
                        className="h-16 sm:h-20 w-auto object-contain drop-shadow"
                    />
                    <div>
                        <span className="text-[11px] uppercase tracking-wider font-semibold text-blue-200 block">
                            Unidade de Saúde
                        </span>
                        <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                            Rede de Atenção à Saúde
                        </h2>
                    </div>
                </div>

                {/* Middle: Identidade e Soluções do Sistema */}
                <div className="relative z-10 my-8 sm:my-10 space-y-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-100 text-xs font-medium backdrop-blur-sm border border-white/15 mb-3">
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
                            <span>Gestão Clínica e Assistencial</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                            {import.meta.env.VITE_APP_NAME || 'SINPeP'}
                        </h1>
                        <p className="text-sm text-blue-100/80 mt-1.5 leading-relaxed max-w-lg">
                            Sistema Integrado de Prontuário Eletrônico do Paciente para suporte ao atendimento ambulatorial e fluxos assistenciais.
                        </p>
                    </div>

                    <div className="space-y-4 pt-2">
                        <span className="text-xs uppercase tracking-wider text-blue-200/90 font-semibold block">
                            Soluções do Sistema
                        </span>

                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-md bg-white/10 text-blue-200 shrink-0 border border-white/10 mt-0.5">
                                    <FileText className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-white">Prontuário Eletrônico do Paciente</h4>
                                    <p className="text-xs text-blue-100/75 mt-0.5 leading-relaxed">
                                        Histórico dos atendimentos, evolução clínica, hipóteses diagnósticas (CID-10) e prescrições.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-md bg-white/10 text-blue-200 shrink-0 border border-white/10 mt-0.5">
                                    <Users className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-white">Recepção e Fila de Atendimento</h4>
                                    <p className="text-xs text-blue-100/75 mt-0.5 leading-relaxed">
                                        Acolhimento de pacientes, triagem por prioridades e encaminhamento para as salas.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-md bg-white/10 text-blue-200 shrink-0 border border-white/10 mt-0.5">
                                    <Building2 className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-white">Ambulatórios e Salas</h4>
                                    <p className="text-xs text-blue-100/75 mt-0.5 leading-relaxed">
                                        Organização de consultórios, escalas de profissionais e alocação por especialidades.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-md bg-white/10 text-blue-200 shrink-0 border border-white/10 mt-0.5">
                                    <Network className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-white">Integração com UBS e ACS</h4>
                                    <p className="text-xs text-blue-100/75 mt-0.5 leading-relaxed">
                                        Vínculo do paciente à sua Unidade Básica de referência e ao Agente Comunitário de Saúde.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-md bg-white/10 text-blue-200 shrink-0 border border-white/10 mt-0.5">
                                    <Pill className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-white">Catálogo de Medicamentos</h4>
                                    <p className="text-xs text-blue-100/75 mt-0.5 leading-relaxed">
                                        Consulta padronizada de substâncias, apresentações e dosagens com base na ANVISA.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom: Aviso de uso restrito */}
                <div className="relative z-10 pt-4 border-t border-white/15 text-2xs text-blue-100/70 flex items-center justify-between">
                    <span>Acesso restrito a profissionais autorizados</span>
                    <span>Uso Institucional</span>
                </div>
            </div>

            {/* Right Column: Formulário de Login */}
            <div className="w-full lg:w-1/2 xl:w-7/12 flex items-center justify-center p-6 sm:p-10 lg:p-12 xl:p-16">
                <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-8 sm:p-10 shadow-xl dark:shadow-2xl">
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

                    {/* Footer */}
                    <div className="text-center mt-8 text-2xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800/80 pt-5">
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
