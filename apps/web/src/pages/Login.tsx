import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Lock, Mail, AlertCircle, Loader, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useTheme } from '../contexts/ThemeContext';

export const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const login = useAuthStore((state) => state.login);
    const navigate = useNavigate();
    const { theme, setTheme } = useTheme();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            // API call to auth login endpoint
            const apiUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3333';
            const response = await axios.post(`${apiUrl}/auth/login`, {
                email,
                password,
            });

            const { accessToken, user } = response.data;
            login(accessToken, user, user.permissions);
            navigate('/');
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
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 relative overflow-hidden font-sans">
            {/* Theme Toggle */}
            <div className="absolute top-6 right-6 z-20">
                <button
                    type="button"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="p-2 rounded-full bg-slate-100/50 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-all backdrop-blur-md cursor-pointer flex items-center justify-center"
                    title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
                >
                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
            </div>

            {/* Background blobs for premium gradient aesthetic */}
            <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-blue-100 dark:bg-blue-500/10 blur-[120px]" />
            <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-teal-100 dark:bg-teal-500/10 blur-[120px]" />

            <div className="w-full max-w-md p-8 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl z-10 transition-all duration-300 hover:border-slate-300 dark:border-slate-700/80">

                {/* Logo and Header */}
                <div className="flex flex-col items-center mb-8">
                    <img src="/logo.svg" alt="Logo SIPeP" className="w-32 h-32 mb-2 drop-shadow-lg object-contain" />
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{import.meta.env.VITE_APP_NAME}</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Sistema Integrado de Prontuário Eletrônico do Paciente</p>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="flex items-center gap-3 p-4 mb-6 bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-xl">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            E-mail
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-500" />
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="exemplo@email.com"
                                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/80 transition-all text-sm"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Senha
                            </label>
                            <Link to="/forgot-password" className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                                Esqueceu a senha?
                            </Link>
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-500" />
                            <input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••••••"
                                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/80 transition-all text-sm"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all duration-300 shadow-md active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 text-sm mt-8 cursor-pointer"
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
                <div className="text-center mt-8 text-2xs text-slate-500 border-t border-slate-300 dark:border-slate-800/60 pt-6">
                    <div className="flex items-center justify-center gap-2">
                        <img
                            src="/logo.png"
                            alt="Logo Integra Sistemas"
                            className="w-8 h-8 object-contain"
                        />
                        <span>Desenvolvido por Integra Sistemas</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

