import React, { useState } from 'react';
import { BarChart3, Table as TableIcon, Info } from 'lucide-react';

interface DescriptiveChartCardProps {
  title: string;
  description?: string;
  badge?: string;
  icon?: React.ComponentType<{ className?: string }>;
  note?: string;
  children: React.ReactNode;
  tableData?: React.ReactNode;
  className?: string;
}

export const DescriptiveChartCard: React.FC<DescriptiveChartCardProps> = ({
  title,
  description,
  badge,
  icon: Icon,
  note,
  children,
  tableData,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 ${className}`}>
      {/* Cabeçalho do Card */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-[#0051A2] dark:text-blue-400 shrink-0" />}
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {title}
            </h3>
            {badge && (
              <span className="text-3xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Alternador Gráfico / Tabela (se tabela fornecida) */}
        {tableData && (
          <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 self-start">
            <button
              type="button"
              onClick={() => setViewMode('chart')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-2xs font-semibold rounded-md transition-all cursor-pointer ${
                viewMode === 'chart'
                  ? 'bg-white dark:bg-slate-700 text-[#0051A2] dark:text-blue-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Exibir como gráfico"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Gráfico</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-2xs font-semibold rounded-md transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-[#0051A2] dark:text-blue-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Exibir números e tabela de dados"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tabela</span>
            </button>
          </div>
        )}
      </div>

      {/* Área Principal de Conteúdo */}
      <div className="w-full">
        {viewMode === 'chart' || !tableData ? children : tableData}
      </div>

      {/* Nota Metodológica / Insight no Rodapé do Card */}
      {note && (
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-start gap-1.5 text-2xs text-slate-500 dark:text-slate-400">
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
          <span>{note}</span>
        </div>
      )}
    </div>
  );
};
