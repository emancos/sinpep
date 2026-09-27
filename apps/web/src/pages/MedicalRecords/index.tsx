import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatients } from '../../hooks/usePatients';
import { Search, Loader2, UserCheck, Calendar, Activity, ChevronRight } from 'lucide-react';
import { TablePagination } from '../../components/TablePagination';

export const MedicalRecords: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const { data, isLoading, isError } = usePatients({
    page,
    limit,
    sortBy: 'name',
    sortOrder: 'asc',
    search: debouncedSearch,
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Activity className="w-8 h-8 text-blue-600" />
          Prontuário Eletrônico
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Busque um paciente para visualizar seu histórico clínico completo, prescrições e exames.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, CPF ou CNS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-red-500">Erro ao carregar lista de pacientes.</div>
        ) : (
          <div>
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {data?.data.map((patient: any) => (
                <div 
                  key={patient.id} 
                  onClick={() => navigate(`/medical-records/${patient.id}`)}
                  className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg">
                      {patient.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {patient.name}
                      </h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1"><UserCheck className="w-4 h-4" /> CPF: {patient.cpf}</span>
                        {patient.birthDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" /> 
                            {new Date(patient.birthDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <button className="text-blue-600 font-medium px-4 py-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1">
                      Acessar Prontuário <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              
              {data?.data.length === 0 && (
                <div className="p-8 text-center text-slate-500 italic">Nenhum paciente encontrado.</div>
              )}
            </div>
            
            <TablePagination
              page={page}
              limit={limit}
              total={data?.total || 0}
              onPageChange={setPage}
              onLimitChange={(newLimit) => {
                setLimit(newLimit);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
