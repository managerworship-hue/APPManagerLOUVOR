import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { storage } from '@/src/utils/storage';

export type ThemeType = 'light' | 'dark';

export const lightColors = {
  bg: '#F9F9F8',
  surface: '#FFFFFF',
  surfaceAlt: '#F3F2F0',
  border: '#E8E8E6',
  text: '#0F141E',
  textSecondary: '#626773',
  textMuted: '#9CA3AF',
  primary: '#1A2B4C',
  primaryHover: '#2B406A',
  gold: '#C5A059',
  goldHover: '#DFB668',
  success: '#2E6B4E',
  warning: '#B07A25',
  error: '#9B2C2C',
  info: '#1D4ED8',
};

export const darkColors = {
  bg: '#121212',
  surface: '#1E1E1E',
  surfaceAlt: '#2A2A2A',
  border: '#333333',
  text: '#F3F4F6',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  primary: '#3B82F6',
  primaryHover: '#60A5FA',
  gold: '#FBBF24',
  goldHover: '#FCD34D',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
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
