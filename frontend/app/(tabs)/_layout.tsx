import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, ActivityIndicator, StyleSheet } from 'react-native';
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
      <View style={[styles.loader, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  // On web, inject a one-time CSS rule to fix safe area for the tab bar.
  // This is the only reliable way since React Native Web doesn't support
  // CSS env() in inline styles.
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const styleId = 'tab-bar-safe-area-fix';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      // React Navigation renders the tab bar as a fixed div at the bottom.
      // We target it by adding extra bottom padding via CSS custom property.
      style.innerHTML = `
        /* Tab bar safe area fix for PWA on iOS and Android */
        [data-testid="bottom-tab-bar"],
        div[style*="bottom: 0"][style*="position: fixed"],
        div[style*="bottom:0"][style*="position:fixed"] {
          padding-bottom: max(env(safe-area-inset-bottom, 0px), 0px) !important;
        }
      `;
      document.head.appendChild(style);
    }
  }

  // Calculate bottom padding for the tab bar.
  // - insets.bottom comes from react-native-safe-area-context (reads env(safe-area-inset-bottom))
  // - It's > 0 on iPhone with home indicator or Android with gesture nav
  // - On web it may be 0 on first render if viewport-fit=cover wasn't in the HTML head
  //   (now fixed by +html.tsx), but we add a safety fallback anyway.
  const isNativeIOS = Platform.OS === 'ios';
  const isNativeAndroid = Platform.OS === 'android';

  // For native Android with edgeToEdgeEnabled:true, insets.bottom is the gesture nav height
  // For native iOS, insets.bottom is the home indicator height (34px on iPhone X+)
  // For web, insets.bottom reads from CSS env(safe-area-inset-bottom) via RNSA context
  const safeBottom = insets.bottom;

  // Tab bar total height = icon + label area + safe area padding
  // We only set height on native platforms where we have reliable inset values.
  // On web, height is managed by CSS (see injection above).
  const tabBarHeight = isNativeIOS || isNativeAndroid
    ? 50 + Math.max(safeBottom, isNativeIOS ? 0 : 0)
    : undefined; // let CSS handle it on web

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
          // Only set explicit height on native — on web, let safe area CSS handle it
          ...(tabBarHeight !== undefined ? { height: tabBarHeight } : {}),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.2,
          marginBottom: 2,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="escalas"
        options={{
          title: 'Escalas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="repertorio"
        options={{
          title: 'Repertório',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="musical-notes-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" color={color} size={size} />
          ),
        }}
      />
      {/* Hidden screens (not shown in tab bar) */}
      <Tabs.Screen name="membros"    options={{ href: null }} />
      <Tabs.Screen name="convidar"   options={{ href: null }} />
      <Tabs.Screen name="api-docs"   options={{ href: null }} />
      <Tabs.Screen name="escala/[id]" options={{ href: null }} />
      <Tabs.Screen name="musica/[id]" options={{ href: null }} />
      <Tabs.Screen name="aviso/[id]"  options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
