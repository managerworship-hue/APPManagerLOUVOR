import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/src/context/AuthContext';

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Idioma português — evita popup de tradução
      document.documentElement.lang = 'pt-BR';

      // Viewport correto — impede zoom e ajusta ao ecrã do telemóvel
      let meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement('meta') as HTMLMetaElement;
        meta.name = 'viewport';
        document.head.appendChild(meta);
      }
      meta.content =
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';

      // Manifest PWA
      let link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link') as HTMLLinkElement;
        link.rel = 'manifest';
        document.head.appendChild(link);
      }
      link.href = '/manifest.json';

      // Service Worker
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker
            .register('/service-worker.js')
            .then((reg) => console.log('✅ SW registrado:', reg.scope))
            .catch((err) => console.error('❌ SW falhou:', err));
        });
      }
    }
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F9F9F8' } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="escala/nova" options={{ presentation: 'modal' }} />
          <Stack.Screen name="escala/[id]" />
          <Stack.Screen name="musica/nova" options={{ presentation: 'modal' }} />
          <Stack.Screen name="musica/[id]" />
          <Stack.Screen name="aviso/novo" options={{ presentation: 'modal' }} />
          <Stack.Screen name="aviso/[id]" />
          <Stack.Screen name="membros" />
          <Stack.Screen name="convidar" />
          <Stack.Screen name="api-docs" />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
