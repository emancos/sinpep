import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TablePaginationProps {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
    onLimitChange: (limit: number) => void;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
    page,
    limit,
    total,
    onPageChange,
    onLimitChange,
}) => {
    const totalPages = Math.ceil(total / limit) || 1;
    const startItem = (page - 1) * limit + 1;
    const endItem = Math.min(page * limit, total);

    // Generate page numbers to display
    const getPages = () => {
        const pages: (number | string)[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (page <= 4) {
                for (let i = 1; i <= 5; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (page >= totalPages - 3) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = page - 1; i <= page + 1; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            }
        }
        return pages;
    };

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-300 dark:border-slate-800/80">
            {/* Information Range */}
            <div className="text-xs text-slate-500 dark:text-slate-400">
                Mostrando <span className="font-semibold text-slate-700 dark:text-slate-200">{total > 0 ? startItem : 0}</span> a{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">{endItem}</span> de{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">{total}</span> registros
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-4">
                {/* Dynamic Page Size Selector (Show only if total > 10) */}
                {total > 10 && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Itens por página:</span>
                        <select
                            value={limit}
                            onChange={(e) => onLimitChange(Number(e.target.value))}
                            className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-slate-700 dark:text-slate-200 text-xs px-2.5 py-1.5 focus:outline-none focus:border-blue-500/80 transition-colors cursor-pointer shadow-md"
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>
                )}

            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={page === 1}
                    className="p-1.5 rounded-md border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/40 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-200 dark:bg-slate-800/60 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500 dark:text-slate-400 transition-all cursor-pointer shadow-md"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>

                {getPages().map((p, idx) => (
                    p === '...' ? (
                        <span key={`ellipsis-${idx}`} className="px-1 text-slate-500 font-medium">...</span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => onPageChange(p as number)}
                            className={`min-w-8 h-8 rounded-md text-xs font-semibold border transition-all cursor-pointer ${page === p
                                    ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                                    : 'border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950/20 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-200 dark:bg-slate-800/50'
                                }`}
                        >
                            {p}
                        </button>
                    )
                ))}

                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-md border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/40 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-200 dark:bg-slate-800/60 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500 dark:text-slate-400 transition-all cursor-pointer shadow-md"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
 </div >
 );
};
