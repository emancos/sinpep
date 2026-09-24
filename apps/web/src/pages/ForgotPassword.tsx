import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Mail, Loader, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPassword() {
 const [email, setEmail] = useState('');
 const [isLoading, setIsLoading] = useState(false);
 const [success, setSuccess] = useState(false);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!email) {
 toast.error('Por favor, informe seu e-mail.');
 return;
 }

 try {
 setIsLoading(true);
 const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
 const response = await axios.post(`${apiUrl}/auth/forgot-password`, { email });
 setSuccess(true);
 toast.success(response.data.message || 'Se o email estiver cadastrado, você receberá um link de recuperação em breve.');
 } catch (error: any) {
 toast.error('Ocorreu um erro ao processar sua solicitação.');
 console.error(error);
 } finally {
 setIsLoading(false);
 }
 };

 return (
 <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4">
 <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700">
 <div className="p-8">
 <div className="mb-8 text-center">
 <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400">
 app_base
 </h1>
 <h2 className="mt-4 text-xl font-semibold text-slate-800 dark:text-white">
 Recuperar Senha
 </h2>
 <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
 Informe seu e-mail cadastrado para receber um link de redefinição de senha.
 </p>
 </div>

 {success ? (
 <div className="text-center bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-800/30">
 <p className="text-blue-800 dark:text-blue-300 mb-6">
 Enviamos as instruções de recuperação para o e-mail informado (caso ele esteja cadastrado em nossa base). Verifique sua caixa de entrada.
 </p>
 <Link
 to="/login"
 className="inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors"
 >
 <ArrowLeft className="w-4 h-4 mr-2" />
 Voltar para o Login
 </Link>
 </div>
 ) : (
 <form onSubmit={handleSubmit} className="space-y-6">
 <div className="space-y-2">
 <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
 E-mail
 </label>
 <div className="relative">
 <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
 <input
 id="email"
 type="email"
 required
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 placeholder="seu.email@exemplo.com"
 className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/80 transition-all text-sm"
 />
 </div>
 </div>

 <button
 type="submit"
 disabled={isLoading}
 className="w-full flex items-center justify-center py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-70 disabled:cursor-not-allowed"
 >
 {isLoading ? (
 <>
 <Loader className="animate-spin -ml-1 mr-2 h-5 w-5" />
 Enviando...
 </>
 ) : (
 'Enviar Link de Recuperação'
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
 )}
 </div>
 </div>
 </div>
 );
}
