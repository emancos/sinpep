import { Link } from 'react-router-dom';
import { APP_VERSION } from '../../config/version';

export const PublicFooter = () => {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 py-8 px-4 mt-auto transition-colors">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <img
            src="/logo.png"
            alt="Logo Integra Sistemas"
            className="w-5 h-5 object-contain"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <span>SINPeP • Desenvolvido por Integra Sistemas</span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span className="font-mono text-2xs font-semibold text-slate-400">v{APP_VERSION}</span>
        </div>

        <div className="flex items-center gap-4 text-2xs font-medium">
          <Link to="/about" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Sobre o Sistema
          </Link>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <Link to="/terms" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Termos de Uso
          </Link>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <Link to="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Políticas de Privacidade
          </Link>
        </div>
      </div>
    </footer>
  );
};
