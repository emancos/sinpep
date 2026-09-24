import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Info, Sparkles, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRequests } from '../hooks/useRequests';
import { useNotifications } from '../hooks/useSisregOfficial';

export const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(() => {
    const stored = localStorage.getItem('lastCheckedNotifications');
    if (!stored) {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      localStorage.setItem('lastCheckedNotifications', yesterday);
      return yesterday;
    }
    return stored;
  });

  const [clearedAt, setClearedAt] = useState<string | null>(() => {
    return localStorage.getItem('clearedNotificationsAt');
  });

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Notificações de solicitações do sistema
  const { data } = useRequests({
    page: 1,
    limit: 20, // increased slightly to allow for more history
    sortBy: 'updatedAt',
    sortOrder: 'desc',
  });

  // Notificações persistentes oficiais do SISREG
  const { data: sysNotifs } = useNotifications();
  const systemNotifications = sysNotifs || [];
  const requests = data?.data || [];

  // Combine and sort notifications
  const allNotifs = [
    ...systemNotifications.map(n => ({ type: 'SYS' as const, data: n, date: new Date(n.createdAt) })),
    ...requests.map(r => ({ type: 'REQ' as const, data: r, date: new Date(r.updatedAt) }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  // Filter out cleared notifications
  const visibleNotifs = allNotifs.filter(n => {
    if (!clearedAt) return true;
    return n.date > new Date(clearedAt);
  });

  // Calcular contagem de não lidos (com base em todos, não apenas visíveis)
  const totalUnread = allNotifs.filter((n) => {
    if (!lastChecked) return true;
    return n.date > new Date(lastChecked);
  }).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (isOpen) {
          const now = new Date().toISOString();
          localStorage.setItem('lastCheckedNotifications', now);
          setLastChecked(now);
        }
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    const nextState = !isOpen;
    if (!nextState) {
      // Closing
      const now = new Date().toISOString();
      localStorage.setItem('lastCheckedNotifications', now);
      setLastChecked(now);
    }
    setIsOpen(nextState);
  };

  const handleClear = () => {
    const now = new Date().toISOString();
    localStorage.setItem('clearedNotificationsAt', now);
    setClearedAt(now);
  };

  const getStatusText = (status: string, createdAt: string, updatedAt: string) => {
    if (createdAt === updatedAt) return 'Nova solicitação';
    switch (status) {
      case 'PENDING_REGULATION': return 'Aguardando regulação';
      case 'SCHEDULED': return 'Solicitação agendada';
      case 'PENDING_SYSTEM': return 'Aguardando SISREG';
      case 'ARCHIVED': return 'Solicitação arquivada';
      case 'RETURNED': return 'Solicitação devolvida';
      case 'RE_REQUESTED': return 'Solicitação resolicitada';
      case 'CANCELED': return 'Solicitação cancelada';
      case 'DENIED': return 'Solicitação negada';
      default: return `Status: ${status}`;
    }
  };

  const getStatusBadgeClass = (status: string, createdAt: string, updatedAt: string) => {
    if (createdAt === updatedAt) return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    switch (status) {
      case 'PENDING_REGULATION': return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
      case 'SCHEDULED': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'PENDING_SYSTEM': return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
      case 'ARCHIVED': return 'bg-slate-500/10 text-slate-500 dark:text-slate-450 border border-slate-500/20';
      case 'RETURNED': return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'RE_REQUESTED': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'CANCELED': return 'bg-rose-500/10 text-rose-450 border border-rose-500/20';
      case 'DENIED': return 'bg-red-500/10 text-red-500 border border-red-500/20 font-bold';
      default: return 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20';
    }
  };

  const formatProtocol = (code: number) => `#${String(code).padStart(5, '0')}`;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className={`relative p-2.5 rounded-xl border transition-all duration-300 cursor-pointer ${
          isOpen
            ? 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white shadow-lg shadow-black/20'
            : 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-800 hover:bg-slate-200 dark:bg-slate-800 hover:border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200'
        }`}
        aria-label="Notificações"
      >
        <Bell className="w-5 h-5" />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-slate-900 dark:text-white ring-2 ring-slate-950 animate-pulse">
            {totalUnread}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed sm:absolute left-4 right-4 top-20 sm:left-auto sm:right-0 sm:top-auto sm:mt-3 sm:w-80 md:w-96 bg-slate-100 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-300 dark:border-slate-800/80 rounded-2xl shadow-2xl shadow-black/50 z-50 overflow-hidden transform origin-top-right transition-all duration-200">
          <div className="p-4 border-b border-slate-300 dark:border-slate-800/60 flex items-center justify-between bg-slate-100 dark:bg-slate-900/40">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm tracking-wide">Notificações</h3>
              {totalUnread > 0 && (
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                  {totalUnread} novas
                </span>
              )}
            </div>
            {visibleNotifs.length > 0 && (
              <button
                onClick={handleClear}
                className="text-[11px] font-medium flex items-center gap-1 text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Limpar Lidas
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800/40 custom-scrollbar">
            {visibleNotifs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2">
                <Info className="w-8 h-8 text-slate-600" />
                <p className="text-xs">Nenhuma notificação encontrada</p>
              </div>
            ) : (
              <>
                {visibleNotifs.map((item) => {
                  const isUnread = lastChecked ? item.date > new Date(lastChecked) : true;
                  let formattedTime = '';
                  try {
                    formattedTime = formatDistanceToNow(item.date, { addSuffix: true, locale: ptBR });
                  } catch (e) {
                    formattedTime = 'recentemente';
                  }

                  if (item.type === 'SYS') {
                    const sys = item.data;
                    return (
                      <Link
                        key={`sys-${sys.id}`}
                        to={sys.link || '/sisreg/official'}
                        onClick={() => setIsOpen(false)}
                        className={`block p-4 transition-all duration-200 hover:bg-slate-200 dark:bg-slate-800/60 relative ${
                          isUnread ? 'bg-emerald-500/10' : ''
                        }`}
                      >
                        {isUnread && <span className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                              <Sparkles className="w-3 h-3" />
                              SISREG Oficial
                            </span>
                            <span className="text-[10px] font-medium text-slate-500 shrink-0">{formattedTime}</span>
                          </div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-100">{sys.title}</div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-400">{sys.message}</div>
                        </div>
                      </Link>
                    );
                  } else {
                    const req = item.data;
                    return (
                      <Link
                        key={`req-${req.id}`}
                        to={`/requests/${req.id}`}
                        onClick={() => setIsOpen(false)}
                        className={`block p-4 transition-all duration-200 hover:bg-slate-200 dark:bg-slate-800/40 relative ${
                          isUnread ? 'bg-blue-500/5' : ''
                        }`}
                      >
                        {isUnread && <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500" />}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${getStatusBadgeClass(req.status, req.createdAt, req.updatedAt)}`}>
                              {getStatusText(req.status, req.createdAt, req.updatedAt)}
                            </span>
                            <span className="text-[10px] font-medium text-slate-500 shrink-0">{formattedTime}</span>
                          </div>
                          <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                            Paciente: <span className="font-normal text-slate-350">{req.patient?.name}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                            <span>Protocolo: <span className="font-medium text-slate-350">{formatProtocol(req.code)}</span></span>
                            {req.requestingHealthCenter?.name && (
                              <span className="truncate max-w-[150px] text-[10px] text-slate-500">{req.requestingHealthCenter.name}</span>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  }
                })}
              </>
            )}
          </div>

          <div className="p-3 border-t border-slate-300 dark:border-slate-800/60 text-center bg-slate-50 dark:bg-slate-900/40">
            <Link
              to="/sisreg/official"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-blue-500 dark:text-blue-400 hover:underline transition-colors"
            >
              Ver extrações oficiais do SISREG
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
