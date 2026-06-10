import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';

// Altura da área de conteúdo (ícone + label), sem safe area
const TAB_CONTENT_HEIGHT = 58;

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

  // Altura total = conteúdo + safe area (ex: 58 + 34 = 92px no iPhone com home indicator)
  const tabBarHeight = TAB_CONTENT_HEIGHT + insets.bottom;

  return (
    <Tabs
      // Desativa a safe area automática do React Navigation para evitar
      // que seja adicionada duas vezes (já está incluída em tabBarHeight)
      safeAreaInsets={{ bottom: 0, top: 0, left: 0, right: 0 }}
      screenOptions={{
        headerShown: false,
        lazy: false,
        tabBarActiveTintColor: colors.info,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          // Altura total garantida — nunca vai cortar o conteúdo
          height: tabBarHeight,
          // paddingBottom empurra o conteúdo para cima da safe area
          paddingBottom: insets.bottom,
          // paddingTop dá espaço acima dos ícones
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          lineHeight: 14,
          includeFontPadding: false,
          marginTop: 2,
        },
        tabBarAllowFontScaling: false,
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
      <Tabs.Screen name="membros"     options={{ href: null }} />
      <Tabs.Screen name="convidar"    options={{ href: null }} />
      <Tabs.Screen name="api-docs"    options={{ href: null }} />
      <Tabs.Screen name="escala/[id]" options={{ href: null }} />
      <Tabs.Screen name="musica/[id]" options={{ href: null }} />
      <Tabs.Screen name="aviso/[id]"  options={{ href: null }} />
    </Tabs>
  );
}
