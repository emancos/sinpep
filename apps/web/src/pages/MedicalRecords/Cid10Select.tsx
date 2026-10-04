import React, { useState, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../../store/useAuthStore';
import { Search, X, Check, Loader2 } from 'lucide-react';

interface Cid10SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export const Cid10Select: React.FC<Cid10SelectProps> = ({ label, value, onChange, required = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [debouncedModalSearchTerm, setDebouncedModalSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { token } = useAuthStore();
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedModalSearchTerm(modalSearchTerm), 400);
    return () => clearTimeout(handler);
  }, [modalSearchTerm]);

  // For exact match autocomplete
  useEffect(() => {
    if (searchTerm.length >= 3) {
      const timeoutId = setTimeout(async () => {
        try {
          const res = await axios.get(`${apiUrl}/cid10/search?q=${searchTerm}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const exactMatch = res.data.find((item: any) => 
            item.code.replace('.', '').toLowerCase() === searchTerm.replace('.', '').toLowerCase()
          );
          if (exactMatch && value !== exactMatch.code) {
            onChange(exactMatch.code);
            setSearchTerm(`${exactMatch.code} - ${exactMatch.description}`);
          }
        } catch (err) {
          console.error(err);
        }
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm, value, onChange, apiUrl, token]);

  // For modal search
  const { data: results, isLoading, isFetching } = useQuery({
    queryKey: ['cid10-search-modal', debouncedModalSearchTerm],
    queryFn: async () => {
      const res = await axios.get(`${apiUrl}/cid10/search?q=${debouncedModalSearchTerm}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    },
    enabled: isModalOpen,
    placeholderData: keepPreviousData,
  });

  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={e => {
            setSearchTerm(e.target.value);
            if (e.target.value === '') onChange('');
          }}
          className="w-full pl-3 pr-10 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          placeholder="Digite o código exato ou busque na lupa..."
        />
        <button
          type="button"
          onClick={() => {
            setModalSearchTerm(searchTerm);
            setIsModalOpen(true);
          }}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-blue-500 transition-colors"
        >
          <Search className="w-5 h-5" />
        </button>
      </div>
      
      {value && <div className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium flex items-center gap-1"><Check className="w-3 h-3" /> Selecionado: {value}</div>}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-500" /> Pesquisar CID-10
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <input
                type="text"
                value={modalSearchTerm}
                onChange={e => setModalSearchTerm(e.target.value)}
                className="w-full px-4 py-3 text-base rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="Pesquise por código ou descrição (ex: M511 ou Lombalgia)..."
                autoFocus
              />
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 relative">
              {isLoading ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">Buscando...</div>
              ) : (
                <>
                  {isFetching && (
                    <div className="absolute top-2 right-4 text-xs font-semibold text-blue-500 flex items-center gap-1 animate-pulse z-10 bg-blue-50 dark:bg-blue-900/50 px-2 py-1 rounded-full">
                      <Loader2 className="w-3 h-3 animate-spin" /> Atualizando...
                    </div>
                  )}
                  {results?.length > 0 ? (
                    <div className="space-y-1 mt-1">
                      {results.map((item: any) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            onChange(item.code);
                            setSearchTerm(`${item.code} - ${item.description}`);
                            setIsModalOpen(false);
                          }}
                          className="w-full text-left p-3 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-300 transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                        >
                          <div className="font-bold text-blue-700 dark:text-blue-400">{item.code}</div>
                          <div className="text-sm mt-1">{item.description}</div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-500 dark:text-slate-400">Nenhum CID encontrado para "{modalSearchTerm}".</div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
