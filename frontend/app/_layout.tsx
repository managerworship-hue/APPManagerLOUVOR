import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/src/context/AuthContext';
import { ThemeProvider, useTheme } from '@/src/context/ThemeContext';

export default function RootLayout() {
  useEffect(() => {
    // Note: viewport meta, PWA meta tags and safe-area CSS are now in app/+html.tsx
    // so they are present in the HTML before React renders (critical for useSafeAreaInsets).
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
