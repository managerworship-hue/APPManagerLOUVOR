import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  StyleSheet,
} from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface TabConfig {
  label: string;
  icon: IoniconsName;
  activeIcon: IoniconsName;
}

const TAB_CONFIG: Record<string, TabConfig> = {
  index:      { label: 'Início',     icon: 'home-outline',           activeIcon: 'home' },
  escalas:    { label: 'Escalas',    icon: 'calendar-outline',       activeIcon: 'calendar' },
  repertorio: { label: 'Repertório', icon: 'musical-notes-outline',  activeIcon: 'musical-notes' },
  perfil:     { label: 'Perfil',     icon: 'person-circle-outline',  activeIcon: 'person-circle' },
};

const VISIBLE_TABS = Object.keys(TAB_CONFIG);

export function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [webSafeBottom, setWebSafeBottom] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    // Read the real CSS env(safe-area-inset-bottom) value by probing a DOM element.
    // This is more reliable than useSafeAreaInsets on web because it reads
    // the value AFTER the viewport-fit=cover meta tag has been applied.
    const probe = document.createElement('div');
    probe.style.cssText =
      'position:fixed;bottom:0;left:0;width:1px;height:1px;' +
      'padding-bottom:env(safe-area-inset-bottom,0px);pointer-events:none;visibility:hidden;';
    document.body.appendChild(probe);
    const val = parseFloat(window.getComputedStyle(probe).paddingBottom) || 0;
    document.body.removeChild(probe);
    setWebSafeBottom(val);
  }, []);

  // Prefer native insets; fall back to probed web value
  const safeBottom =
    Platform.OS === 'web'
      ? webSafeBottom
      : Math.max(insets.bottom, 0);

  // Only render visible tabs (those defined in TAB_CONFIG)
  const visibleRoutes = state.routes.filter(r => VISIBLE_TABS.includes(r.name));

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.surface, // remove border for a cleaner pill
          // Floating pill style
          position: 'absolute',
          bottom: safeBottom + 12,
          left: 16,
          right: 16,
          borderRadius: 24,
          paddingBottom: 0, // No extra padding needed because it's floating
          height: 60,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 8,
        },
      ]}
    >
      {visibleRoutes.map(route => {
        const routeIndex = state.routes.findIndex(r => r.key === route.key);
        const isFocused = state.index === routeIndex;
        const config = TAB_CONFIG[route.name];
        const color = isFocused ? colors.info : colors.textMuted;

        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tab}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
            onLongPress={() =>
              navigation.emit({ type: 'tabLongPress', target: route.key })
            }
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isFocused ? config.activeIcon : config.icon}
              size={24}
              color={color}
            />
            <Text
              style={[styles.label, { color }]}
              numberOfLines={1}
              allowFontScaling={false}
            >
              {config.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    // No top border, it's a pill now
    paddingTop: 0,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center', // Center vertically
    gap: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    // includeFontPadding:false removes Android's extra internal padding
    // that causes text to appear clipped at the bottom
    includeFontPadding: false,
    lineHeight: 14,
  },
});
