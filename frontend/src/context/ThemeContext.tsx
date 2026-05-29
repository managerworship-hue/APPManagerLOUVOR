import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { storage } from '@/src/utils/storage';

export type ThemeType = 'light' | 'dark';

export const lightColors = {
  bg: '#F2F7F8',          // Off-white suave com tom azul-petróleo gelado
  surface: '#FFFFFF',     // Branco puro para contêineres e cartões
  surfaceAlt: '#EBF2F4',  // Destaque de superfície sutil e claro
  border: '#E1ECEF',      // Borda clara integrada ao tema
  text: '#08282D',        // Azul-petróleo profundo quase preto
  textSecondary: '#3D5A60', // Azul-petróleo médio para informações secundárias
  textMuted: '#7B969C',    // Texto atenuado/captions
  primary: '#0B727F',     // Azul-petróleo rico e sofisticado (Reviver Teal)
  primaryHover: '#085863', // Destaque escuro interativo
  gold: '#C2A478',        // Ouro-champanhe premium para contrastes de destaque
  goldHover: '#D2B78D',   // Ouro-champanhe claro interativo
  success: '#1EA07E',     // Verde-menta suave de sucesso
  warning: '#D97706',     // Âmbar elegante
  error: '#DC2626',       // Vermelho vivo
  info: '#0D9488',        // Ciano elegante de informação
};

export const darkColors = {
  bg: '#052429',          // O azul-petróleo de luxo da base da foto
  surface: '#09343B',     // Superfície de cartão integrada da região média da foto
  surfaceAlt: '#0D454E',  // Destaque de cartão ativo
  border: '#125661',      // Bordas sutis integradas
  text: '#F0FDFA',        // Branco-menta muito suave e premium
  textSecondary: '#95C1C8', // Ciano pastel para subtítulos e descrições
  textMuted: '#62939B',    // Texto atenuado no modo escuro
  primary: '#17B3C4',     // O ciano vibrante/luminoso central do logotipo Reviver
  primaryHover: '#39C7D6', // Ciano luminoso brilhante ativo
  gold: '#CCA462',        // Ouro-champanhe de luxo
  goldHover: '#DBC08C',   // Ouro-champanhe brilhante ativo
  success: '#10B981',     // Verde vibrante de sucesso
  warning: '#F59E0B',     // Laranja vibrante de atenção
  error: '#EF4444',       // Vermelho vibrante de erro
  info: '#17B3C4',        // Ciano vibrante
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
