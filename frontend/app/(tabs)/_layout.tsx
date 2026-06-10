import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';

export default function TabsLayout() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user, loading } = useAuth();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const isAndroid = Platform.OS === 'android';
  const isIOS = Platform.OS === 'ios';
  const isAndroidWeb = Platform.OS === 'web' && typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
  const isIOSWeb = Platform.OS === 'web' && typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);

  const isAndroidDevice = isAndroid || isAndroidWeb;
  const isIOSDevice = isIOS || isIOSWeb;

  const bottomPadding = insets.bottom > 0 
    ? insets.bottom 
    : (isIOSDevice ? 20 : 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: false,
        tabBarActiveTintColor: colors.info,
        tabBarInactiveTintColor: colors.textMuted,
        safeAreaInsets: {
          bottom: bottomPadding,
          top: 0,
          left: 0,
          right: 0,
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.3,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="escalas"
        options={{
          title: 'Escalas',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="repertorio"
        options={{
          title: 'Repertório',
          tabBarIcon: ({ color, size }) => <Ionicons name="musical-notes-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="membros"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="convidar"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="api-docs"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="escala/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="musica/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="aviso/[id]"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
