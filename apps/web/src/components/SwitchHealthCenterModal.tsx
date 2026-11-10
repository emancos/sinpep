import React, { useState } from 'react';
import {
  X,
  Building2,
  Check,
  Search,
  MapPin,
  ShieldAlert,
} from 'lucide-react';
import { useAuthStore, type ActiveHealthCenter } from '../store/useAuthStore';
import api from '../services/api';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface SwitchHealthCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SwitchHealthCenterModal: React.FC<SwitchHealthCenterModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const activeHealthCenter = useAuthStore((state) => state.activeHealthCenter);
  const availableHealthCenters = useAuthStore((state) => state.availableHealthCenters);
  const selectHealthCenterInStore = useAuthStore((state) => state.selectHealthCenter);
  const [searchTerm, setSearchTerm] = useState('');
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredCenters = availableHealthCenters.filter((hc) => {
    const q = searchTerm.toLowerCase();
    return (
      hc.name.toLowerCase().includes(q) ||
      (hc.cnes && hc.cnes.toLowerCase().includes(q))
    );
  });

  const handleSelect = async (center: ActiveHealthCenter) => {
    if (center.id === activeHealthCenter?.id) {
      onClose();
      return;
    }

    setSwitchingId(center.id);
    try {
      const response = await api.post('/auth/select-health-center', { healthCenterId: center.id });
      const { accessToken, activeHealthCenter: newActiveCenter } = response.data;

      // Atualiza o Zustand store com o novo activeHealthCenter e token
      selectHealthCenterInStore(newActiveCenter || center, accessToken);

      // Invalida dados de regulação, agendas, atendimentos e cotas
      queryClient.clear();

      toast.success(`Unidade ativa alterada para: ${center.name}`);
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Erro ao alternar unidade de saúde ativa.';
      toast.error(msg);
    } finally {
      setSwitchingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Alternar Unidade de Saúde Ativa
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Selecione a unidade na qual você está atuando no momento
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informação sobre escopo de regulação */}
        {user?.isMunicipalRegulator && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <span className="font-bold">Regulador Central Geral:</span> Você possui escopo municipal irrestrito, podendo alternar entre as unidades de saúde para acompanhar agendamentos e cotas específicas.
            </div>
          </div>
        )}

        {/* Busca caso haja mais de 5 unidades */}
        {availableHealthCenters.length > 5 && (
          <div className="px-6 pt-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar unidade por nome ou CNES..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Lista de Unidades */}
        <div className="p-6 overflow-y-auto space-y-2.5 flex-1 divide-y divide-transparent">
          {filteredCenters.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              Nenhuma unidade de saúde encontrada.
            </div>
          ) : (
            filteredCenters.map((hc) => {
              const isActive = hc.id === activeHealthCenter?.id;
              const isSwitching = switchingId === hc.id;

              return (
                <button
                  key={hc.id}
                  type="button"
                  disabled={isSwitching}
                  onClick={() => handleSelect(hc)}
                  className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                    isActive
                      ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-900/30 ring-1 ring-blue-500 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2.5 rounded-xl shrink-0 ${
                        isActive
                          ? 'bg-blue-500 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                          {hc.name}
                        </p>
                        {hc.isDefault && (
                          <span className="text-3xs font-semibold px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 shrink-0">
                            Padrão
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {hc.cnes ? `CNES: ${hc.cnes}` : 'CNES não informado'}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 ml-3">
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-full shadow-xs border border-blue-200 dark:border-blue-800">
                        <Check className="w-3.5 h-3.5" />
                        Ativa
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium hover:text-slate-700 dark:hover:text-slate-200">
                        {isSwitching ? 'Alternando...' : 'Selecionar'}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-xl transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
