import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
 const { theme, setTheme } = useTheme();

 return (
 <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors">
 <button
 onClick={() => setTheme('light')}
 className={`p-1.5 rounded-md transition-all ${
 theme === 'light'
 ? 'bg-white dark:bg-slate-700 text-sky-500 shadow-md'
 : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-600 dark:text-slate-300'
 }`}
 title="Modo Claro"
 >
 <Sun className="w-4 h-4" />
 </button>
 
 <button
 onClick={() => setTheme('system')}
 className={`p-1.5 rounded-md transition-all ${
 theme === 'system'
 ? 'bg-white dark:bg-slate-700 text-sky-500 shadow-md'
 : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-600 dark:text-slate-300'
 }`}
 title="Seguir Sistema"
 >
 <Monitor className="w-4 h-4" />
 </button>

 <button
 onClick={() => setTheme('dark')}
 className={`p-1.5 rounded-md transition-all ${
 theme === 'dark'
 ? 'bg-white dark:bg-slate-700 text-sky-500 shadow-md'
 : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-600 dark:text-slate-300'
 }`}
 title="Modo Escuro"
 >
 <Moon className="w-4 h-4" />
 </button>
 </div>
 );
};
