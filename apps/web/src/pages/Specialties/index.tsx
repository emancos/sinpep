import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, CheckCircle2, XCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useSpecialties, useToggleSpecialtyActive } from '../../hooks/useSpecialties';
import { useAuthStore } from '../../store/useAuthStore';

export const SpecialtiesList: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const { data, isLoading } = useSpecialties({ search: searchTerm, includeInactive: 'true' });
  const toggleMutation = useToggleSpecialtyActive();
  const permissions = useAuthStore(state => state.permissions);
  const hasWritePermission = permissions.includes('specialties:write');

  const handleToggleActive = (id: string) => {
    if (!hasWritePermission) return;
    toggleMutation.mutate(id, {
      onSuccess: () => toast.success('Status da especialidade atualizado!'),
      onError: () => toast.error('Erro ao atualizar status.'),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600 dark:text-blue-500" />
            Gestão de Especialidades
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gerencie as especialidades médicas do sistema.</p>
        </div>
        {hasWritePermission && (
          <button
            onClick={() => navigate('/specialties/new')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Nova Especialidade
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-6 py-3 font-semibold">CBO</th>
                <th className="px-6 py-3 font-semibold">Nome</th>
                <th className="px-6 py-3 font-semibold">Descrição</th>
                <th className="px-6 py-3 font-semibold text-center">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Carregando especialidades...</td>
                </tr>
              ) : data?.data?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Nenhuma especialidade encontrada.</td>
                </tr>
              ) : (
                data?.data?.map((specialty) => (
                  <tr key={specialty.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-3 font-mono text-slate-600 dark:text-slate-400">
                      {specialty.cbo || '-'}
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">
                      {specialty.name}
                    </td>
                    <td className="px-6 py-3 text-slate-600 dark:text-slate-300">
                      {specialty.description || '-'}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <button
                        onClick={() => handleToggleActive(specialty.id)}
                        disabled={!hasWritePermission || toggleMutation.isPending}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          specialty.isActive
                            ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/20'
                            : 'bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-500/20'
                        } ${!hasWritePermission ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        {specialty.isActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {specialty.isActive ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="px-6 py-3 text-right">
                      {hasWritePermission && (
                        <button
                          onClick={() => navigate(`/specialties/${specialty.id}`)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-slate-100 dark:bg-slate-800 rounded-lg"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
