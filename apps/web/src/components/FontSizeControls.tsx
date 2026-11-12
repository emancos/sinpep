import React from 'react';
import { useFontSize } from '../contexts/FontSizeContext';

interface FontSizeControlsProps {
  variant?: 'header' | 'surface';
}

/**
 * Botões de acessibilidade (A-, A, A+) para ajuste do tamanho do texto no sistema.
 */
export const FontSizeControls: React.FC<FontSizeControlsProps> = ({ variant = 'header' }) => {
  const {
    fontSize,
    percentage,
    label,
    canDecrease,
    canIncrease,
    decreaseFontSize,
    resetFontSize,
    increaseFontSize,
  } = useFontSize();

  const isHeader = variant === 'header';

  const containerClass = isHeader
    ? 'h-9 flex items-center rounded-lg border border-white/20 bg-white/10 text-white shadow-sm overflow-hidden shrink-0'
    : 'h-8 flex items-center rounded-md border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 backdrop-blur-md shadow-sm overflow-hidden shrink-0';

  const dividerClass = isHeader
    ? 'border-r border-white/15'
    : 'border-r border-slate-200 dark:border-slate-700';

  const hoverClass = isHeader
    ? 'hover:bg-white/15'
    : 'hover:bg-slate-100 dark:hover:bg-slate-700';

  const activeResetClass =
    fontSize !== 'md'
      ? isHeader
        ? 'bg-white/20 text-white'
        : 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
      : '';

  return (
    <div
      role="group"
      aria-label="Acessibilidade: tamanho do texto"
      className={containerClass}
    >
      <button
        type="button"
        onClick={decreaseFontSize}
        disabled={!canDecrease}
        aria-label="Diminuir tamanho do texto"
        title={canDecrease ? `Diminuir tamanho do texto (atual: ${label})` : 'Tamanho mínimo atingido'}
        className={`h-full px-2 flex items-center justify-center font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-[11px] leading-none ${dividerClass} ${hoverClass}`}
      >
        A-
      </button>

      <button
        type="button"
        onClick={resetFontSize}
        aria-label="Restaurar tamanho padrão do texto"
        aria-pressed={fontSize === 'md'}
        title={`Tamanho do texto: ${percentage}% — Clique para restaurar padrão (100%)`}
        className={`h-full px-2 flex items-center justify-center font-semibold transition-colors cursor-pointer text-[12px] leading-none ${dividerClass} ${hoverClass} ${activeResetClass}`}
      >
        A
      </button>

      <button
        type="button"
        onClick={increaseFontSize}
        disabled={!canIncrease}
        aria-label="Aumentar tamanho do texto"
        title={canIncrease ? `Aumentar tamanho do texto (atual: ${label})` : 'Tamanho máximo atingido'}
        className={`h-full px-2 flex items-center justify-center font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-[13px] leading-none ${hoverClass}`}
      >
        A+
      </button>
    </div>
  );
};
