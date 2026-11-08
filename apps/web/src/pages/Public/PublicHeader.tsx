import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const PublicHeader = () => {
  const location = useLocation();

  const navLinks = [
    { name: 'Sobre o Sistema', path: '/about' },
    { name: 'Termos de Uso', path: '/terms' },
    { name: 'Políticas de Privacidade', path: '/privacy' },
  ];

  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Identidade Visual */}
        <Link to="/" className="flex items-center gap-3 group">
          <img
            src="/brasao.png"
            alt="Brasão Municipal"
            className="h-8 w-8 object-contain transition-transform group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className="text-left">
            <span className="font-extrabold text-slate-900 dark:text-white text-base leading-tight tracking-tight block">
              SINPeP
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block -mt-0.5 font-medium">
              Regulação Municipal & Prontuário Eletrônico
            </span>
          </div>
        </Link>

        {/* Links de navegação central em telas médias/grandes */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100/70 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-[#0051A2] dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Controles de Direita: Botão de Login */}
        <div className="flex items-center gap-2.5">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Acessar Sistema</span>
            <span className="sm:hidden">Entrar</span>
          </Link>
        </div>
      </div>
    </header>
  );
};
