import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import {
  Home,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Users,
  User,
  Settings,
  CalendarCheck,
  Stethoscope,
  Building2,
  Send,
  Layers,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { useState } from 'react';
import { Breadcrumb } from './Breadcrumb';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';
import { CachedAvatar } from './CachedAvatar';
import { useCurrentDoctor } from '../hooks/useDoctors';
import { SwitchProfileModal } from './SwitchProfileModal';

export const Layout = () => {
  const { user, permissions, activeProfile, availableProfiles, logout } = useAuthStore();
  const { t } = useTranslation();
  const location = useLocation();
  const isAdmin = permissions.includes('admin:access');
  const { data: currentDoctor } = useCurrentDoctor();
  const isDoctor = !isAdmin && Boolean(currentDoctor?.id);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSwitchProfileOpen, setIsSwitchProfileOpen] = useState(false);

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    setUserMenuOpen(false);
    sessionStorage.removeItem('redirect_after_login');
    sessionStorage.setItem('explicit_logout', 'true');
    queryClient.clear();
    logout();
    navigate('/login', { replace: true });
  };

  const toggleMenu = (path: string) => {
    setExpandedMenus(prev => ({ ...prev, [path]: !prev[path] }));
  };

  interface MenuItem {
    name: string;
    path: string;
    icon: any;
    subItems?: { name: string; path: string }[];
  }

  const menuItems: MenuItem[] = [
    { name: t('Dashboard'), path: '/', icon: Home },
    ...((permissions.includes('rooms:read') || isAdmin) && !isDoctor ? [
      { name: 'Agenda & Recepção', path: '/reception', icon: CalendarCheck },
    ] : []),
    ...((permissions.includes('regulation-solicitor:read') || isAdmin) ? [
      { name: 'Solicitação', path: '/regulation/solicitor', icon: Send },
    ] : []),
    ...((permissions.includes('regulation-operator:read') || isAdmin) ? [
      {
        name: 'Central de Regulação',
        path: '/regulation',
        icon: Layers,
        subItems: [
          { name: 'Triagem & Avaliação', path: '/regulation/inbox' },
          { name: 'Fila de Espera (Auto)', path: '/regulation/waiting-list' },
          { name: 'Regras de Agendamento', path: '/regulation/auto-scheduling/rules' },
          { name: 'Importação e-SUS', path: '/regulation/esus-import' },
        ],
      },
    ] : []),
    ...((permissions.includes('schedules:read') || isAdmin) ? [
      { name: 'Agendas & Escalas', path: '/schedules', icon: Calendar },
    ] : []),
    ...((permissions.includes('rooms:read') || isAdmin) && !isDoctor ? [
      { name: 'Ambulatórios', path: '/rooms', icon: Building2 },
    ] : []),
    ...(permissions.includes('patients:read') || isAdmin ? [
      { name: 'Pacientes', path: '/patients', icon: Users },
    ] : []),

    ...(permissions.includes('procedures:read') && isDoctor ? [
      { name: 'Procedimentos', path: '/procedures', icon: Stethoscope },
    ] : []),
  ];

  const adminSubItems = [
    ...(permissions.includes('health-centers:write') || isAdmin ? [
      { name: 'Unidades de Saúde', path: '/health-centers' }
    ] : []),
    ...(permissions.includes('doctors:write') || isAdmin ? [
      { name: 'Médicos', path: '/doctors' }
    ] : []),
    ...(isAdmin ? [
      { name: 'Ambulatórios & Salas', path: '/rooms' }
    ] : []),
    ...(permissions.includes('procedure-groups:write') || isAdmin ? [
      { name: 'Especialidades Médicas', path: '/specialties' }
    ] : []),
    ...(isAdmin ? [
      { name: 'Procedimentos', path: '/procedures' }
    ] : []),
    ...(isAdmin ? [
      { name: 'Medicamentos', path: '/medications' }
    ] : []),
    ...(isAdmin ? [
      { name: 'Gestão de Utilizadores', path: '/users' },
    ] : []),
    ...(isAdmin ? [
      { name: 'Municípios & Identidade', path: '/municipalities' },
    ] : []),
    ...(permissions.includes('reports:read') || isAdmin ? [
      { name: 'Relatórios & BI', path: '/reports' }
    ] : []),
  ];

  if (adminSubItems.length > 0) {
    menuItems.push({
      name: 'Administração',
      path: '/admin',
      icon: Settings,
      subItems: adminSubItems
    });
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex font-sans relative overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className={`hidden md:flex flex-col ${isCollapsed ? 'w-20' : 'w-64'} bg-[#003B77]/95 dark:bg-[#002244]/95 backdrop-blur-xl border-r border-white/10 dark:border-[#001122] z-40 shrink-0 transition-all duration-300 relative`}>
        {/* Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3.5 top-[15px] w-7 h-7 bg-white dark:bg-[#003B77] rounded-full flex items-center justify-center border border-slate-200 dark:border-[#0051A2] cursor-pointer text-[#003B77] dark:text-blue-200 hover:text-[#0051A2] dark:hover:text-white hover:scale-110 z-50 shadow-md transition-all"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <div className={`h-12 lg:h-14 flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4 lg:px-6'} border-b border-white/10 dark:border-[#001122]/50 transition-all duration-300`}>
          <img src="/logo.svg" alt="Logo" className="w-10 h-10 shrink-0 drop-shadow-md" />
          {!isCollapsed && <span className="font-bold text-lg text-white tracking-wide truncate">{import.meta.env.VITE_APP_NAME}</span>}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-2 py-3 lg:px-3 lg:py-5 space-y-0.5 lg:space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path || (item.subItems && item.subItems.some((sub: any) => location.pathname === sub.path));
            const isExpanded = expandedMenus[item.path] || isActive;
            const Icon = item.icon;

            if (item.subItems && item.subItems.length > 0) {
              return (
                <div key={item.path} className="flex flex-col">
                  <button
                    onClick={() => !isCollapsed && toggleMenu(item.path)}
                    title={isCollapsed ? item.name : undefined}
                    className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-between px-3 lg:px-4'} py-2 lg:py-2.5 rounded-md text-sm font-medium transition-all duration-300 group ${isActive
                      ? 'bg-white/15 border-l-2 border-white text-white shadow-md'
                      : 'text-blue-200 hover:text-white hover:bg-white/10 border-l-2 border-transparent'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-white' : 'text-blue-300 group-hover:text-white'} shrink-0`} />
                      {!isCollapsed && <span>{item.name}</span>}
                    </div>
                    {!isCollapsed && (isExpanded ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />)}
                  </button>
                  {isExpanded && !isCollapsed && (
                    <div className="mt-1 flex flex-col space-y-1 pl-11 pr-2">
                      {item.subItems.map((sub: any) => {
                        const isSubActive = location.pathname === sub.path;
                        return (
                          <Link
                            key={sub.path}
                            to={sub.path}
                            className={`px-3 py-2 rounded-md text-sm transition-colors ${isSubActive
                              ? 'text-white bg-blue-500/10 font-medium'
                              : 'text-blue-200 hover:text-white hover:bg-white/10'
                              }`}
                          >
                            {sub.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                title={isCollapsed ? item.name : undefined}
                className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3 lg:px-4'} py-2 lg:py-2.5 rounded-md text-sm font-medium transition-all duration-300 group ${isActive
                  ? 'bg-white/15 border-l-2 border-white text-white shadow-md'
                  : 'text-blue-200 hover:text-white hover:bg-white/10 border-l-2 border-transparent'
                  }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-white' : 'text-blue-300 group-hover:text-white'} shrink-0`} />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer info in sidebar */}
        <div className={`p-4 border-t border-white/10 dark:border-[#002244]/50 text-xs flex flex-col gap-1 text-blue-200/70 text-center transition-all duration-300 ${isCollapsed ? 'hidden' : 'flex'}`}>
          <span>v1.3.0 &copy; {new Date().getFullYear()}</span>
        </div>
      </aside>

      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Mobile Drawer */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-[#003B77] border-r border-white/10 dark:border-[#002244] z-40 transform transition-transform duration-300 md:hidden ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-12 lg:h-14 flex items-center justify-between px-4 lg:px-6 border-b border-white/10 dark:border-[#002244]/50">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Logo" className="w-8 h-8 shrink-0 drop-shadow-md" />
            <span className="font-bold text-lg text-white truncate">{import.meta.env.VITE_APP_NAME}</span>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="text-blue-200 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Active Profile Bar */}
        {activeProfile && (
          <div className="px-4 py-2.5 bg-black/20 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="w-4 h-4 text-blue-300 shrink-0" />
              <div className="text-left min-w-0">
                <span className="text-[10px] uppercase text-blue-200/70 block leading-tight">Perfil Ativo</span>
                <span className="text-xs font-bold text-white block truncate">{activeProfile.name}</span>
              </div>
            </div>
            {availableProfiles.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsSwitchProfileOpen(true);
                }}
                className="text-[11px] px-2 py-1 rounded bg-white/15 text-white hover:bg-white/25 transition-colors font-medium shrink-0"
              >
                Alternar
              </button>
            )}
          </div>
        )}

        <nav className="px-2 py-3 lg:px-4 lg:py-6 space-y-0.5 lg:space-y-1">
          {menuItems.filter(item => !['/', '/patients'].includes(item.path)).map((item) => {
            const isActive = location.pathname === item.path || (item.subItems && item.subItems.some((sub: any) => location.pathname === sub.path));
            const Icon = item.icon;

            if (item.subItems && item.subItems.length > 0) {
              return (
                <div key={item.path} className="flex flex-col space-y-1 pt-1">
                  <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-blue-300/80">
                    <Icon className="w-4 h-4 text-blue-300" />
                    <span>{item.name}</span>
                  </div>
                  <div className="pl-4 flex flex-col space-y-1">
                    {item.subItems.map((sub: any) => {
                      const isSubActive = location.pathname === sub.path;
                      return (
                        <Link
                          key={sub.path}
                          to={sub.path}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${isSubActive
                            ? 'bg-white/15 text-white font-bold'
                            : 'text-blue-200 hover:text-white hover:bg-white/10'
                            }`}
                        >
                          {sub.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 lg:gap-3 px-3 py-2 lg:px-4 lg:py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${isActive
                  ? 'bg-white/15 border-l-2 border-white text-white'
                  : 'text-blue-200 hover:text-white hover:bg-white/10'
                  }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-blue-200'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        {/* Sticky Header */}
        <header className="z-30 shrink-0 h-12 lg:h-14 bg-[#003B77] dark:bg-[#002244] border-b border-white/10 dark:border-[#001122] flex items-center justify-between px-3 sm:px-4 lg:px-6">
          {/* Spacer on Desktop, Brand on mobile */}
          <div className="md:hidden flex items-center gap-2 text-white font-bold">
            <img src="/logo.svg" alt="Logo" className="w-7 h-7 shrink-0 drop-shadow-md" />
            <span className="truncate">{import.meta.env.VITE_APP_NAME || "Base"}</span>
          </div>

          <div className="hidden md:block">
            <Breadcrumb />
          </div>

          {/* User profile dropdown and Logout - exactly matching mockup image */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <ThemeToggle />
            <NotificationBell />

            {/* Profile Button with Dropdown Menu */}
            <div className="relative">
              {/* Desktop Profile Button */}
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="hidden md:flex h-9 px-3 items-center gap-2.5 rounded-lg border border-white/20 hover:border-white/30 bg-white/10 hover:bg-white/15 text-white transition-all duration-200 cursor-pointer shadow-sm group"
                title={activeProfile ? `Perfil Ativo: ${activeProfile.name}` : "Meu Perfil"}
              >
                <div className="w-6 h-6 rounded-full border border-white/40 overflow-hidden shrink-0 flex items-center justify-center bg-blue-400/20">
                  <CachedAvatar src={user?.avatar} alt={user?.name} />
                </div>
                <span className="text-white font-bold text-sm max-w-[150px] truncate">{user?.name}</span>
              </button>

              {/* Mobile Profile Avatar Button */}
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg border border-white/20 hover:border-white/30 bg-white/10 hover:bg-white/15 text-white transition-all cursor-pointer shadow-sm overflow-hidden"
                title="Meu Perfil"
              >
                <div className="w-6 h-6 rounded-full border border-white/40 overflow-hidden shrink-0 flex items-center justify-center bg-blue-400/20">
                  <CachedAvatar src={user?.avatar} alt={user?.name} />
                </div>
              </button>

              {/* Profile Dropdown Menu */}
              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden flex flex-col py-1">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{user?.name}</p>
                      {activeProfile && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium truncate">
                            {activeProfile.name}
                          </p>
                        </div>
                      )}
                    </div>

                    {availableProfiles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          setIsSwitchProfileOpen(true);
                        }}
                        className="px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition-colors text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <ShieldCheck className="w-4 h-4 text-blue-500" />
                          <span>Alternar Perfil</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold">
                          {availableProfiles.length}
                        </span>
                      </button>
                    )}

                    <Link
                      to="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      <span>Meu Perfil</span>
                    </Link>

                    <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2.5 text-left transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{t('Logout')}</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Logout Button (Sair) - exact match to mockup image */}
            <button
              type="button"
              onClick={handleLogout}
              className="h-9 px-3.5 flex items-center gap-1.5 rounded-lg bg-[#E52222] hover:bg-[#CC1E1E] text-white font-bold text-sm shadow-sm transition-all duration-200 cursor-pointer active:scale-95 shrink-0"
              title={t('Logout')}
            >
              <LogOut className="w-4 h-4" />
              <span>{t('Logout')}</span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-3 lg:p-6 pb-20 md:pb-6 relative">
          <Outlet />
        </main>

        {/* Switch Profile Modal */}
        <SwitchProfileModal
          isOpen={isSwitchProfileOpen}
          onClose={() => setIsSwitchProfileOpen(false)}
        />

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-30 flex items-center justify-around px-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pb-safe">
          <Link to="/" className={`flex flex-col items-center justify-center w-full h-full gap-1 ${location.pathname === '/' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Início</span>
          </Link>
          {(permissions.includes('patients:read') || isAdmin) && (
            <Link to="/patients" className={`flex flex-col items-center justify-center w-full h-full gap-1 ${location.pathname.startsWith('/patients') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <Users className="w-5 h-5" />
              <span className="text-[10px] font-semibold">Pacientes</span>
            </Link>
          )}


          <button onClick={() => setMobileMenuOpen(true)} className="flex flex-col items-center justify-center w-full h-full gap-1 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <Menu className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};

