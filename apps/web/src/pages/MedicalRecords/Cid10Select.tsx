import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../../store/useAuthStore';

interface Cid10SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export const Cid10Select: React.FC<Cid10SelectProps> = ({ label, value, onChange, required = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { token } = useAuthStore();
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const { data: results, isLoading } = useQuery({
    queryKey: ['cid10-search', searchTerm],
    queryFn: async () => {
      const res = await axios.get(`${apiUrl}/cid10/search?q=${searchTerm}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    },
    enabled: isOpen,
  });

  return (
    <div className="bg-slate-100 dark:bg-slate-900/60 p-4 rounded-md border border-slate-200 dark:border-slate-800 shadow-md">
      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={e => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
            if (e.target.value === '') onChange('');
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          placeholder="Buscar CID-10..."
        />
        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {isLoading ? (
                <div className="p-3 text-sm text-slate-500 text-center">Buscando...</div>
              ) : results?.length > 0 ? (
                results.map((item: any) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onChange(item.code);
                      setSearchTerm(`${item.code} - ${item.description}`);
                      setIsOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <strong>{item.code}</strong> - {item.description}
                  </button>
                ))
              ) : (
                <div className="p-3 text-sm text-slate-500 text-center">Nenhum resultado encontrado.</div>
              )}
            </div>
          </>
        )}
        {value && <div className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">CID Selecionado: {value}</div>}
      </div>
    </div>
  );
};
