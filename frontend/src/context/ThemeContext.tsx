import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { storage } from '@/src/utils/storage';

export type ThemeType = 'light' | 'dark';

export const lightColors = {
  bg: '#F8F9FA',          // Off-white minimalista e extremamente limpo
  surface: '#FFFFFF',     // Branco puro para os cartões
  surfaceAlt: '#F1F3F5',  // Destaque de superfície sutil
  border: '#E9ECEF',      // Borda sutil e muito limpa
  text: '#1A1D20',        // Preto-ardósia profundo, muito elegante e legível
  textSecondary: '#495057', // Cinza-carvão para subtítulos
  textMuted: '#868E96',    // Cinza atenuado para rótulos secundários
  primary: '#4F46E5',     // Indigo profundo e nobre (Royal Indigo)
  primaryHover: '#4338CA', // Indigo profundo interativo
  gold: '#C2A478',        // Ouro-champanhe premium para detalhes de destaque
  goldHover: '#D2B78D',   // Ouro-champanhe claro interativo
  success: '#2B8A3E',     // Verde floresta suave
  warning: '#E67E22',     // Âmbar quente
  error: '#C92A2A',       // Carmim de alta legibilidade
  info: '#1971C2',        // Azul-oceano elegante para info
};

export const darkColors = {
  bg: '#090A0F',          // Preto Obsidian profundo com leve tom da meia-noite (luxuoso)
  surface: '#12141C',     // Carvão metálico rico para cartões e áreas internas
  surfaceAlt: '#1A1D28',  // Destaque de superfície ativa
  border: '#222533',      // Borda ultra-fina e luxuosa
  text: '#F8F9FA',        // Branco-cinza limpo de alto contraste
  textSecondary: '#ADB5BD', // Prata-cinza metálico para descrições
  textMuted: '#6C757D',    // Cinza escuro atenuado
  primary: '#6366F1',     // Indigo elétrico vibrante e moderno
  primaryHover: '#818CF8', // Indigo luminoso brilhante ativo
  gold: '#CCA462',        // Ouro-champanhe de luxo metálico
  goldHover: '#DBC08C',   // Ouro-champanhe brilhante ativo
  success: '#37B24D',     // Verde esmeralda de sucesso
  warning: '#F59E0B',     // Laranja-âmbar de atenção
  error: '#F03E3E',       // Vermelho brilhante de erro
  info: '#339AF0',        // Azul vibrante de info
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
