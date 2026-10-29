import React, { useState, useEffect, useRef } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../../store/useAuthStore';
import { Search, X, Loader2, Pill, Building2, Trash2, CheckCircle2 } from 'lucide-react';

export interface MedicationValue {
  name: string;
  dosage: string;
  substance?: string;
  laboratory?: string;
  category?: string;
}

interface MedicationSelectProps {
  value: { name: string; dosage: string };
  onChange: (field: 'name' | 'dosage', val: string) => void;
  onRemove: () => void;
}

export const MedicationSelect: React.FC<MedicationSelectProps> = ({
  value,
  onChange,
  onRemove,
}) => {
  const [searchTerm, setSearchTerm] = useState(value.name || '');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [debouncedModalSearch, setDebouncedModalSearch] = useState('');
  const [onlyActive, setOnlyActive] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const { token } = useAuthStore();
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Sync internal state if external value changes
  useEffect(() => {
    setSearchTerm(value.name || '');
  }, [value.name]);

  // Debounce for inline autocomplete
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Debounce for modal search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedModalSearch(modalSearchTerm);
    }, 350);
    return () => clearTimeout(handler);
  }, [modalSearchTerm]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Inline search query
  const { data: suggestions = [], isFetching: isFetchingInline } = useQuery({
    queryKey: ['medications-autocomplete', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.trim().length < 2) return [];
      const res = await axios.get(
        `${apiUrl}/medications/search?q=${encodeURIComponent(debouncedSearch.trim())}&activeOnly=true&limit=15`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return res.data;
    },
    enabled: isDropdownOpen && debouncedSearch.trim().length >= 2,
    placeholderData: keepPreviousData,
  });

  // Modal search query
  const { data: modalResults = [], isLoading: isLoadingModal } = useQuery({
    queryKey: ['medications-modal-search', debouncedModalSearch, onlyActive],
    queryFn: async () => {
      if (!debouncedModalSearch || debouncedModalSearch.trim().length < 2) return [];
      const res = await axios.get(
        `${apiUrl}/medications/search?q=${encodeURIComponent(debouncedModalSearch.trim())}&activeOnly=${onlyActive}&limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return res.data;
    },
    enabled: isModalOpen && debouncedModalSearch.trim().length >= 2,
    placeholderData: keepPreviousData,
  });

  const handleSelectMedication = (med: any) => {
    // Fill medication name
    onChange('name', med.name);
    setSearchTerm(med.name);
    setIsDropdownOpen(false);
    setIsModalOpen(false);

    // If posology is empty and dosage/presentation is known, suggest it
    if (!value.dosage && med.dosage) {
      onChange('dosage', `${med.dosage} via oral conforme orientação médica`);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 relative" ref={containerRef}>
      {/* Medication Name Search Input */}
      <div className="flex-1 relative">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              onChange('name', e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => {
              if (searchTerm.trim().length >= 2) {
                setIsDropdownOpen(true);
              }
            }}
            placeholder="Nome do medicamento (ex: Dipirona, Novalgina...)"
            className="w-full pl-4 pr-11 py-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 shadow-sm text-sm"
          />

          <button
            type="button"
            onClick={() => {
              setModalSearchTerm(searchTerm);
              setIsModalOpen(true);
            }}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-blue-500 transition-colors"
            title="Pesquisar catálogo da ANVISA"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>

        {/* Inline Autocomplete Dropdown */}
        {isDropdownOpen && searchTerm.trim().length >= 2 && (
          <div className="absolute z-50 left-0 right-0 mt-1 max-h-72 overflow-y-auto bg-white dark:bg-slate-800 rounded-md shadow-2xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/60">
            {isFetchingInline && suggestions.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                Consultando medicamentos da ANVISA...
              </div>
            ) : suggestions.length > 0 ? (
              suggestions.map((med: any) => {
                const substanceDisplay = med.substanceWithDosage || med.substanceDescription;
                return (
                  <button
                    key={med.id}
                    type="button"
                    onClick={() => handleSelectMedication(med)}
                    className="w-full text-left p-3 hover:bg-blue-50 dark:hover:bg-slate-700/60 transition-colors flex flex-col gap-1 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {med.name}
                      </span>
                      {med.category && (
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {med.category}
                        </span>
                      )}
                    </div>

                    {substanceDisplay && (
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                        <Pill className="w-3.5 h-3.5 shrink-0" />
                        <span>{substanceDisplay}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-0.5">
                      {med.laboratory && (
                        <span className="truncate flex items-center gap-1 max-w-[70%]">
                          <Building2 className="w-3 h-3 shrink-0" />
                          {med.laboratory}
                        </span>
                      )}
                      {med.stripe && (
                        <span className="text-slate-400 font-mono text-[10px]">{med.stripe}</span>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-slate-500">
                Nenhum medicamento encontrado no catálogo. Você pode continuar digitando o nome livremente.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dosage / Posology Input */}
      <input
        type="text"
        value={value.dosage}
        onChange={e => onChange('dosage', e.target.value)}
        placeholder="Posologia (ex: 1 comprimido de 8/8h por 5 dias)"
        className="flex-[1.5] px-4 py-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 shadow-sm text-sm"
      />

      {/* Remove Button */}
      <button
        type="button"
        onClick={onRemove}
        className="p-3 text-red-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors shadow-sm self-start sm:self-auto cursor-pointer"
        title="Remover medicamento"
      >
        <Trash2 className="w-5 h-5" />
      </button>

      {/* Advanced ANVISA Search Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-3xl rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-200 dark:border-slate-700">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/90">
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-500" /> Pesquisar Medicamentos na ANVISA
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Search Bar and Filter */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col gap-3 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="relative">
                <input
                  type="text"
                  value={modalSearchTerm}
                  onChange={e => setModalSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 shadow-inner"
                  placeholder="Pesquise por nome comercial ou princípio ativo (ex: Dipirona 500mg, Amoxicilina, Novalgina)..."
                  autoFocus
                />
                {modalSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setModalSearchTerm('')}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={onlyActive}
                    onChange={e => setOnlyActive(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Exibir apenas medicamentos ativos</span>
                </label>
                <span>Total de {modalResults.length} resultados exibidos</span>
              </div>
            </div>

            {/* Modal Results List */}
            <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-100 dark:divide-slate-700/50">
              {isLoadingModal ? (
                <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  <span>Consultando medicamentos...</span>
                </div>
              ) : modalResults.length > 0 ? (
                modalResults.map((med: any) => {
                  const substanceDisplay = med.substanceWithDosage || med.substanceDescription;
                  return (
                    <button
                      key={med.id}
                      type="button"
                      onClick={() => handleSelectMedication(med)}
                      className="w-full text-left p-3.5 hover:bg-blue-50 dark:hover:bg-slate-700/50 rounded-md transition-colors flex flex-col gap-1 cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {med.name}
                        </span>
                        <div className="flex items-center gap-2">
                          {med.category && (
                            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                              {med.category}
                            </span>
                          )}
                          {med.isActive ? (
                            <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                              <CheckCircle2 className="w-3 h-3" /> Ativo
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                              Inativo
                            </span>
                          )}
                        </div>
                      </div>

                      {substanceDisplay && (
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5 mt-0.5">
                          <Pill className="w-3.5 h-3.5 shrink-0" />
                          <span>{substanceDisplay}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-[11px] text-slate-400 mt-1">
                        {med.laboratory && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3 shrink-0" />
                            {med.laboratory}
                          </span>
                        )}
                        {med.complement && (
                          <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                            {med.complement}
                          </span>
                        )}
                        {med.stripe && (
                          <span className="font-mono text-[10px] text-slate-400">
                            Tarja: {med.stripe}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              ) : debouncedModalSearch.trim().length >= 2 ? (
                <div className="p-12 text-center text-slate-400">
                  Nenhum medicamento encontrado para "{debouncedModalSearch}".
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400 text-sm">
                  Digite pelo menos 2 caracteres para pesquisar na base da ANVISA.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
