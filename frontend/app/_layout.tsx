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
      <GlobalMusicTexture />
    </>
  );
}

// Render a subtle music pattern overlay on top of the entire app (pointerEvents="none")
function GlobalMusicTexture() {
  const { colors } = useTheme();
  const { width, height } = Dimensions.get('window');
  const cols = 2; // Fewer columns for larger notes
  const rows = Math.ceil(height / (width / cols)) + 2;
  const notes = ['musical-note', 'musical-notes', 'mic', 'radio'] as const;

  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', opacity: 0.04 }]} pointerEvents="none">
      {Array.from({ length: rows }).map((_, r) => (
        <View key={r} style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 120 }}>
          {Array.from({ length: cols }).map((_, c) => {
            const iconIndex = (r * cols + c) % notes.length;
            const rotation = (r * 15 + c * 25) % 360;
            return (
              <Ionicons
                key={c}
                name={notes[iconIndex]}
                size={220}
                color={colors.text}
                style={{ transform: [{ rotate: `${rotation}deg` }] }}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}
