import React, { useEffect } from 'react';
import { Platform, View, StyleSheet, Dimensions } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/src/context/AuthContext';
import { ThemeProvider, useTheme } from '@/src/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

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
      <GlobalMusicTexture />
    </>
  );
}

// Render a subtle music pattern overlay on top of the entire app (pointerEvents="none")
function GlobalMusicTexture() {
  const { colors } = useTheme();
  const { width, height } = Dimensions.get('window');
  const cols = 5;
  const rows = Math.ceil(height / (width / cols));
  const notes = ['musical-note', 'musical-notes', 'mic', 'radio'] as const;

  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', opacity: 0.03 }]} pointerEvents="none">
      {Array.from({ length: rows }).map((_, r) => (
        <View key={r} style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 40 }}>
          {Array.from({ length: cols }).map((_, c) => {
            const iconIndex = (r * cols + c) % notes.length;
            const rotation = (r * 15 + c * 25) % 360;
            return (
              <Ionicons
                key={c}
                name={notes[iconIndex]}
                size={30}
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
