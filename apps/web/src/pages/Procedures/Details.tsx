import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProcedure } from '../../hooks/useProcedures';
import { useAuthStore } from '../../store/useAuthStore';
import {
    ArrowLeft,
    Edit2,
    Activity,
    Hash,
    Layers,
    Loader2,
    AlertCircle,
    UserCheck,
    Calendar
} from 'lucide-react';

export const ProcedureDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const userPermissions = useAuthStore(state => state.permissions);

    const { data: procedure, isLoading, isError, error } = useProcedure(id || '');

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4 font-sans">
                <Loader2 className="w-10 h-10 text-blue-700 dark:text-blue-500 animate-spin" />
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Carregando detalhes do procedimento...</p>
            </div>
        );
    }

    if (isError || !procedure) {
        return (
            <div className="flex items-center gap-3 p-4 bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-md max-w-xl mx-auto my-10 font-sans">
                <AlertCircle className="w-6 h-6 shrink-0" />
                <div>
                    <h4 className="font-semibold">Erro ao carregar detalhes</h4>
                    <p className="text-xs text-red-600 dark:text-red-400/80 mt-0.5">
                        {(error as Error | null)?.message || 'Procedimento não encontrado ou erro de conexão.'}
                    </p>
                    <button
                        onClick={() => navigate('/procedures')}
                        className="mt-3 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-400 rounded-md text-xs font-semibold transition-all cursor-pointer shadow-md"
                    >
                        Voltar para Listagem
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 font-sans">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/procedures')}
                        className="flex items-center justify-center w-10 h-10 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-all cursor-pointer shadow-md"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{procedure.name}</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Detalhamento cadastral e restrições do procedimento</p>
                    </div>
                </div>

                {(userPermissions.includes('procedures:write') || userPermissions.includes('admin:access')) && (
                    <button
                        onClick={() => navigate(`/procedures/${procedure.id}/edit`)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:bg-slate-850 border border-slate-300 dark:border-slate-800 hover:border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-md text-sm transition-all duration-300 shadow-md active:scale-95 cursor-pointer animate-fade-in"
                    >
                        <Edit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>Editar Procedimento</span>
                    </button>
                )}
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Identificação Card */}
                <div className="bg-white shadow-md dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-md p-6 backdrop-blur-md space-y-4 lg:col-span-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-300 dark:border-slate-800/60 pb-3">
                        <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <span>Identificação do Procedimento</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Nome Completo</span>
                            <span className="text-sm text-slate-700 dark:text-slate-200 font-semibold">{procedure.name}</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Código do Procedimento</span>
                            <div className="flex items-center gap-1.5 mt-0.5 text-sm text-indigo-600 dark:text-indigo-400 font-mono font-semibold">
                                <Hash className="w-4 h-4 text-slate-500" />
                                <span className="bg-indigo-100 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 px-2 py-0.5 rounded-md">{procedure.code}</span>
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Grupo</span>
                            <div className="flex items-center gap-1.5 mt-1 text-sm text-slate-600 dark:text-slate-300">
                                <Layers className="w-4.5 h-4.5 text-slate-500" />
                                <span>{procedure.procedureGroup?.name || 'Sem grupo'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Restrições Card */}
                <div className="bg-white shadow-md dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-md p-6 backdrop-blur-md space-y-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-300 dark:border-slate-800/60 pb-3">
                        <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        <span>Restrições de Solicitação</span>
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold mb-1">Sexo Permitido</span>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${procedure.genderAllowed === 'AMBOS'
                                    ? 'bg-emerald-100 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                    : procedure.genderAllowed === 'FEMININO'
                                        ? 'bg-pink-500/10 border-pink-500/20 text-pink-400'
                                        : 'bg-blue-100 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400'
                                }`}>
                                {procedure.genderAllowed === 'AMBOS' ? 'Ambos os sexos' : procedure.genderAllowed === 'FEMININO' ? 'Apenas Feminino' : 'Apenas Masculino'}
                            </span>
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold mb-1">Faixa Etária</span>
                            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 font-semibold">
                                <Calendar className="w-4.5 h-4.5 text-slate-500" />
                                <span>De {procedure.minAge} a {procedure.maxAge} anos</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
