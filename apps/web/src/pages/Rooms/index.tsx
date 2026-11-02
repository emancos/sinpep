import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  Loader2,
  Power,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  AlertCircle,
  ShieldAlert,
  Hash
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  getRooms, 
  createRoom, 
  updateRoom, 
  deleteRoom, 
  toggleRoomActive, 
  type Room 
} from '../../services/rooms';
import { useAuthStore } from '../../store/useAuthStore';
import { useCurrentDoctor } from '../../hooks/useDoctors';
import { useConfirm } from '../../contexts/ConfirmContext';
import { CreateOrEditRoomModal } from './CreateOrEditRoomModal';
import { Navigate } from 'react-router-dom';

export const RoomsList: React.FC = () => {
  const token = useAuthStore(state => state.token);
  const permissions = useAuthStore(state => state.permissions);
  const isAdmin = permissions.includes('admin:access');
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  // Verifica se o usuário atual é médico.
  // Regra do usuário: "Médicos não terão acesso a essa página. Todos os outros usuários poderão gerenciar as salas."
  const { data: currentDoctor, isLoading: isLoadingDoctor } = useCurrentDoctor();
  const isDoctor = !isAdmin && Boolean(currentDoctor?.id);

  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  const { data: rooms = [], isLoading: isLoadingRooms, isError, error } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => getRooms({}, token!),
    enabled: !!token && !isDoctor,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; number: string; sector?: string; floor?: string; isActive?: boolean }) =>
      createRoom(data, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('Ambulatório criado com sucesso!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erro ao criar ambulatório.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateRoom>[1] }) =>
      updateRoom(id, data, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('Ambulatório atualizado com sucesso!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erro ao atualizar ambulatório.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRoom(id, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('Ambulatório removido com sucesso!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erro ao remover ambulatório.');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => toggleRoomActive(id, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('Status do ambulatório atualizado!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erro ao alterar status.');
    },
  });

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleOpenCreate = () => {
    setEditingRoom(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (room: Room) => {
    setEditingRoom(room);
    setModalOpen(true);
  };

  const handleDelete = async (room: Room) => {
    const confirmed = await confirm({
      title: 'Excluir Definitivamente',
      description: `Deseja realmente excluir este ambulatório DEFINITIVAMENTE? Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      variant: 'danger',
    });

    if (confirmed) {
      deleteMutation.mutate(room.id);
    }
  };

  const handleToggle = async (room: Room) => {
    const actionName = room.isActive ? 'Desabilitar' : 'Habilitar';
    const confirmed = await confirm({
      title: `${actionName} Ambulatório`,
      description: `Deseja realmente ${actionName.toLowerCase()} o ambulatório "${room.name} (${room.number})"?`,
      confirmText: actionName,
      cancelText: 'Cancelar',
      variant: room.isActive ? 'danger' : 'info',
    });

    if (confirmed) {
      toggleMutation.mutate(room.id);
    }
  };

  const handleFormSubmit = async (data: { name: string; number: string; sector?: string; floor?: string; isActive?: boolean }) => {
    if (editingRoom) {
      await updateMutation.mutateAsync({ id: editingRoom.id, data });
    } else {
      await createMutation.mutateAsync(data);
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

  // Filter and sort rooms list
  const filteredRooms = useMemo(() => {
    let result = rooms.filter(room => {
      if (!showInactive && !room.isActive) return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        room.name.toLowerCase().includes(term) ||
        room.number.toLowerCase().includes(term) ||
        (room.sector && room.sector.toLowerCase().includes(term)) ||
        (room.floor && room.floor.toLowerCase().includes(term))
      );
    });

    result.sort((a, b) => {
      let aVal = '';
      let bVal = '';

      if (sortBy === 'name') {
        aVal = a.name || '';
        bVal = b.name || '';
      } else if (sortBy === 'number') {
        aVal = a.number || '';
        bVal = b.number || '';
      } else if (sortBy === 'sector') {
        aVal = a.sector || '';
        bVal = b.sector || '';
      } else if (sortBy === 'isActive') {
        aVal = a.isActive ? '1' : '0';
        bVal = b.isActive ? '1' : '0';
      }

      const cmp = aVal.localeCompare(bVal, undefined, { numeric: true });
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [rooms, searchTerm, showInactive, sortBy, sortOrder]);

  if (isLoadingDoctor && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-10 h-10 text-blue-700 dark:text-blue-500 animate-spin" />
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Carregando...</p>
      </div>
    );
  }

  // Se o usuário for médico (e não administrador), redireciona para a página inicial
  if (isDoctor && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-500" />
            Gestão de Ambulatórios & Salas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Cadastre e gerencie as salas para atendimento dos pacientes na recepção.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md text-sm transition-all duration-300 shadow-md active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Ambulatório</span>
        </button>
      </div>

      {/* Search Bar matching DoctorsList */}
      <div className="bg-white shadow-md dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-md p-4 backdrop-blur-md flex flex-col sm:flex-row items-center gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nome, número ou setor..."
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
            {filteredRooms.length}
          </span>
        </div>
      </div>

      {/* Loading State */}
      {isLoadingRooms && (
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

      {/* Table & Cards Section */}
      {!isLoadingRooms && !isError && (
        <div className="bg-white shadow-md dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-md overflow-hidden backdrop-blur-md">
          {/* Visualização Desktop: Tabela completa */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  {renderSortHeader('Ambulatório / Sala', 'name')}
                  {renderSortHeader('Número', 'number')}
                  {renderSortHeader('Setor / Andar', 'sector')}
                  {renderSortHeader('Status', 'isActive')}
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-sm">
                {filteredRooms.length > 0 ? (
                  filteredRooms.map((room) => (
                    <tr 
                      key={room.id} 
                      className="hover:bg-slate-200 dark:bg-slate-800/20 transition-colors duration-150 group"
                    >
                      {/* Name Column */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-md ${room.isActive ? 'bg-blue-100 dark:bg-blue-500/10' : 'bg-slate-200 dark:bg-slate-800/50'} flex items-center justify-center shrink-0`}>
                            <Building2 className={`w-4 h-4 ${room.isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`} />
                          </div>
                          <div className="flex flex-col">
                            <span className={`font-medium transition-colors duration-200 block ${room.isActive ? 'text-slate-900 dark:text-white group-hover:text-blue-400' : 'text-slate-500 line-through'}`}>
                              {room.name}
                            </span>
                            {!room.isActive && (
                              <span className="text-[10px] text-rose-600 dark:text-rose-400/80 font-semibold uppercase">
                                Desabilitado
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Number */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono">
                          <Hash className="w-3 h-3 text-slate-400" />
                          Sala {room.number}
                        </span>
                      </td>

                      {/* Sector / Floor */}
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-xs">
                        <div className="flex flex-col gap-0.5">
                          {room.sector && (
                            <span className="font-medium">{room.sector}</span>
                          )}
                          {room.floor && (
                            <span className="text-slate-400">{room.floor}</span>
                          )}
                          {!room.sector && !room.floor && (
                            <span className="text-slate-400 italic">Não informado</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {room.isActive ? (
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

                      {/* Actions matching DoctorsList */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(room)}
                            className="p-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-100 dark:bg-blue-500/10 hover:bg-blue-200 dark:hover:bg-blue-500/20 border border-blue-200 dark:border-blue-500/20 rounded-md transition-all cursor-pointer shadow-md"
                            title="Editar ambulatório"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleToggle(room)}
                            className={`p-1 border rounded-md transition-all cursor-pointer shadow-md ${room.isActive
                              ? 'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 bg-amber-100 dark:bg-amber-500/10 hover:bg-amber-200 dark:hover:bg-amber-500/20 border-amber-200 dark:border-amber-500/20'
                              : 'text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 bg-teal-100 dark:bg-teal-500/10 hover:bg-teal-200 dark:hover:bg-teal-500/20 border-teal-200 dark:border-teal-500/20'
                            }`}
                            title={room.isActive ? "Desabilitar" : "Habilitar"}
                          >
                            <Power className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDelete(room)}
                            className="p-1 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 bg-rose-100 dark:bg-rose-500/10 hover:bg-rose-200 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/20 rounded-md transition-all cursor-pointer shadow-md"
                            title="Excluir Definitivamente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-500 italic">
                      Nenhum ambulatório encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Visualização Mobile: Cards estruturados e modernos */}
          <div className="md:hidden space-y-3 p-3.5 bg-slate-50/50 dark:bg-slate-950/40">
            {filteredRooms.length > 0 ? (
              filteredRooms.map((room) => (
                <div
                  key={room.id}
                  className={`p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-xs space-y-3 transition-all ${
                    !room.isActive
                      ? 'border-slate-200 dark:border-slate-800 opacity-75 bg-slate-50/40 dark:bg-slate-950/40'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {/* Top Row: Ícone + Nome da Sala/Ambulatório + Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          room.isActive
                            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4
                          className={`font-bold text-sm leading-snug break-words ${
                            room.isActive
                              ? 'text-slate-900 dark:text-white'
                              : 'text-slate-500 dark:text-slate-400 line-through'
                          }`}
                        >
                          {room.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 font-mono">
                            <Hash className="w-3 h-3 text-slate-400" />
                            Sala {room.number}
                          </span>
                          {!room.isActive && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 font-bold uppercase">
                              Desabilitado
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Badge Status */}
                    <div className="shrink-0">
                      {room.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200/80 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60 px-2 py-0.5 rounded-full">
                          <ShieldAlert className="w-3 h-3" />
                          Inativo
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Localização: Setor & Andar */}
                  {(room.sector || room.floor) && (
                    <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-100 dark:border-slate-800/80 text-xs">
                      <div>
                        <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">
                          Setor
                        </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 break-words mt-0.5 block">
                          {room.sector || <span className="text-slate-400 italic font-normal">Não informado</span>}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">
                          Andar / Pavimento
                        </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 break-words mt-0.5 block">
                          {room.floor || <span className="text-slate-400 italic font-normal">Não informado</span>}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Barra de Ações */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(room)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 border border-blue-200/80 dark:border-blue-800/50 transition-colors cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggle(room)}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        room.isActive
                          ? 'border-amber-200 dark:border-amber-800/60 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                          : 'border-teal-200 dark:border-teal-800/60 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40'
                      }`}
                      title={room.isActive ? "Desabilitar" : "Habilitar"}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(room)}
                      className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Excluir Definitivamente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-400 text-sm">
                Nenhum ambulatório encontrado.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      <CreateOrEditRoomModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleFormSubmit}
        room={editingRoom}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
};
