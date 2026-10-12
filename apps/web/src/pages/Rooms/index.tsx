import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  MapPin, 
  Layers, 
  Hash, 
  Loader2,
  Power
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
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  // Verifica se o usuário atual é médico.
  // Regra do usuário: "Médicos não terão acesso a essa página. Todos os outros usuários poderão gerenciar as salas."
  const { data: currentDoctor, isLoading: isLoadingDoctor } = useCurrentDoctor();
  const isDoctor = Boolean(currentDoctor?.id);

  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  const { data: rooms = [], isLoading: isLoadingRooms } = useQuery({
    queryKey: ['rooms', searchTerm],
    queryFn: () => getRooms({ search: searchTerm || undefined }, token!),
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

  if (isLoadingDoctor) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Se o usuário for médico, redireciona para a página inicial
  if (isDoctor) {
    return <Navigate to="/" replace />;
  }

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
      title: 'Excluir Ambulatório',
      description: `Tem certeza de que deseja remover o ambulatório "${room.name} (${room.number})"? Esta ação não poderá ser desfeita.`,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      variant: 'danger',
    });

    if (confirmed) {
      deleteMutation.mutate(room.id);
    }
  };

  const handleToggle = async (room: Room) => {
    toggleMutation.mutate(room.id);
  };

  const handleFormSubmit = async (data: { name: string; number: string; sector?: string; floor?: string; isActive?: boolean }) => {
    if (editingRoom) {
      await updateMutation.mutateAsync({ id: editingRoom.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const totalRooms = rooms.length;
  const activeRooms = rooms.filter(r => r.isActive).length;
  const inactiveRooms = totalRooms - activeRooms;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Gerenciamento de Ambulatórios & Salas
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Cadastre e gerencie as salas para atendimento dos pacientes na recepção
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-600/20 hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Ambulatório</span>
        </button>
      </div>

      {/* Metrics & Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metric Cards */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total de Salas</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalRooms}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Salas Ativas</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{activeRooms}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100/80 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Salas Inativas</p>
            <p className="text-2xl font-black text-slate-500 dark:text-slate-400 mt-1">{inactiveRooms}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-slate-400 flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Search */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por nome, número, setor..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 shadow-sm text-sm"
          />
        </div>
      </div>

      {/* Rooms Grid */}
      {isLoadingRooms ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : rooms.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200/80 dark:border-slate-700 shadow-sm">
          <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Nenhum ambulatório encontrado</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {searchTerm ? 'Nenhuma sala corresponde à sua busca.' : 'Comece cadastrando as salas médicas para atendimento.'}
          </p>
          {!searchTerm && (
            <button
              onClick={handleOpenCreate}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Primeiro Ambulatório</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {rooms.map((room) => (
            <div
              key={room.id}
              className={`rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between group bg-white dark:bg-slate-800 ${
                room.isActive
                  ? 'border-slate-200/80 dark:border-slate-700 shadow-sm hover:shadow-md'
                  : 'border-dashed border-slate-300 dark:border-slate-700/60 opacity-70 bg-slate-50/50 dark:bg-slate-900/30'
              }`}
            >
              <div>
                {/* Header do Card */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 shadow-sm tracking-wide">
                      <Hash className="w-3 h-3" />
                      <span>Sala {room.number}</span>
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                      room.isActive
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-400 border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    {room.isActive ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>Ativo</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3 text-slate-400" />
                        <span>Inativo</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Nome do Ambulatório */}
                <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {room.name}
                </h3>

                {/* Localização (Setor e Andar) */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-4">
                  {room.sector && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{room.sector}</span>
                    </span>
                  )}
                  {room.floor && (
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{room.floor}</span>
                    </span>
                  )}
                  {!room.sector && !room.floor && (
                    <span className="text-slate-400 italic">Setor e andar não especificados</span>
                  )}
                </div>
              </div>

              {/* Card Footer / Ações */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                <button
                  onClick={() => handleToggle(room)}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                    room.isActive
                      ? 'text-slate-600 hover:text-amber-600 hover:bg-amber-50 dark:text-slate-300 dark:hover:bg-amber-950/30'
                      : 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30'
                  }`}
                  title={room.isActive ? 'Desativar sala' : 'Ativar sala'}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{room.isActive ? 'Desativar' : 'Ativar'}</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(room)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                    title="Editar ambulatório"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(room)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors"
                    title="Excluir ambulatório"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criação / Edição */}
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
