import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { storage } from '@/src/utils/storage';

export type ThemeType = 'light' | 'dark';

export const lightColors = {
  bg: '#F5F7FB',          // Off-white acinzentado sutil (fundo da foto)
  surface: '#FFFFFF',     // Branco puro para cartões
  surfaceAlt: '#E9ECEF',  // Superfície alternativa
  border: '#E2E8F0',      // Borda sutil
  text: '#1A202C',        // Cinza escuro/ardósia profundo para texto principal
  textSecondary: '#4A5568', // Texto secundário
  textMuted: '#A0AEC0',    // Texto silenciado
  primary: '#00ACC1',     // Ciano brilhante da foto (active link/progress bar)
  primaryHover: '#0097A7', // Ciano ligeiramente mais escuro
  gold: '#CCA462',        // Ouro champanhe metálico
  goldHover: '#DBC08C',   // Ouro champanhe ativo
  success: '#2ECC71',     // Verde sucesso
  warning: '#F39C12',     // Laranja atenção
  error: '#E74C3C',       // Vermelho erro
  info: '#00ACC1',        // Ciano
};

export const darkColors = {
  bg: '#0E131F',          // Escuro obsidian de luxo
  surface: '#171E2E',     // Superfície de cartão escura integrada
  surfaceAlt: '#20293A',  // Destaque de cartão ativo
  border: '#2A3447',      // Borda escura elegante
  text: '#F8F9FA',        // Branco-cinza de alto brilho
  textSecondary: '#A0AEC0', // Cinza médio
  textMuted: '#718096',    // Cinza silenciado
  primary: '#00E5FF',     // Ciano neon brilhante
  primaryHover: '#33ECFF', // Ciano ativo
  gold: '#CCA462',        // Ouro champanhe
  goldHover: '#DBC08C',   // Ouro ativo
  success: '#2ECC71',     // Verde sucesso
  warning: '#F39C12',     // Laranja atenção
  error: '#E74C3C',       // Vermelho erro
  info: '#00E5FF',        // Ciano info
};

type ThemeContextType = {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  colors: typeof lightColors;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeType>('light');

  useEffect(() => {
    storage.getItem<string>('theme_mode', '').then((saved) => {
      if (saved === 'light' || saved === 'dark') {
        setThemeState(saved as ThemeType);
      } else if (systemScheme === 'dark') {
        setThemeState('dark');
      }
    });
  }, [systemScheme]);

  const setTheme = async (mode: ThemeType) => {
    setThemeState(mode);
    await storage.setItem('theme_mode', mode);
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const colors = theme === 'dark' ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
}
