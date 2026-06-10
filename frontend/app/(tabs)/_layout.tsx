import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';

export default function TabsLayout() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user, loading } = useAuth();

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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: false,
        tabBarActiveTintColor: colors.info,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          // lineHeight explícito garante que o container de texto tem altura
          // suficiente e não corta os caracteres na base
          lineHeight: 14,
          // includeFontPadding:false elimina o padding interno do Android
          includeFontPadding: false,
        },
        // paddingBottom no item afasta o conteúdo (ícone+label) da borda inferior
        tabBarItemStyle: {
          paddingBottom: 3,
        },
        // Impede que o tamanho de fonte do sistema afete os labels da tab bar
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
