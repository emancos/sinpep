import React, { useState, useEffect } from 'react';
import { useDoctors, useToggleDoctorActive, useDeleteDoctor } from '../../hooks/useDoctors';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '../../contexts/ConfirmContext';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  Loader2,
  AlertCircle,
  Stethoscope,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Edit2,
  Power,
  ShieldAlert,
  CheckCircle2,
  Trash2,
  Eye
} from 'lucide-react';
import { TablePagination } from '../../components/TablePagination';
import { useAuthStore } from '../../store/useAuthStore';

export const DoctorsList: React.FC = () => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const userPermissions = useAuthStore(state => state.permissions);
  const toggleActiveMutation = useToggleDoctorActive();
  const deleteDoctorMutation = useDeleteDoctor();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const { data, isLoading, isError, error } = useDoctors({
    page,
    limit,
    sortBy,
    sortOrder,
    search: debouncedSearch,
    includeInactive: showInactive,
  });

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handleDeleteDoctor = async (id: string) => {
    const isConfirmed = await confirm({
      title: 'Excluir Definitivamente',
      description: 'Deseja realmente excluir este médico DEFINITIVAMENTE? Esta ação não pode ser desfeita.',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      variant: 'danger'
    });

    if (isConfirmed) {
      deleteDoctorMutation.mutate(id, {
        onSuccess: () => toast.success('Médico excluído com sucesso!'),
        onError: () => toast.error('Ocorreu um erro ao excluir o médico.')
      });
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const actionName = currentActive ? 'Desabilitar' : 'Habilitar';
    const isConfirmed = await confirm({
      title: `${actionName} Médico`,
      description: `Deseja realmente ${actionName.toLowerCase()} este médico?`,
      confirmText: actionName,
      cancelText: 'Cancelar',
      variant: currentActive ? 'danger' : 'info'
    });

    if (isConfirmed) {
      toggleActiveMutation.mutate(id, {
        onSuccess: () => {
          toast.success(`Médico ${currentActive ? 'desabilitado' : 'habilitado'} com sucesso!`);
        },
        onError: () => {
          toast.error(`Erro ao ${actionName.toLowerCase()} médico.`);
        }
      });
    }
  };

  const renderSortHeader = (label: string, field: string) => {
    const isSorted = sortBy === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className="px-6 py-4 cursor-pointer hover:bg-slate-200 dark:bg-slate-800/40 hover:text-slate-900 dark:text-white transition-colors duration-150 select-none group"
      >
        <div className="flex items-center gap-1.5">
          <span>{label}</span>
          {isSorted ? (
            sortOrder === 'asc' ? (
              <ArrowUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            )
          ) : (
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-500 dark:text-slate-400 opacity-0 group-hover:opacity-100 transition-all" />
          )}
        </div>
      </th>
    );
  };

  const doctorsList = data?.data || [];
  const total = data?.total || 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-blue-600 dark:text-blue-500" />
            Gestão de Médicos
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gerenciamento dos profissionais médicos do sistema.</p>
        </div>

        {userPermissions.includes('doctors:write') && (
          <button
            onClick={() => navigate('/doctors/new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition-all duration-300 shadow-md active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Médico</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-white shadow-md dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 backdrop-blur-md flex flex-col sm:flex-row items-center gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nome, CRM ou CPF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/80 transition-all text-sm"
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
            {total}
          </span>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-10 h-10 text-blue-700 dark:text-blue-500 animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Carregando...</p>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="flex items-center gap-3 p-4 bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl max-w-xl mx-auto">
          <AlertCircle className="w-6 h-6 shrink-0" />
          <div>
            <h4 className="font-semibold">Erro ao carregar dados</h4>
            <p className="text-xs text-red-600 dark:text-red-400/80 mt-0.5">{(error as Error | null)?.message || 'Erro de conexão com o servidor.'}</p>
          </div>
        </div>
      )}

      {/* Table Section */}
      {!isLoading && !isError && (
        <div className="bg-white shadow-md dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  {renderSortHeader('Nome do Médico', 'name')}
                  {renderSortHeader('Documentos', 'cpf')}
                  {renderSortHeader('CRM', 'crm')}
                  <th className="px-6 py-4">Especialidades / Vinculação</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-sm">
                {doctorsList && doctorsList.length > 0 ? (
                  doctorsList.map((doctor) => (
                    <tr key={doctor.id} className="hover:bg-slate-200 dark:bg-slate-800/20 transition-colors duration-150 group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg ${doctor.isActive ? 'bg-blue-100 dark:bg-blue-500/10' : 'bg-slate-200 dark:bg-slate-800/50'} flex items-center justify-center shrink-0`}>
                            <Stethoscope className={`w-4 h-4 ${doctor.isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`} />
                          </div>
                          <div className="flex flex-col">
                            <span className={`font-medium transition-colors duration-200 block ${doctor.isActive ? 'text-slate-900 dark:text-white group-hover:text-blue-400' : 'text-slate-500 line-through'}`}>
                              {doctor.name}
                            </span>
                            {!doctor.isActive && <span className="text-[10px] text-rose-600 dark:text-rose-400/80 font-semibold uppercase">Desabilitado</span>}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-xs space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-400 dark:text-slate-500">CPF:</span> 
                          <span className="font-mono">{doctor.cpf || '-'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-400 dark:text-slate-500">CNS:</span> 
                          <span className="font-mono">{doctor.cns || '-'}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-mono text-sm">
                        {doctor.crm} / {doctor.crmState}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap gap-1">
                            {doctor.doctorSpecialties && doctor.doctorSpecialties.length > 0 ? (
                              doctor.doctorSpecialties.map(ds => (
                                <span key={ds.specialtyId} className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs rounded-md border border-indigo-200 dark:border-indigo-500/20">
                                  {ds.specialty.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 italic text-xs">Sem especialidades</span>
                            )}
                          </div>
                          <div>
                            {doctor.user?.healthCenter ? (
                              <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" />
                                Vinculado a {doctor.user.healthCenter.name || doctor.user.healthCenter.noFantasia}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                <ShieldAlert className="w-3 h-3" />
                                Sem vínculo de unidade
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => navigate(`/doctors/${doctor.id}`)}
                            className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-100 dark:bg-indigo-500/10 hover:bg-indigo-200 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/20 rounded-lg transition-all cursor-pointer shadow-md"
                            title="Visualizar"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {userPermissions.includes('doctors:write') && (
                            <>
                              <button
                                onClick={() => navigate(`/doctors/${doctor.id}/edit`)}
                                className="px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-100 dark:bg-blue-500/10 hover:bg-blue-200 dark:hover:bg-blue-500/20 border border-blue-200 dark:border-blue-500/20 rounded-lg transition-all cursor-pointer shadow-md"
                              >
                                <Edit2 className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
                              </button>

                              <button
                                onClick={() => handleToggleActive(doctor.id, doctor.isActive)}
                                className={`p-1 border rounded-lg transition-all cursor-pointer ${
                                  doctor.isActive 
                                    ? 'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 bg-amber-100 dark:bg-amber-500/10 hover:bg-amber-200 dark:hover:bg-amber-500/20 border-amber-200 dark:border-amber-500/20' 
                                    : 'text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 bg-teal-100 dark:bg-teal-500/10 hover:bg-teal-200 dark:hover:bg-teal-500/20 border-teal-200 dark:border-teal-500/20'
                                }`}
                                title={doctor.isActive ? "Desabilitar" : "Habilitar"}
                              >
                                <Power className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {userPermissions.includes('admin:access') && (
                            <button
                              onClick={() => handleDeleteDoctor(doctor.id)}
                              className="p-1 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 bg-rose-100 dark:bg-rose-500/10 hover:bg-rose-200 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/20 rounded-lg transition-all cursor-pointer shadow-md"
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
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-500 italic">
                      Nenhum médico encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={page}
            limit={limit}
            total={total}
            onPageChange={setPage}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
          />
        </div>
      )}
    </div>
  );
};
