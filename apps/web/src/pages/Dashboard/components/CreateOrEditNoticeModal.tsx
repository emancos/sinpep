import React, { useState, useEffect } from 'react';
import { X, Info, Pin, Loader2 } from 'lucide-react';
import { useCreateNotice, useUpdateNotice } from '../../../hooks/useDashboard';
import type { DashboardNotice } from '../../../hooks/useDashboard';
import { useAuthStore } from '../../../store/useAuthStore';

interface CreateOrEditNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  noticeToEdit?: DashboardNotice | null;
}

export const CreateOrEditNoticeModal: React.FC<CreateOrEditNoticeModalProps> = ({
  isOpen,
  onClose,
  noticeToEdit,
}) => {
  const { user, permissions, activeProfile } = useAuthStore();
  const isAdmin = permissions.includes('admin:access') || activeProfile?.name === 'Administrador';

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'INFO' | 'WARNING' | 'URGENT'>('INFO');
  const [scope, setScope] = useState<'GLOBAL' | 'HEALTH_CENTER'>('GLOBAL');
  const [isPinned, setIsPinned] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');

  const createMutation = useCreateNotice();
  const updateMutation = useUpdateNotice();

  useEffect(() => {
    if (noticeToEdit) {
      setTitle(noticeToEdit.title || '');
      setContent(noticeToEdit.content || '');
      setType(noticeToEdit.type || 'INFO');
      setScope(noticeToEdit.scope || 'GLOBAL');
      setIsPinned(noticeToEdit.isPinned || false);
      setExpiresAt(noticeToEdit.expiresAt ? noticeToEdit.expiresAt.split('T')[0] : '');
    } else {
      setTitle('');
      setContent('');
      setType('INFO');
      setScope(isAdmin ? 'GLOBAL' : 'HEALTH_CENTER');
      setIsPinned(false);
      setExpiresAt('');
    }
  }, [noticeToEdit, isOpen, isAdmin]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    if (noticeToEdit) {
      await updateMutation.mutateAsync({
        id: noticeToEdit.id,
        payload: {
          title,
          content,
          type,
          scope,
          isPinned,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        },
      });
    } else {
      await createMutation.mutateAsync({
        title,
        content,
        type,
        scope,
        healthCenterId: scope === 'HEALTH_CENTER' ? user?.healthCenterId : null,
        isPinned,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
    }

    onClose();
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                {noticeToEdit ? 'Editar Comunicado' : 'Publicar Novo Comunicado'}
              </h3>
              <p className="text-xs text-slate-500">Mural de Avisos da Rede / Unidade</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Título do Comunicado *
            </label>
            <input
              type="text"
              required
              maxLength={200}
              placeholder="Ex: Escala emergencial de sábado confirmada"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tipo / Severidade
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
              >
                <option value="INFO">Informativo (Azul)</option>
                <option value="WARNING">Aviso / Atenção (Amarelo)</option>
                <option value="URGENT">Urgente / Crítico (Vermelho)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Abrangência
              </label>
              <select
                value={scope}
                disabled={!isAdmin}
                onChange={(e) => setScope(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none disabled:opacity-60"
              >
                {isAdmin && <option value="GLOBAL">Global (Toda a Rede Municipal)</option>}
                <option value="HEALTH_CENTER">Unidade de Saúde Específica</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Conteúdo do Comunicado *
            </label>
            <textarea
              required
              rows={4}
              placeholder="Descreva as instruções, orientações aos profissionais ou detalhes do comunicado..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Expira em (opcional)
              </label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
              />
            </div>

            <div className="pt-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Pin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Fixar no topo do mural
                </span>
              </label>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || !title.trim() || !content.trim()}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm hover:shadow flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{noticeToEdit ? 'Salvar Alterações' : 'Publicar Comunicado'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
