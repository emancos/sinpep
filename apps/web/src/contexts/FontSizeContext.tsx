import React, { createContext, useContext, useEffect, useState } from 'react';

export type FontSizeScale = 'sm' | 'md' | 'lg' | 'xl';

export const FONT_SIZE_ORDER: readonly FontSizeScale[] = ['sm', 'md', 'lg', 'xl'];

export const FONT_SIZE_SCALES: Record<
  FontSizeScale,
  { label: string; percentage: number; rootFontSize: string }
> = {
  sm: { label: 'Reduzido (87,5%)', percentage: 87.5, rootFontSize: '87.5%' },
  md: { label: 'Padrão (100%)', percentage: 100, rootFontSize: '100%' },
  lg: { label: 'Grande (112,5%)', percentage: 112.5, rootFontSize: '112.5%' },
  xl: { label: 'Extra Grande (125%)', percentage: 125, rootFontSize: '125%' },
};

const DEFAULT_STORAGE_KEY = 'app_base-ui-font-size';

interface FontSizeProviderProps {
  children: React.ReactNode;
  defaultScale?: FontSizeScale;
  storageKey?: string;
}

interface FontSizeContextValue {
  fontSize: FontSizeScale;
  percentage: number;
  label: string;
  canDecrease: boolean;
  canIncrease: boolean;
  setFontSize: (scale: FontSizeScale) => void;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  resetFontSize: () => void;
}

const FontSizeContext = createContext<FontSizeContextValue | undefined>(undefined);

function isValidScale(value: unknown): value is FontSizeScale {
  return typeof value === 'string' && FONT_SIZE_ORDER.includes(value as FontSizeScale);
}

/**
 * Provedor global de acessibilidade tipográfica que escala o root font-size (rem).
 */
export function FontSizeProvider({
  children,
  defaultScale = 'md',
  storageKey = DEFAULT_STORAGE_KEY,
}: FontSizeProviderProps) {
  const [fontSize, setFontSizeState] = useState<FontSizeScale>(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      return isValidScale(saved) ? saved : defaultScale;
    } catch {
      return defaultScale;
    }
  });

  useEffect(() => {
    const root = window.document.documentElement;
    const config = FONT_SIZE_SCALES[fontSize];
    root.style.fontSize = config.rootFontSize;
    root.dataset.fontScale = fontSize;
  }, [fontSize]);

  const setFontSize = (nextScale: FontSizeScale) => {
    try {
      window.localStorage.setItem(storageKey, nextScale);
    } catch {
      // Ignora indisponibilidade de localStorage
    }
    setFontSizeState(nextScale);
  };

  const currentIndex = FONT_SIZE_ORDER.indexOf(fontSize);
  const canDecrease = currentIndex > 0;
  const canIncrease = currentIndex < FONT_SIZE_ORDER.length - 1;

  const decreaseFontSize = () => {
    if (canDecrease) {
      setFontSize(FONT_SIZE_ORDER[currentIndex - 1]);
    }
  };

  const increaseFontSize = () => {
    if (canIncrease) {
      setFontSize(FONT_SIZE_ORDER[currentIndex + 1]);
    }
  };

  const resetFontSize = () => {
    setFontSize('md');
  };

  const currentConfig = FONT_SIZE_SCALES[fontSize];

  return (
    <FontSizeContext.Provider
      value={{
        fontSize,
        percentage: currentConfig.percentage,
        label: currentConfig.label,
        canDecrease,
        canIncrease,
        setFontSize,
        increaseFontSize,
        decreaseFontSize,
        resetFontSize,
      }}
    >
      {children}
    </FontSizeContext.Provider>
  );
}

/**
 * Hook para controlar o tamanho de texto global da interface.
 */
export function useFontSize(): FontSizeContextValue {
  const context = useContext(FontSizeContext);
  if (!context) {
    throw new Error('useFontSize must be used within a FontSizeProvider');
  }
  return context;
}
