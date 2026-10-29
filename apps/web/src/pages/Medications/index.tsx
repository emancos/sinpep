import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Pill, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  Loader2, 
  Power,
  Upload,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  AlertCircle,
  Eye,
  ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  getMedications, 
  deleteMedication, 
  toggleMedicationActive, 
  type Medication 
} from '../../services/medications';
import { useAuthStore } from '../../store/useAuthStore';
import { useConfirm } from '../../contexts/ConfirmContext';
import { TablePagination } from '../../components/TablePagination';
import { ImportMedicationsModal } from './ImportMedicationsModal';
import { CreateOrEditMedicationModal } from './CreateOrEditMedicationModal';
import { decodeHtmlEntities } from '../../utils/text';

export const MedicationsList: React.FC = () => {
  const token = useAuthStore(state => state.token);
  const permissions = useAuthStore(state => state.permissions);
  const isAdmin = permissions.includes('admin:access');
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Query medications list with sort, pagination, and filter matching DoctorsList pattern
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['medications', page, limit, sortBy, sortOrder, debouncedSearch, showInactive],
    queryFn: () => getMedications({
      page,
      limit,
      sortBy,
      sortOrder,
      search: debouncedSearch || undefined,
      includeInactive: showInactive ? 'true' : 'false',
    }, token!),
    enabled: !!token,
  });

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: (id: string) => toggleMedicationActive(id, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      queryClient.invalidateQueries({ queryKey: ['medication-stats'] });
      toast.success('Status do medicamento atualizado com sucesso!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erro ao alterar status.');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMedication(id, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      queryClient.invalidateQueries({ queryKey: ['medication-stats'] });
      toast.success('Medicamento excluído com sucesso!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erro ao excluir medicamento.');
    },
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

  const handleToggleActive = async (med: Medication) => {
    const actionName = med.isActive ? 'Desabilitar' : 'Habilitar';
    const isConfirmed = await confirm({
      title: `${actionName} Medicamento`,
      description: `Deseja realmente ${actionName.toLowerCase()} o medicamento "${decodeHtmlEntities(med.name)}"?`,
      confirmText: actionName,
      cancelText: 'Cancelar',
      variant: med.isActive ? 'danger' : 'info',
    });

    if (isConfirmed) {
      toggleMutation.mutate(med.id);
    }
  };

  const handleDelete = async (med: Medication) => {
    const isConfirmed = await confirm({
      title: 'Excluir Definitivamente',
      description: `Deseja realmente excluir este medicamento DEFINITIVAMENTE? Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      variant: 'danger',
    });

    if (isConfirmed) {
      deleteMutation.mutate(med.id);
    }
  };

  const handleEdit = (med: Medication) => {
    setEditingMedication(med);
    setIsEditModalOpen(true);
  };

  const handleCreateNew = () => {
    setEditingMedication(null);
    setIsEditModalOpen(true);
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

  const medicationsList = data?.data || [];
  const total = data?.total || 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Pill className="w-6 h-6 text-blue-600 dark:text-blue-500" />
            Medicamentos (ANVISA)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gerenciamento do catálogo oficial de medicamentos e dosagens para prescrição.
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-md text-sm transition-all duration-300 shadow-md active:scale-95 cursor-pointer"
              title="Importar ou sincronizar base CSV da ANVISA"
            >
              <Upload className="w-4 h-4" />
              <span>Importar CSV</span>
            </button>

            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md text-sm transition-all duration-300 shadow-md active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Medicamento</span>
            </button>
          </div>
        )}
      </div>

      {/* Search Bar matching DoctorsList */}
      <div className="bg-white shadow-md dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-md p-4 backdrop-blur-md flex flex-col sm:flex-row items-center gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por medicamento, substância ou laboratório..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-slate-700 dark:text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/80 transition-all text-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 transition-colors">
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
            {total.toLocaleString('pt-BR')}
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
        <div className="flex items-center gap-3 p-4 bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-md max-w-xl mx-auto">
          <AlertCircle className="w-6 h-6 shrink-0" />
          <div>
            <h4 className="font-semibold">Erro ao carregar dados</h4>
            <p className="text-xs text-red-600 dark:text-red-400/80 mt-0.5">
              {(error as Error | null)?.message || 'Erro de conexão com o servidor.'}
            </p>
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
                  {renderSortHeader('Nome do Medicamento', 'name')}
                  {renderSortHeader('Princípio Ativo & Dosagem', 'substance')}
                  {renderSortHeader('Laboratório', 'laboratory')}
                  {renderSortHeader('Registro ANVISA', 'registrationNumber')}
                  {renderSortHeader('Status', 'status')}
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-sm">
                {medicationsList.length > 0 ? (
                  medicationsList.map((med) => {
                    const rawName = decodeHtmlEntities(med.name);
                    const substanceDisplay = decodeHtmlEntities(med.substanceWithDosage || med.substanceDescription);
                    const labDisplay = decodeHtmlEntities(med.laboratory);
                    const compDisplay = decodeHtmlEntities(med.complement);

                    return (
                      <tr 
                        key={med.id} 
                        className="hover:bg-slate-200 dark:bg-slate-800/20 transition-colors duration-150 group"
                      >
                        {/* Name Column */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-md ${med.isActive ? 'bg-blue-100 dark:bg-blue-500/10' : 'bg-slate-200 dark:bg-slate-800/50'} flex items-center justify-center shrink-0`}>
                              <Pill className={`w-4 h-4 ${med.isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`} />
                            </div>
                            <div className="flex flex-col">
                              <span className={`font-medium transition-colors duration-200 block ${med.isActive ? 'text-slate-900 dark:text-white group-hover:text-blue-400' : 'text-slate-500 line-through'}`}>
                                {rawName}
                              </span>
                              {!med.isActive && (
                                <span className="text-[10px] text-rose-600 dark:text-rose-400/80 font-semibold uppercase">
                                  Desabilitado
                                </span>
                              )}
                              {compDisplay && (
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5" title={compDisplay}>
                                  {compDisplay}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Substance & Dosage */}
                        <td className="px-6 py-4">
                          {substanceDisplay ? (
                            <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs rounded-md border border-indigo-200 dark:border-indigo-500/20 font-medium inline-block">
                              {substanceDisplay}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-xs">Não especificado</span>
                          )}
                        </td>

                        {/* Laboratory */}
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-xs">
                          {labDisplay ? (
                            <span className="font-medium">{labDisplay}</span>
                          ) : (
                            <span className="text-slate-400 italic">Não informado</span>
                          )}
                        </td>

                        {/* Registration Number & Category */}
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-xs space-y-1">
                          <div className="font-mono">
                            {med.registrationNumber || '-'}
                          </div>
                          {med.category && (
                            <span className="inline-block px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] rounded border border-slate-200 dark:border-slate-700">
                              {decodeHtmlEntities(med.category)}
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          {med.isActive ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-400/80 font-medium bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-500/20">
                              <ShieldAlert className="w-3 h-3" />
                              Inativo
                            </span>
                          )}
                        </td>

                        {/* Actions matching DoctorsList action button styling */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEdit(med)}
                              className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-100 dark:bg-indigo-500/10 hover:bg-indigo-200 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/20 rounded-md transition-all cursor-pointer shadow-md"
                              title="Visualizar detalhes"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {isAdmin && (
                              <>
                                <button
                                  onClick={() => handleEdit(med)}
                                  className="p-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-100 dark:bg-blue-500/10 hover:bg-blue-200 dark:hover:bg-blue-500/20 border border-blue-200 dark:border-blue-500/20 rounded-md transition-all cursor-pointer shadow-md"
                                  title="Editar medicamento"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => handleToggleActive(med)}
                                  className={`p-1 border rounded-md transition-all cursor-pointer shadow-md ${med.isActive
                                    ? 'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 bg-amber-100 dark:bg-amber-500/10 hover:bg-amber-200 dark:hover:bg-amber-500/20 border-amber-200 dark:border-amber-500/20'
                                    : 'text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 bg-teal-100 dark:bg-teal-500/10 hover:bg-teal-200 dark:hover:bg-teal-500/20 border-teal-200 dark:border-teal-500/20'
                                  }`}
                                  title={med.isActive ? "Desabilitar" : "Habilitar"}
                                >
                                  <Power className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => handleDelete(med)}
                                  className="p-1 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 bg-rose-100 dark:bg-rose-500/10 hover:bg-rose-200 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/20 rounded-md transition-all cursor-pointer shadow-md"
                                  title="Excluir Definitivamente"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-500 italic">
                      Nenhum medicamento encontrado.
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

      {/* Modals */}
      {isAdmin && (
        <>
          <ImportMedicationsModal
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
          />

          <CreateOrEditMedicationModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            medicationToEdit={editingMedication}
          />
        </>
      )}
    </div>
  );
};
