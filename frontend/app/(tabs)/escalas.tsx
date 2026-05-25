import React, { useCallback, useState, useMemo } from 'react';
import {
  View, Text, SectionList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/api/client';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { storage } from '@/src/utils/storage';
import { radius, font, spacing } from '@/src/theme';
import { formatDay, formatMonth } from '@/src/utils/date';

type Scale = {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  song_ids: string[];
  musician_ids: string[];
};

export default function ScalesScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const router = useRouter();
  const { hasPermission, isLeader, user } = useAuth();
  const [items, setItems] = useState<Scale[]>([]);

  const { minhasEscalas, outrasEscalas } = useMemo(() => {
    const minhas = items.filter(i => i.musician_ids?.includes(user?.id ?? ''));
    const outras = items.filter(i => !i.musician_ids?.includes(user?.id ?? ''));
    return { minhasEscalas: minhas, outrasEscalas: outras };
  }, [items, user?.id]);

  const sections = useMemo(() => {
    return [
      {
        title: 'Escalas Que Estou',
        data: minhasEscalas.length === 0 ? [{ id: 'empty-mine', isEmpty: true } as any] : minhasEscalas,
        isMyScales: true,
      },
      {
        title: 'Outras Escalas',
        data: outrasEscalas,
        isMyScales: false,
      }
    ];
  }, [minhasEscalas, outrasEscalas]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      // 1. Carregar instantaneamente do cache local
      const cached = (await storage.getItem('cached_scales', [] as any)) as Scale[] | null;
      if (cached && cached.length > 0 && items.length === 0) {
        setItems(cached);
        setLoading(false);
      }

      // 2. Buscar dados frescos da API
      const r = await api<Scale[]>('/scales');
      setItems(r);
      await storage.setItem('cached_scales', r as any);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [items.length]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const canEdit = isLeader;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Escalas</Text>
          <Text style={styles.subtitle}>{items.length} evento{items.length !== 1 ? 's' : ''}</Text>
        </View>
        {canEdit && (
          <TouchableOpacity
            testID="new-scale-button"
            style={styles.fabSmall}
            onPress={() => router.push('/escala/nova')}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {loading && items.length === 0 ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={40} color={colors.textMuted} />
          <Text style={styles.emptyText}>Nenhuma escala cadastrada</Text>
          {canEdit && (
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push('/escala/nova')}
              testID="empty-new-scale-button"
            >
              <Text style={styles.emptyBtnText}>Criar primeira escala</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => {
            // Se for Outras Escalas e estiver vazia, não renderiza
            if (!section.isMyScales && section.data.length === 0) return null;
            
            return (
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionHeaderDot, { backgroundColor: section.isMyScales ? colors.gold : '#8FA3C8' }]} />
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>
                    {section.isMyScales ? minhasEscalas.length : outrasEscalas.length}
                  </Text>
                </View>
              </View>
            );
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />
          }
          renderItem={({ item }) => {
            if (item.isEmpty) {
              return (
                <View style={styles.myScalesEmptyCard}>
                  <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} style={{ opacity: 0.7 }} />
                  <Text style={styles.myScalesEmptyText}>Você não está escalado para nenhum dos próximos eventos.</Text>
                </View>
              );
            }

            return (
              <TouchableOpacity
                testID={`scale-item-${item.id}`}
                style={styles.row}
                onPress={() => router.push(`/escala/${item.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.dateBlock}>
                  <Text style={styles.day}>{formatDay(item.date)}</Text>
                  <Text style={styles.month}>{formatMonth(item.date)}</Text>
                </View>
                <View style={styles.divider} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
                  <View style={styles.metaRow}>
                    {item.time ? (
                      <View style={styles.metaPill}>
                        <Ionicons name="time-outline" size={11} color={colors.textSecondary} />
                        <Text style={styles.metaText}>{item.time}</Text>
                      </View>
                    ) : null}
                    {item.location ? (
                      <View style={styles.metaPill}>
                        <Ionicons name="location-outline" size={11} color={colors.textSecondary} />
                        <Text style={styles.metaText} numberOfLines={1}>{item.location}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.statsRow}>
                    <Text style={styles.statsText}>{item.song_ids.length} música{item.song_ids.length !== 1 ? 's' : ''}</Text>
                    <Text style={styles.statsText}>·</Text>
                    <Text style={styles.statsText}>{item.musician_ids.length} músico{item.musician_ids.length !== 1 ? 's' : ''}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, paddingBottom: spacing.sm },
  title: { fontSize: font.h1, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: font.caption, color: colors.textSecondary },
  fabSmall: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  emptyText: { fontSize: font.body, color: colors.textSecondary, marginTop: spacing.md },
  emptyBtn: { marginTop: spacing.lg, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.full },
  emptyBtnText: { color: '#fff', fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
    gap: spacing.md,
  },
  dateBlock: { alignItems: 'center', minWidth: 44 },
  day: { fontSize: 26, fontWeight: '700', color: colors.gold, letterSpacing: -1, lineHeight: 30 },
  month: { fontSize: font.small, color: colors.textSecondary, fontWeight: '700', letterSpacing: 1 },
  divider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.border },
  rowTitle: { fontSize: font.body, fontWeight: '700', color: colors.text, marginBottom: 4 },
  metaRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: font.small, color: colors.textSecondary },
  statsRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  statsText: { fontSize: font.small, color: colors.textMuted },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  sectionHeaderDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sectionTitle: {
    fontSize: font.small,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionBadge: {
    backgroundColor: 'rgba(143, 163, 200, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  sectionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  myScalesEmptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(143, 163, 200, 0.03)',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: spacing.sm,
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  myScalesEmptyText: {
    fontSize: font.small,
    color: colors.textMuted,
    flex: 1,
    lineHeight: 18,
  },
});
