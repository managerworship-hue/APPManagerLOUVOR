import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/src/context/AuthContext';
import { useEffect } from 'react';
import { Platform } from 'react-native';

export default function RootLayout() {
useEffect(() => {
  if (Platform.OS === 'web') {
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = '/manifest.json';
    document.head.appendChild(link);
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
          <Stack.Screen name="membros" />
          <Stack.Screen name="convidar" />
          <Stack.Screen name="api-docs" />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
