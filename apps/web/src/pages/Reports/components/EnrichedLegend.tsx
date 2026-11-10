import React from 'react';

export interface LegendItem {
  color: string;
  label: string;
  count: number;
  percentage?: number;
  sublabel?: string;
}

interface EnrichedLegendProps {
  items: LegendItem[];
  total?: number;
  className?: string;
  columns?: 1 | 2 | 3 | 4;
}

export const EnrichedLegend: React.FC<EnrichedLegendProps> = ({
  items,
  total,
  className = '',
  columns = 2,
}) => {
  const calculatedTotal = total ?? items.reduce((acc, it) => acc + (Number(it.count) || 0), 0);

  const gridColsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
  }[columns];

  return (
    <div className={`grid ${gridColsClass} gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 ${className}`}>
      {items.map((item, idx) => {
        const count = Number(item.count) || 0;
        const pct = item.percentage !== undefined
          ? item.percentage.toFixed(1)
          : calculatedTotal > 0
            ? ((count / calculatedTotal) * 100).toFixed(1)
            : '0.0';

        return (
          <div
            key={idx}
            className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-3 h-3 rounded-md shrink-0 shadow-xs"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                {item.label}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
              <strong className="font-bold text-slate-900 dark:text-white whitespace-nowrap">
                {count}
              </strong>
              <span className="text-2xs font-semibold px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-600 whitespace-nowrap shrink-0">
                {pct}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

