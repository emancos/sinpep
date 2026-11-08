import React, { useState } from 'react';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  Pin,
  Plus,
  Pencil,
  Trash2,
  Building2,
  Globe,
  Loader2,
} from 'lucide-react';
import { useDashboardNotices, useDeleteNotice } from '../../../hooks/useDashboard';
import type { DashboardNotice } from '../../../hooks/useDashboard';
import { useAuthStore } from '../../../store/useAuthStore';
import { formatDateTimeBR } from '../../../utils/brazilianFormatters';
import { CreateOrEditNoticeModal } from './CreateOrEditNoticeModal';

export const NoticeBoard: React.FC = () => {
  const { user, permissions, activeProfile } = useAuthStore();
  const isAdmin = permissions.includes('admin:access') || activeProfile?.name === 'Administrador';
  const isCoordinator = activeProfile?.name === 'Coordenador de Unidade';
  const canPublish = isAdmin || isCoordinator;

  const { data: notices, isLoading } = useDashboardNotices();
  const deleteMutation = useDeleteNotice();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<DashboardNotice | null>(null);

  const handleEdit = (notice: DashboardNotice) => {
    setSelectedNotice(notice);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja remover este comunicado do mural?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleOpenNew = () => {
    setSelectedNotice(null);
    setModalOpen(true);
  };

  // Se não houver avisos e o usuário não puder publicar, não renderiza nada
  if (!isLoading && (!notices || notices.length === 0) && !canPublish) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header do Quadro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Mural de Avisos & Comunicados
              </h2>
              {notices && notices.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  {notices.length} ativo{notices.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Orientações, comunicados oficiais e avisos da coordenação
            </p>
          </div>
        </div>

        {canPublish && (
          <button
            type="button"
            onClick={handleOpenNew}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Publicar Comunicado</span>
          </button>
        )}
      </div>

      {/* Lista de Avisos */}
      {isLoading ? (
        <div className="flex items-center justify-center py-6 text-slate-400 gap-2 text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span>Carregando comunicados...</span>
        </div>
      ) : !notices || notices.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400">
          Nenhum comunicado ativo no momento.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {notices.map((notice) => {
            const isAuthor = notice.authorId === user?.id;
            const canManage = isAdmin || isAuthor;

            // Cores e Ícones semânticos
            let borderClass = 'border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20';
            let iconClass = 'text-blue-600 dark:text-blue-400';
            let IconComponent = Info;
            let typeBadgeClass = 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
            let typeLabel = 'Informativo';

            if (notice.type === 'URGENT') {
              borderClass = 'border-rose-300 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20';
              iconClass = 'text-rose-600 dark:text-rose-400 animate-pulse';
              IconComponent = AlertTriangle;
              typeBadgeClass = 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300';
              typeLabel = 'Urgente';
            } else if (notice.type === 'WARNING') {
              borderClass = 'border-amber-300 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20';
              iconClass = 'text-amber-600 dark:text-amber-400';
              IconComponent = AlertCircle;
              typeBadgeClass = 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300';
              typeLabel = 'Atenção';
            }

            return (
              <div
                key={notice.id}
                className={`relative rounded-xl border p-4 flex flex-col justify-between transition-all hover:shadow-sm ${borderClass}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-2xs font-bold uppercase tracking-wider ${typeBadgeClass}`}>
                        {typeLabel}
                      </span>

                      {notice.isPinned && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                          <Pin className="w-3 h-3" /> Fixado
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 text-2xs text-slate-500 dark:text-slate-400 font-medium">
                        {notice.scope === 'GLOBAL' ? (
                          <>
                            <Globe className="w-3 h-3 text-slate-400" />
                            Rede Municipal
                          </>
                        ) : (
                          <>
                            <Building2 className="w-3 h-3 text-blue-500" />
                            {notice.healthCenterName || 'Unidade Local'}
                          </>
                        )}
                      </span>
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEdit(notice)}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Editar comunicado"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(notice.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Excluir comunicado"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-start gap-2.5 mt-2.5">
                    <IconComponent className={`w-4 h-4 shrink-0 mt-0.5 ${iconClass}`} />
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                        {notice.title}
                      </h4>
                      <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-line leading-relaxed">
                        {notice.content}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-2xs text-slate-500 dark:text-slate-400">
                  <span>Por: <strong className="font-semibold text-slate-700 dark:text-slate-300">{notice.authorName}</strong></span>
                  <span>{formatDateTimeBR(notice.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Publicação / Edição */}
      <CreateOrEditNoticeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        noticeToEdit={selectedNotice}
      />
    </div>
  );
};
