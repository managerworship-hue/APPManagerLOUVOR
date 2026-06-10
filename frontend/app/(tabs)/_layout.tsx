import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { CustomTabBar } from '@/src/components/CustomTabBar';

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
      // A única forma de garantir 100% que o React Navigation não corta o texto 
      // é usar a nossa própria componente para desenhar a tab bar, onde não
      // usamos 'overflow: hidden' em momento nenhum.
      tabBar={props => <CustomTabBar {...props} />}
      // Evitar que o React Navigation empurre a tab bar para cima
      // expondo o background escuro da página HTML por baixo
      safeAreaInsets={{ bottom: 0, top: 0, left: 0, right: 0 }}
      screenOptions={{
        headerShown: false,
        lazy: false,
      }}
    >
      <Tabs.Screen name="index"      options={{ title: 'Início' }} />
      <Tabs.Screen name="escalas"    options={{ title: 'Escalas' }} />
      <Tabs.Screen name="repertorio" options={{ title: 'Repertório' }} />
      <Tabs.Screen name="perfil"     options={{ title: 'Perfil' }} />
      <Tabs.Screen name="membros"    options={{ href: null }} />
      <Tabs.Screen name="convidar"   options={{ href: null }} />
      <Tabs.Screen name="api-docs"   options={{ href: null }} />
      <Tabs.Screen name="escala/[id]" options={{ href: null }} />
      <Tabs.Screen name="musica/[id]" options={{ href: null }} />
      <Tabs.Screen name="aviso/[id]"  options={{ href: null }} />
    </Tabs>
  );
}
