import React, { useEffect } from 'react';
import { Platform, View, StyleSheet, Dimensions } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/src/context/AuthContext';
import { ThemeProvider, useTheme } from '@/src/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppNavigation />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppNavigation() {
  const { theme, colors } = useTheme();

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      // Sincronizar o fundo do HTML com o tema atual para evitar 
      // faixas escuras no fundo no iOS (safe area)
      document.body.style.backgroundColor = colors.bg;
      document.documentElement.style.backgroundColor = colors.bg;
      
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', colors.bg);
      } else {
        const meta = document.createElement('meta');
        meta.name = 'theme-color';
        meta.content = colors.bg;
        document.head.appendChild(meta);
      }
    }
  }, [colors.bg]);

  useEffect(() => {
    // Note: viewport meta, PWA meta tags and safe-area CSS are now in app/+html.tsx
    if (Platform.OS === 'web') {
      // Register service worker
      if ('serviceWorker' in navigator) {
        const registerSW = () => {
          navigator.serviceWorker
            .register('/service-worker.js')
            .then(reg => console.log('✅ SW registrado:', reg.scope))
            .catch(err => console.error('❌ SW falhou:', err));
        };
        if (document.readyState === 'complete') {
          registerSW();
        } else {
          window.addEventListener('load', registerSW);
        }
      }
    }
  }, []);

  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="escala/nova" options={{ presentation: 'modal' }} />
        <Stack.Screen name="musica/nova" options={{ presentation: 'modal' }} />
        <Stack.Screen name="aviso/novo" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

