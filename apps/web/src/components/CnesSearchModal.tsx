import React, { useState } from 'react';
import { Search, Loader2, X, Building2 } from 'lucide-react';
import { getEstabelecimentos } from '../services/cnes';
import type { Estabelecimento } from '../services/cnes';
import { toast } from 'sonner';

interface CnesSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (estabelecimento: Estabelecimento) => void;
}

export const CnesSearchModal: React.FC<CnesSearchModalProps> = ({ isOpen, onClose, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Estabelecimento[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  if (!isOpen) return null;

  const fetchResults = async (pageToFetch: number, append: boolean = false) => {
    setIsLoading(true);
    try {
      const isCnes = /^\d+$/.test(searchTerm);
      const res = await getEstabelecimentos({
        nome: !isCnes ? searchTerm : undefined,
        cnes: isCnes ? searchTerm : undefined,
        page: pageToFetch,
        limit: 10,
      });
      
      if (append) {
        setResults((prev) => [...prev, ...(res.data || [])]);
      } else {
        setResults(res.data || []);
      }
      
      setCurrentPage(res.page || 1);
      setTotalPages(res.pages || 1);
      
      if ((res.data || []).length === 0 && !append) {
        toast.error('Nenhum estabelecimento encontrado.');
      }
    } catch (error) {
      toast.error('Erro ao buscar estabelecimentos no CNES.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm || searchTerm.length < 3) {
      toast.error('Digite pelo menos 3 caracteres para buscar.');
      return;
    }
    await fetchResults(1);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-md w-full max-w-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-md">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Buscar Estabelecimento (CNES)</h2>
              <p className="text-xs sm:text-sm text-slate-500">Pesquise por nome ou número do CNES.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4 sm:space-y-6">
          <form onSubmit={handleSearch} className="flex gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Ex: POLICLINICA ou 1234567..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2 sm:py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md text-xs sm:text-sm transition-all shadow-lg shadow-blue-500/30 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Search className="w-4 h-4 sm:w-5 sm:h-5" />}
              <span className="hidden sm:inline">Buscar</span>
            </button>
          </form>

          {results.length > 0 && (
            <div className="space-y-2 sm:space-y-3">
              <h3 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">Resultados da Busca</h3>
              <div className="space-y-2 sm:space-y-3">
                {results.map((est) => (
                  <div
                    key={est.coCnes}
                    onClick={() => {
                      onSelect(est);
                      onClose();
                    }}
                    className="p-3 sm:p-4 border border-slate-200 dark:border-slate-800 rounded-md hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer transition-all flex justify-between items-center group"
                  >
                    <div>
                      <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {est.noFantasia || est.noRazaoSocial}
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1">
                        CNES: <span className="font-semibold text-slate-700 dark:text-slate-300">{est.coCnes}</span> • {est.noMunicipio} - {est.sgUf}
                      </p>
                    </div>
                    <div className="px-2 py-1 sm:px-3 sm:py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] sm:text-xs font-bold rounded-md opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      Selecionar
                    </div>
                  </div>
                ))}
              </div>

              {currentPage < totalPages && (
                <button
                  type="button"
                  onClick={() => fetchResults(currentPage + 1, true)}
                  disabled={isLoading}
                  className="w-full mt-2 sm:mt-4 py-2 sm:py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-md text-xs sm:text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : null}
                  Carregar mais resultados
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
