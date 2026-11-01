import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Stethoscope,
  CalendarCheck,
  Send,
  Layers,
  Check,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import { useAuthStore, type ActiveProfile } from '../store/useAuthStore';
import api from '../services/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface SwitchProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SwitchProfileModal: React.FC<SwitchProfileModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const activeProfile = useAuthStore((state) => state.activeProfile);
  const availableProfiles = useAuthStore((state) => state.availableProfiles);
  const selectProfileInStore = useAuthStore((state) => state.selectProfile);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const getProfileIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('admin')) return <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
    if (n.includes('médico') || n.includes('medico')) return <Stethoscope className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
    if (n.includes('recep')) return <CalendarCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
    if (n.includes('solicitante')) return <Send className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
    if (n.includes('regula')) return <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
    return <UserCheck className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
  };

  const getProfileTheme = (isSelected: boolean) => {
    if (isSelected) {
      return 'border-blue-500 bg-blue-50/60 dark:bg-blue-900/30 ring-2 ring-blue-500';
    }
    return 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50/50';
  };

  const handleSelect = async (profile: ActiveProfile) => {
    if (profile.id === activeProfile?.id) {
      onClose();
      return;
    }

    setSwitchingId(profile.id);
    try {
      const response = await api.post('/auth/select-profile', { profileId: profile.id });
      const { accessToken, permissions, activeProfile: newActiveProfile } = response.data;

      selectProfileInStore(newActiveProfile, permissions, accessToken);
      toast.success(`Perfil alternado para "${profile.name}" com sucesso!`);
      onClose();

      // Redireciona para o dashboard com o novo escopo de permissões
      navigate('/', { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao alternar perfil';
      toast.error(msg);
    } finally {
      setSwitchingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Alternar Perfil de Acesso
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Escolha com qual perfil você deseja operar nesta sessão:
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profiles list */}
        <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
          {availableProfiles.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-500">
              Nenhum perfil adicional disponível para este usuário.
            </div>
          ) : (
            availableProfiles.map((p) => {
              const isSelected = p.id === activeProfile?.id;
              const isPending = switchingId === p.id;

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelect(p)}
                  disabled={isPending}
                  className={`w-full text-left p-4 rounded-xl border transition flex items-center justify-between gap-3 ${getProfileTheme(
                    isSelected,
                  )}`}
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-700">
                      {getProfileIcon(p.name)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-gray-900 dark:text-white text-sm">
                          {p.name}
                        </span>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                            Ativo
                          </span>
                        )}
                        {p.isDefault && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                            Padrão
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                        {p.description || 'Permissões específicas da função'}
                      </p>
                    </div>
                  </div>

                  <div>
                    {isPending ? (
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    ) : isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center">
                        <Check className="w-4 h-4" />
                      </div>
                    ) : (
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 rounded-xl transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
