import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, Loader2, X } from 'lucide-react';
import { apiUrl } from '../../../services/api';
import { useAuthStore } from '../../../store/useAuthStore';

interface Cid10Result {
  code: string;
  description: string;
}

interface Cid10SelectorInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const Cid10SelectorInput: React.FC<Cid10SelectorInputProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const token = useAuthStore((state) => state.token);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Cid10Result[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (disabled || !searchTerm || searchTerm.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await axios.get(`${apiUrl}/cid10/search?q=${encodeURIComponent(searchTerm.trim())}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setResults(res.data || []);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, token, disabled]);

  if (disabled) {
    return (
      <span className="inline-block px-2.5 py-1 rounded-md font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
        {value}
      </span>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 p-2.5 bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-md">
        <div className="text-xs font-mono font-bold text-slate-900 dark:text-white truncate">
          {value || 'Nenhum CID-10 selecionado'}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar novo CID-10 por código (ex: I10) ou descrição..."
          className="w-full pl-9 pr-9 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
        {isSearching ? (
          <Loader2 className="absolute right-3 top-2.5 w-4 h-4 text-orange-500 animate-spin" />
        ) : searchTerm ? (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setResults([]);
            }}
            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            title="Limpar busca"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}

        {results.length > 0 && (
          <div className="absolute z-40 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md shadow-xl divide-y divide-slate-100 dark:divide-slate-800">
            {results.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => {
                  onChange(`${item.code} - ${item.description}`);
                  setSearchTerm('');
                  setResults([]);
                }}
                className="w-full text-left p-2.5 hover:bg-orange-50 dark:hover:bg-slate-800 flex items-center justify-between gap-2 text-xs cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200 font-mono font-bold shrink-0">
                    {item.code}
                  </span>
                  <span className="text-slate-700 dark:text-slate-200 truncate">{item.description}</span>
                </div>
                <span className="text-[11px] font-semibold text-orange-600 shrink-0">Selecionar</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

