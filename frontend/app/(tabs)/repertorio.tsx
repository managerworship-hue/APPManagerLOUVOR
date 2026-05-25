import React, { useCallback, useState, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, Modal, Alert, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/api/client';
import { useAuth } from '@/src/context/AuthContext';
import { storage } from '@/src/utils/storage';
import { useTheme } from '@/src/context/ThemeContext';
import { radius, font, spacing } from '@/src/theme';

type Song = {
  id: string;
  title: string;
  artist: string;
  key: string;
  bpm: number | null;
  youtube_url: string;
  cifra_url: string;
};

export default function RepertorioScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const router = useRouter();
  const { hasPermission, isLeader } = useAuth();
  const [items, setItems] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    try {
      // 1. Carregar instantaneamente do cache local
      const cached = (await storage.getItem('cached_songs', [] as any)) as Song[] | null;
      if (cached && cached.length > 0 && items.length === 0) {
        setItems(cached);
        setLoading(false);
      }

      // 2. Buscar dados frescos da API
      const r = await api<Song[]>('/songs');
      setItems(r);
      await storage.setItem('cached_songs', r as any);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [items.length]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((s) =>
      s.title.toLowerCase().includes(q) ||
      (s.artist || '').toLowerCase().includes(q)
    );
  }, [items, query]);

  const canEdit = isLeader;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Repertório</Text>
          <Text style={styles.subtitle}>{items.length} música{items.length !== 1 ? 's' : ''}</Text>
        </View>
        {canEdit && (
          <TouchableOpacity
            testID="new-song-button"
            style={styles.fabSmall}
            onPress={() => router.push('/musica/nova')}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={colors.textMuted} />
        <TextInput
          testID="search-songs-input"
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar por título ou artista"
          placeholderTextColor={colors.textMuted}
          style={styles.search}
        />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="musical-notes-outline" size={40} color={colors.textMuted} />
          <Text style={styles.emptyText}>
            {query ? 'Nenhuma música encontrada' : 'Nenhuma música no repertório'}
          </Text>
          {canEdit && !query && (
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push('/musica/nova')}
              testID="empty-new-song-button"
            >
              <Text style={styles.emptyBtnText}>Adicionar música</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              testID={`song-item-${item.id}`}
              style={styles.row}
              onPress={() => router.push(`/musica/${item.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.noteCircle}>
                <Ionicons name="musical-note" size={16} color={colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
                {item.artist ? (
                  <Text style={styles.songArtist} numberOfLines={1}>{item.artist}</Text>
                ) : null}
                <View style={styles.badges}>
                  {item.key ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Tom: {item.key}</Text>
                    </View>
                  ) : null}
                  {item.bpm ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.bpm} BPM</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <View style={styles.linkIcons}>
                {item.youtube_url ? <Ionicons name="logo-youtube" size={16} color={colors.error} /> : null}
                {item.cifra_url ? <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} /> : null}
              </View>
            </TouchableOpacity>
          )}
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
  fabSmall: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md, marginBottom: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  search: { flex: 1, fontSize: font.body, color: colors.text },
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
  noteCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F2EBDB',
    alignItems: 'center', justifyContent: 'center',
  },
  songTitle: { fontSize: font.body, fontWeight: '700', color: colors.text },
  songArtist: { fontSize: font.caption, color: colors.textSecondary, marginTop: 2 },
  badges: { flexDirection: 'row', gap: 6, marginTop: 6 },
  badge: { backgroundColor: colors.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  badgeText: { fontSize: font.small, color: colors.text, fontWeight: '600' },
  linkIcons: { flexDirection: 'row', gap: 8 },
});
