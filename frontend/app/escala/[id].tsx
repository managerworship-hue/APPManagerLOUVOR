import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/api/client';
import { useAuth } from '@/src/context/AuthContext';
import { colors, radius, font, spacing } from '@/src/theme';
import { formatDate } from '@/src/utils/date';

type Scale = {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  notes: string;
  song_ids: string[];
  musician_ids: string[];
};

type Song = { id: string; title: string; artist: string; key: string; bpm: number | null };
type Member = { id: string; name: string; instruments: string[] };

export default function ScaleDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { hasPermission } = useAuth();
  const [scale, setScale] = useState<Scale | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [sc, s, m] = await Promise.all([
        api<Scale>(`/scales/${id}`),
        api<Song[]>('/songs'),
        api<Member[]>('/ministry/members'),
      ]);
      setScale(sc);
      setSongs(s);
      setMembers(m);
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Não foi possível carregar');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  const onDelete = () => {
    Alert.alert('Excluir escala', 'Esta ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        try {
          await api(`/scales/${id}`, { method: 'DELETE' });
          router.back();
        } catch (e: any) { Alert.alert('Erro', e.message); }
      } },
    ]);
  };

  if (loading || !scale) {
    return (
      <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
    );
  }

  const setlist = scale.song_ids.map(sid => songs.find(s => s.id === sid)).filter(Boolean) as Song[];
  const musicians = scale.musician_ids.map(mid => members.find(m => m.id === mid)).filter(Boolean) as Member[];
  const canEdit = hasPermission('edit_scales');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity testID="back-button" onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Escala</Text>
        {canEdit ? (
          <TouchableOpacity testID="delete-scale-button" onPress={onDelete} style={styles.headerBtn}>
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        ) : <View style={{ width: 44 }} />}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>EVENTO</Text>
          <Text style={styles.heroTitle}>{scale.title}</Text>
          <View style={styles.heroMeta}>
            <Ionicons name="calendar-outline" size={14} color={colors.gold} />
            <Text style={styles.heroMetaText}>{formatDate(scale.date)}{scale.time ? `  ·  ${scale.time}` : ''}</Text>
          </View>
          {scale.location ? (
            <View style={styles.heroMeta}>
              <Ionicons name="location-outline" size={14} color={colors.gold} />
              <Text style={styles.heroMetaText}>{scale.location}</Text>
            </View>
          ) : null}
        </View>

        {scale.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observações</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{scale.notes}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Repertório ({setlist.length})</Text>
          {setlist.length === 0 ? (
            <Text style={styles.muted}>Sem músicas atribuídas</Text>
          ) : setlist.map((s, idx) => (
            <TouchableOpacity
              key={s.id}
              style={styles.songRow}
              onPress={() => router.push(`/musica/${s.id}`)}
              testID={`detail-song-${s.id}`}
            >
              <Text style={styles.songNum}>{String(idx + 1).padStart(2, '0')}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.songTitle}>{s.title}</Text>
                {s.artist ? <Text style={styles.songArtist}>{s.artist}</Text> : null}
              </View>
              <View style={styles.songMeta}>
                {s.key ? <Text style={styles.songKey}>{s.key}</Text> : null}
                {s.bpm ? <Text style={styles.songBpm}>{s.bpm}bpm</Text> : null}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Músicos ({musicians.length})</Text>
          {musicians.length === 0 ? (
            <Text style={styles.muted}>Sem músicos atribuídos</Text>
          ) : (
            <View style={styles.musiciansWrap}>
              {musicians.map((m) => (
                <View key={m.id} style={styles.musician} testID={`detail-musician-${m.id}`}>
                  <View style={styles.mAvatar}>
                    <Text style={styles.mAvatarText}>{m.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.mName}>{m.name}</Text>
                  {m.instruments && m.instruments.length > 0 ? (
                    <Text style={styles.mInstrument}>{m.instruments.join(', ')}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: font.h3, fontWeight: '700', color: colors.text },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  hero: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  heroLabel: { fontSize: font.small, color: colors.gold, fontWeight: '700', letterSpacing: 1.5 },
  heroTitle: { fontSize: 24, color: '#fff', fontWeight: '700', marginTop: 4, marginBottom: spacing.sm, letterSpacing: -0.3 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  heroMetaText: { color: 'rgba(255,255,255,0.85)', fontSize: font.body },
  section: { marginBottom: spacing.lg },
  sectionTitle: { fontSize: font.h3, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  notesCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  notesText: { fontSize: font.body, color: colors.text, lineHeight: 22 },
  muted: { color: colors.textMuted, fontSize: font.caption },
  songRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border, marginBottom: 6,
  },
  songNum: { fontSize: font.small, fontWeight: '700', color: colors.gold, letterSpacing: 1, minWidth: 24 },
  songTitle: { fontSize: font.body, fontWeight: '600', color: colors.text },
  songArtist: { fontSize: font.small, color: colors.textSecondary, marginTop: 2 },
  songMeta: { alignItems: 'flex-end' },
  songKey: { fontSize: font.caption, fontWeight: '700', color: colors.text },
  songBpm: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  musiciansWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  musician: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
    minWidth: 100, flexGrow: 1,
  },
  mAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  mAvatarText: { color: '#fff', fontWeight: '700' },
  mName: { fontSize: font.caption, fontWeight: '600', color: colors.text },
  mInstrument: { fontSize: font.small, color: colors.textSecondary, marginTop: 2 },
});
