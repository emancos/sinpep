import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Lock, Loader, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ResetPassword() {
 const [searchParams] = useSearchParams();
 const token = searchParams.get('token');
 const navigate = useNavigate();

 const [password, setPassword] = useState('');
 const [confirmPassword, setConfirmPassword] = useState('');
 const [isLoading, setIsLoading] = useState(false);
 const [success, setSuccess] = useState(false);

 useEffect(() => {
 if (!token) {
 toast.error('Token de redefinição não encontrado.');
 navigate('/login');
 }
 }, [token, navigate]);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (password.length < 6) {
 toast.error('A senha deve ter pelo menos 6 caracteres.');
 return;
 }
 if (password !== confirmPassword) {
 toast.error('As senhas não coincidem.');
 return;
 }

 try {
 setIsLoading(true);
 const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
 await axios.post(`${apiUrl}/auth/reset-password`, { token, password });
 setSuccess(true);
 toast.success('Senha redefinida com sucesso!');
 
 // Opcional: Redirecionar após alguns segundos
 setTimeout(() => {
 navigate('/login');
 }, 3000);
 } catch (error: any) {
 toast.error(error.response?.data?.message || 'Erro ao redefinir a senha. O link pode estar expirado.');
 console.error(error);
 } finally {
 setIsLoading(false);
 }
 };

 if (success) {
 return (
 <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4">
 <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-md shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700 p-8 text-center">
 <div className="flex justify-center mb-6">
 <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
 <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
 </div>
 </div>
 <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Senha Redefinida!</h2>
 <p className="text-slate-600 dark:text-slate-400 mb-8">
 Sua senha foi alterada com sucesso. Você será redirecionado para o login em instantes.
 </p>
 <Link
 to="/login"
 className="shadow-md inline-flex items-center justify-center w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
 >
 Fazer Login Agora
 </Link>
 </div>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4">
 <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-md shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700">
 <div className="p-8">
 <div className="mb-8 text-center">
 <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400">
 app_base
 </h1>
 <h2 className="mt-4 text-xl font-semibold text-slate-800 dark:text-white">
 Nova Senha
 </h2>
 <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
 Crie uma nova senha para acessar sua conta.
 </p>
 </div>

 <form onSubmit={handleSubmit} className="space-y-6">
 <div className="space-y-2">
 <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
 Nova Senha
 </label>
 <div className="relative">
 <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
 <input
 id="password"
 type="password"
 required
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 placeholder="Mínimo 6 caracteres"
 className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/80 transition-all text-sm"
 />
 </div>
 </div>

 <div className="space-y-2">
 <label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
 Confirmar Nova Senha
 </label>
 <div className="relative">
 <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
 <input
 id="confirmPassword"
 type="password"
 required
 value={confirmPassword}
 onChange={(e) => setConfirmPassword(e.target.value)}
 placeholder="Repita a nova senha"
 className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/80 transition-all text-sm"
 />
 </div>
 </div>

 <button
 type="submit"
 disabled={isLoading}
 className="w-full flex items-center justify-center py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-70 disabled:cursor-not-allowed"
 >
 {isLoading ? (
 <>
 <Loader className="animate-spin -ml-1 mr-2 h-5 w-5" />
 Salvando...
 </>
 ) : (
 'Redefinir Senha'
 )}
 </button>

 <div className="text-center pt-2">
 <Link
 to="/login"
 className="inline-flex items-center text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
 >
 <ArrowLeft className="w-4 h-4 mr-2" />
 Voltar para o Login
 </Link>
 </div>
 </form>
 </div>
 </div>
 </div>
 );
}
