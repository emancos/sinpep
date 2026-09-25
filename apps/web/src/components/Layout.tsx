import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import {
  Home,
  LogOut,
  Users as UsersIcon,
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Building,
  Users,
  Stethoscope,
  FileText
} from 'lucide-react';
import { useState } from 'react';
import { Breadcrumb } from './Breadcrumb';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';
import { CachedAvatar } from './CachedAvatar';

export const Layout = () => {
  const { user, permissions, logout } = useAuthStore();
  const { t } = useTranslation();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleMenu = (path: string) => {
    setExpandedMenus(prev => ({ ...prev, [path]: !prev[path] }));
  };

  const isAdmin = permissions.includes('admin:access');

  interface MenuItem {
    name: string;
    path: string;
    icon: any;
    subItems?: { name: string; path: string }[];
  }

  const menuItems: MenuItem[] = [
    { name: t('Dashboard'), path: '/', icon: Home },
    ...(permissions.includes('health-centers:read') || isAdmin ? [
      { name: 'Unidades de Saúde', path: '/health-centers', icon: Building },
    ] : []),
    ...(permissions.includes('doctors:read') || isAdmin ? [
      { name: 'Médicos', path: '/doctors', icon: Stethoscope },
    ] : []),
    ...(permissions.includes('specialties:read') || isAdmin ? [
      { name: 'Especialidades', path: '/specialties', icon: FileText }, // Placeholder icon for specialties
    ] : []),
    ...(permissions.includes('patients:read') || isAdmin ? [
      { name: 'Pacientes', path: '/patients', icon: Users },
    ] : []),
    ...(isAdmin ? [
      { name: 'Gestão de Utilizadores', path: '/users', icon: UsersIcon },
    ] : []),
  ];

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
                    className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-between px-3 lg:px-4'} py-2 lg:py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group ${isActive
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
                            className={`px-3 py-2 rounded-lg text-sm transition-colors ${isSubActive
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
                className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3 lg:px-4'} py-2 lg:py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group ${isActive
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
          <span>v1.0.0 &copy; {new Date().getFullYear()}</span>
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
        <nav className="px-2 py-3 lg:px-4 lg:py-6 space-y-0.5 lg:space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 lg:gap-3 px-3 py-2 lg:px-4 lg:py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
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
        <header className="z-30 shrink-0 h-12 lg:h-14 bg-[#0051A2]/95 dark:bg-[#003B77]/95 backdrop-blur-md border-b border-[#003B77] dark:border-[#002244] flex items-center justify-between px-4 lg:px-6">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden text-blue-200 hover:text-white transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Spacer on Desktop, Brand on mobile */}
          <div className="md:hidden flex items-center gap-2 text-white font-bold">
            <img src="/logo.svg" alt="Logo" className="w-7 h-7 shrink-0 drop-shadow-md" />
            <span className="truncate">{import.meta.env.VITE_APP_NAME || "Base"}</span>
          </div>

          <div className="hidden md:block">
            <Breadcrumb />
          </div>

          {/* User profile dropdown and Logout */}
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <NotificationBell />

            <div className="flex items-stretch shadow-md rounded-xl overflow-hidden border border-slate-300 dark:border-slate-800">
              <Link to="/profile" className="flex items-center gap-2 px-2.5 py-1 bg-slate-100 dark:bg-slate-900/80 text-[13px] hover:bg-slate-200 dark:bg-slate-800 transition-all duration-300 cursor-pointer">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 border border-slate-200 dark:border-slate-800/80 flex items-center justify-center overflow-hidden shrink-0">
                  <CachedAvatar src={user?.avatar} alt={user?.name} />
                </div>
                <span className="text-slate-600 dark:text-slate-300 font-medium max-w-[120px] truncate">{user?.name}</span>
              </Link>

              <div className="w-px bg-slate-300 dark:bg-slate-700" />

              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 dark:bg-red-900 hover:bg-red-100 dark:hover:bg-red-800 text-red-600 dark:text-red-300 text-[13px] transition-all duration-300 cursor-pointer"
                title={t('Logout')}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-medium">{t('Logout')}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-3 lg:p-6 relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

