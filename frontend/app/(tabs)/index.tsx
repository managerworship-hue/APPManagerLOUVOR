import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/api/client';
import { useAuth } from '@/src/context/AuthContext';
import { storage } from '@/src/utils/storage';
import { useTheme } from '@/src/context/ThemeContext';
import { radius, font, spacing } from '@/src/theme';
import { formatDay, formatMonth, formatRelative } from '@/src/utils/date';

type Stats = {
  members: number;
  songs: number;
  scales: number;
  announcements: number;
  next_scale: any | null;
};

type Announcement = {
  id: string;
  title: string;
  body: string;
  author_name: string;
  created_at: string;
};

export default function HomeScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const router = useRouter();
  const { user, ministry, isLeader } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      // 1. Carregar instantaneamente do cache para exibição imediata
      const [cachedStats, cachedAnn] = await Promise.all([
        storage.getItem('cached_stats', null) as Promise<Stats | null>,
        storage.getItem('cached_announcements', [] as any) as Promise<Announcement[] | null>,
      ]);

      if (cachedStats && stats === null) {
        setStats(cachedStats);
        if (cachedAnn) {
          setAnnouncements(cachedAnn.slice(0, 3));
        }
        setLoading(false);
      }

      // 2. Buscar dados frescos em segundo plano
      const [s, a] = await Promise.all([
        api<Stats>('/stats'),
        api<Announcement[]>('/announcements'),
      ]);
      setStats(s);
      setAnnouncements(a.slice(0, 3));

      await Promise.all([
        storage.setItem('cached_stats', s as any),
        storage.setItem('cached_announcements', a as any),
      ]);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [stats]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting} testID="home-greeting">Olá, {user?.name?.split(' ')[0]}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <Text style={styles.ministryName}>{ministry?.name}</Text>
              {isLeader && (
                <View style={styles.leaderTag}>
                  <Ionicons name="star" size={10} color={colors.gold} />
                  <Text style={styles.leaderText}>LÍDER</Text>
                </View>
              )}
            </View>
          </View>
          {/* Convidar: apenas líder */}
          {isLeader && (
            <TouchableOpacity
              testID="home-invite-button"
              style={styles.iconBtn}
              onPress={() => router.push('/convidar')}
              activeOpacity={0.7}
            >
              <Ionicons name="share-outline" size={20} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Próxima escala */}
            {stats?.next_scale ? (
              <TouchableOpacity
                testID="next-scale-card"
                style={styles.nextCard}
                onPress={() => router.push(`/escala/${stats.next_scale.id}`)}
                activeOpacity={0.85}
              >
                <View style={styles.nextOverlay} />
                <Text style={styles.nextLabel}>PRÓXIMA ESCALA</Text>
                <Text style={styles.nextTitle}>{stats.next_scale.title}</Text>
                <View style={styles.nextRow}>
                  <Ionicons name="calendar" size={14} color={colors.gold} />
                  <Text style={styles.nextMeta}>
                    {formatDay(stats.next_scale.date)} {formatMonth(stats.next_scale.date)}
                    {stats.next_scale.time ? `  ·  ${stats.next_scale.time}` : ''}
                  </Text>
                </View>
                {stats.next_scale.location ? (
                  <View style={styles.nextRow}>
                    <Ionicons name="location" size={14} color={colors.gold} />
                    <Text style={styles.nextMeta}>{stats.next_scale.location}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            ) : (
              <View style={styles.emptyCard}>
                <Ionicons name="calendar-outline" size={28} color={colors.textMuted} />
                <Text style={styles.emptyText}>Nenhuma escala próxima</Text>
                <Text style={styles.emptySubtext}>Crie a primeira escala do ministério</Text>
              </View>
            )}

            {/* Grid de estatísticas */}
            <View style={styles.grid}>
              <TouchableOpacity style={styles.statCard} onPress={() => router.push('/membros')} testID="stat-members">
                <View style={[styles.statIcon, { backgroundColor: '#F2EBDB' }]}>
                  {/* item 3: ícone de grupo de pessoas */}
                  <Ionicons name="people-outline" size={20} color={colors.gold} />
                </View>
                <Text style={styles.statValue}>{stats?.members ?? 0}</Text>
                <Text style={styles.statLabel}>Membros</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(tabs)/repertorio')} testID="stat-songs">
                <View style={[styles.statIcon, { backgroundColor: '#E6E9F0' }]}>
                  <Ionicons name="musical-note" size={20} color={colors.primary} />
                </View>
                <Text style={styles.statValue}>{stats?.songs ?? 0}</Text>
                <Text style={styles.statLabel}>Músicas</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(tabs)/escalas')} testID="stat-scales">
                <View style={[styles.statIcon, { backgroundColor: '#E6F0EA' }]}>
                  <Ionicons name="calendar-outline" size={20} color={colors.success} />
                </View>
                <Text style={styles.statValue}>{stats?.scales ?? 0}</Text>
                <Text style={styles.statLabel}>Escalas</Text>
              </TouchableOpacity>
              {/* Avisos: só líder cria */}
              <TouchableOpacity
                style={styles.statCard}
                onPress={() => isLeader ? router.push('/aviso/novo') : null}
                testID="stat-announcements"
                activeOpacity={isLeader ? 0.7 : 1}
              >
                <View style={[styles.statIcon, { backgroundColor: '#F2E6E6' }]}>
                  <Ionicons name="megaphone-outline" size={20} color={colors.error} />
                </View>
                <Text style={styles.statValue}>{stats?.announcements ?? 0}</Text>
                <Text style={styles.statLabel}>Avisos</Text>
              </TouchableOpacity>
            </View>

            {/* Avisos recentes — clicáveis (item 8) */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Avisos recentes</Text>
              {isLeader && (
                <TouchableOpacity onPress={() => router.push('/aviso/novo')} testID="new-announcement-button">
                  <Text style={styles.sectionLink}>Novo +</Text>
                </TouchableOpacity>
              )}
            </View>

            {announcements.length === 0 ? (
              <View style={styles.emptySmall}>
                <Text style={styles.emptySubtext}>Sem avisos ainda</Text>
              </View>
            ) : (
              announcements.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  style={styles.annCard}
                  testID={`announcement-${a.id}`}
                  onPress={() => router.push(`/aviso/${a.id}`)}
                  activeOpacity={0.75}
                >
                  <View style={styles.annHeader}>
                    <Ionicons name="megaphone" size={14} color={colors.gold} />
                    <Text style={styles.annAuthor}>{a.author_name}</Text>
                    <Text style={styles.annTime}>· {formatRelative(a.created_at)}</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
                  </View>
                  <Text style={styles.annTitle}>{a.title}</Text>
                  <Text style={styles.annBody} numberOfLines={2}>{a.body}</Text>
                </TouchableOpacity>
              ))
            )}

            <View style={{ height: 24 }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  greeting: { fontSize: font.h2, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  ministryName: { fontSize: font.caption, color: colors.textSecondary },
  leaderTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#F2EBDB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  leaderText: {
    fontSize: 9,
    color: colors.gold,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  nextCard: { backgroundColor: colors.primary, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, overflow: 'hidden', position: 'relative' },
  nextOverlay: { position: 'absolute', right: -20, top: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(197,160,89,0.15)' },
  nextLabel: { fontSize: font.small, color: colors.gold, fontWeight: '700', letterSpacing: 1.5, marginBottom: 6 },
  nextTitle: { fontSize: 22, color: '#fff', fontWeight: '700', marginBottom: spacing.sm, letterSpacing: -0.3 },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  nextMeta: { color: 'rgba(255,255,255,0.85)', fontSize: font.body },
  emptyCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  emptyText: { fontSize: font.body, color: colors.text, fontWeight: '600', marginTop: 8 },
  emptySubtext: { fontSize: font.caption, color: colors.textSecondary, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  statCard: { flexBasis: '48%', flexGrow: 1, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  statIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  statValue: { fontSize: 24, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
  statLabel: { fontSize: font.caption, color: colors.textSecondary, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sectionTitle: { fontSize: font.h3, fontWeight: '700', color: colors.text },
  sectionLink: { color: colors.primary, fontWeight: '600', fontSize: font.caption },
  emptySmall: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  annCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  annHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  annAuthor: { fontSize: font.small, color: colors.text, fontWeight: '600' },
  annTime: { fontSize: font.small, color: colors.textMuted },
  annTitle: { fontSize: font.body, fontWeight: '700', color: colors.text, marginBottom: 4 },
  annBody: { fontSize: font.caption, color: colors.textSecondary, lineHeight: 20 },
});
