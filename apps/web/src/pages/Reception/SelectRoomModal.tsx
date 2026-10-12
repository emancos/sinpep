import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Building2, 
  Search, 
  X, 
  Check, 
  Loader2, 
  MapPin, 
  Layers, 
  AlertCircle,
  CheckCircle2,
  Lock,
  DoorOpen
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  getRooms, 
  allocateRoom, 
  deallocateRoom, 
  type RoomAllocation 
} from '../../services/rooms';
import { useAuthStore } from '../../store/useAuthStore';

interface SelectRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  specialtyName: string;
  date: string;
  currentAllocation: RoomAllocation | null;
  onSuccess?: () => void;
  isMandatory?: boolean;
}

export const SelectRoomModal: React.FC<SelectRoomModalProps> = ({
  isOpen,
  onClose,
  specialtyName,
  date,
  currentAllocation,
  onSuccess,
  isMandatory = false,
}) => {
  const token = useAuthStore(state => state.token);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>(
    currentAllocation?.roomId || ''
  );

  // Carrega todos os ambulatórios com status de ocupação para esta data
  const { data: rooms = [], isLoading: isLoadingRooms } = useQuery({
    queryKey: ['rooms-with-occupancy', date],
    queryFn: () => getRooms({ date, activeOnly: true }, token!),
    enabled: isOpen && !!token,
  });

  // Atualiza a seleção inicial se mudar a alocação atual
  React.useEffect(() => {
    if (currentAllocation?.roomId) {
      setSelectedRoomId(currentAllocation.roomId);
    } else {
      setSelectedRoomId('');
    }
    setSearch('');
  }, [currentAllocation, isOpen]);

  const allocateMutation = useMutation({
    mutationFn: (roomId: string) =>
      allocateRoom({ roomId, specialtyName, date }, token!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rooms-with-occupancy'] });
      queryClient.invalidateQueries({ queryKey: ['room-allocation', specialtyName, date] });
      queryClient.invalidateQueries({ queryKey: ['all-room-allocations', date] });
      toast.success(`Ambulatório "${data.room?.name || ''} (Sala ${data.room?.number || ''})" vinculado com sucesso!`);
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erro ao vincular ambulatório.');
    },
  });

  const deallocateMutation = useMutation({
    mutationFn: () => deallocateRoom({ specialtyName, date }, token!),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['rooms-with-occupancy'] });
      queryClient.invalidateQueries({ queryKey: ['room-allocation', specialtyName, date] });
      queryClient.invalidateQueries({ queryKey: ['all-room-allocations', date] });
      toast.success(res.message || 'Ambulatório desocupado com sucesso!');
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erro ao desocupar ambulatório.');
    },
  });

  // Filtro pesquisável
  const filteredRooms = useMemo(() => {
    if (!search.trim()) return rooms;
    const term = search.toLowerCase();
    return rooms.filter(
      r =>
        r.name.toLowerCase().includes(term) ||
        r.number.toLowerCase().includes(term) ||
        (r.sector && r.sector.toLowerCase().includes(term)) ||
        (r.floor && r.floor.toLowerCase().includes(term))
    );
  }, [rooms, search]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!selectedRoomId) {
      toast.error('Por favor, selecione um ambulatório disponível.');
      return;
    }
    allocateMutation.mutate(selectedRoomId);
  };

  const handleDeallocate = () => {
    deallocateMutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-sm">
              <DoorOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {currentAllocation ? 'Alterar Ambulatório' : 'Vincular Ambulatório'}
              </h2>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-0.5 truncate max-w-sm">
                {specialtyName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Banner */}
        <div className="px-6 pt-4 pb-2 bg-blue-50/50 dark:bg-blue-950/20 border-b border-blue-100/50 dark:border-blue-900/20 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p>
            {isMandatory && !currentAllocation
              ? 'É obrigatório vincular a especialidade a uma sala/ambulatório para iniciar o atendimento dos pacientes.'
              : 'Selecione a sala onde o médico realizará os atendimentos desta especialidade hoje.'}
          </p>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-700/60 bg-white dark:bg-slate-800">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar ambulatório por nome, número da sala, setor..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
        </div>

        {/* Searchable Select List */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1 min-h-[220px]">
          {isLoadingRooms ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span className="text-xs">Carregando ambulatórios disponíveis...</span>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum ambulatório encontrado para a busca.</p>
            </div>
          ) : (
            filteredRooms.map((room) => {
              // Verifica se a sala está ocupada por OUTRA especialidade nesta data
              const isOccupiedByOther =
                room.isOccupied &&
                room.currentAllocation?.specialtyName !== specialtyName;

              const isCurrentForThisSpec =
                room.isOccupied &&
                room.currentAllocation?.specialtyName === specialtyName;

              const isSelected = selectedRoomId === room.id;

              return (
                <div
                  key={room.id}
                  onClick={() => {
                    if (!isOccupiedByOther) {
                      setSelectedRoomId(room.id);
                    }
                  }}
                  className={`p-3.5 rounded-xl border transition-all select-none ${
                    isOccupiedByOther
                      ? 'bg-slate-100/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/50 opacity-60 cursor-not-allowed'
                      : isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 dark:border-blue-500 shadow-sm cursor-pointer'
                      : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Radio / Selection Indicator */}
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all shrink-0 ${
                          isOccupiedByOther
                            ? 'border-slate-300 dark:border-slate-600 bg-slate-200 dark:bg-slate-700'
                            : isSelected
                            ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                        }`}
                      >
                        {isSelected && !isOccupiedByOther && <Check className="w-3 h-3 stroke-[3]" />}
                        {isOccupiedByOther && <Lock className="w-3 h-3 text-slate-400" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                            Sala {room.number}
                          </span>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {room.name}
                          </h4>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {room.sector && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{room.sector}</span>
                            </span>
                          )}
                          {room.floor && (
                            <span className="flex items-center gap-1">
                              <Layers className="w-3 h-3 text-slate-400" />
                              <span>{room.floor}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0 text-right">
                      {isCurrentForThisSpec ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
                          <CheckCircle2 className="w-3 h-3 text-blue-500" />
                          <span>Ambulatório Atual</span>
                        </span>
                      ) : isOccupiedByOther ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800 line-clamp-1 max-w-[170px]" title={`Ocupado por ${room.currentAllocation?.specialtyName}`}>
                          <Lock className="w-3 h-3 shrink-0" />
                          <span className="truncate">Ocupado: {room.currentAllocation?.specialtyName}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          Disponível
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 flex flex-wrap items-center justify-between gap-3">
          {/* Botão de desocupar se já tiver sala vinculada */}
          {currentAllocation ? (
            <button
              type="button"
              onClick={handleDeallocate}
              disabled={deallocateMutation.isPending || allocateMutation.isPending}
              className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
            >
              {deallocateMutation.isPending ? 'Desocupando...' : 'Desocupar Ambulatório'}
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={allocateMutation.isPending || deallocateMutation.isPending}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={
                !selectedRoomId ||
                selectedRoomId === currentAllocation?.roomId ||
                allocateMutation.isPending ||
                deallocateMutation.isPending
              }
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {allocateMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{currentAllocation ? 'Confirmar Troca' : 'Vincular Sala'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
