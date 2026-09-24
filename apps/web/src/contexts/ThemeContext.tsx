import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'system';

interface ThemeProviderProps {
 children: React.ReactNode;
 defaultTheme?: Theme;
 storageKey?: string;
}

interface ThemeProviderState {
 theme: Theme;
 setTheme: (theme: Theme) => void;
 resolvedTheme: 'dark' | 'light';
}

const initialState: ThemeProviderState = {
 theme: 'system',
 setTheme: () => null,
 resolvedTheme: 'dark',
};

const ThemeContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
 children,
 defaultTheme = 'system',
 storageKey = 'app_base-ui-theme',
 ...props
}: ThemeProviderProps) {
 const [theme, setTheme] = useState<Theme>(
 () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
 );
 
 const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark');

 useEffect(() => {
 const root = window.document.documentElement;

 root.classList.remove('light', 'dark');

 if (theme === 'system') {
 const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
 .matches
 ? 'dark'
 : 'light';

 root.classList.add(systemTheme);
 setResolvedTheme(systemTheme);
 
 const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
 const handleChange = (e: MediaQueryListEvent) => {
 if (theme === 'system') {
 root.classList.remove('light', 'dark');
 const newTheme = e.matches ? 'dark' : 'light';
 root.classList.add(newTheme);
 setResolvedTheme(newTheme);
 }
 };
 
 mediaQuery.addEventListener('change', handleChange);
 return () => mediaQuery.removeEventListener('change', handleChange);
 }

 root.classList.add(theme);
 setResolvedTheme(theme);
 }, [theme]);

 const value = {
 theme,
 setTheme: (theme: Theme) => {
 localStorage.setItem(storageKey, theme);
 setTheme(theme);
 },
 resolvedTheme,
 };

 return (
 <ThemeContext.Provider {...props} value={value}>
 {children}
 </ThemeContext.Provider>
 );
}

export const useTheme = () => {
 const context = useContext(ThemeContext);

 if (context === undefined)
 throw new Error('useTheme must be used within a ThemeProvider');

 return context;
};
