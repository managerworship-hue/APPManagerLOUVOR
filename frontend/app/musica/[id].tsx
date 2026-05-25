import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
  Linking, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/api/client';
import { useAuth } from '@/src/context/AuthContext';
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
  lyrics: string;
};

export default function SongDetail() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { hasPermission, isLeader } = useAuth();
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await api<Song>(`/songs/${id}`);
      setSong(r);
    } catch (e: any) {
      if (Platform.OS === 'web') { window.alert('Erro: ' + e.message); }
      else { Alert.alert('Erro', e.message); }
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  const openURL = async (url: string) => {
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) Linking.openURL(url);
    } catch {}
  };

  const onDelete = () => {
    const doDelete = async () => {
      try {
        await api(`/songs/${id}`, { method: 'DELETE' });
        router.back();
      } catch (e: any) {
        if (Platform.OS === 'web') { window.alert('Erro: ' + e.message); }
        else { Alert.alert('Erro', e.message); }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Excluir esta música? Esta ação não pode ser desfeita.')) doDelete();
    } else {
      Alert.alert('Excluir música', 'Esta ação não pode ser desfeita.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  if (loading || !song) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  const canEdit = isLeader;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity testID="back-button" onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Música</Text>
        {canEdit ? (
          <View style={styles.headerActions}>
            {/* item 6: botão de editar música */}
            <TouchableOpacity
              testID="edit-song-button"
              onPress={() => router.push(`/musica/nova?edit=${id}`)}
              style={styles.headerBtn}
            >
              <Ionicons name="pencil-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity testID="delete-song-button" onPress={onDelete} style={styles.headerBtn}>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={styles.noteCircle}>
            <Ionicons name="musical-note" size={28} color={colors.gold} />
          </View>
          <Text style={styles.title}>{song.title}</Text>
          {song.artist ? <Text style={styles.artist}>{song.artist}</Text> : null}
          <View style={styles.badges}>
            {song.key ? <View style={styles.badge}><Text style={styles.badgeText}>Tom: {song.key}</Text></View> : null}
            {song.bpm ? <View style={[styles.badge, { backgroundColor: '#F2EBDB' }]}><Text style={[styles.badgeText, { color: colors.gold }]}>{song.bpm} BPM</Text></View> : null}
          </View>
        </View>

        {(song.youtube_url || song.cifra_url) && (
          <View style={styles.links}>
            {song.youtube_url ? (
              <TouchableOpacity testID="open-youtube-button" style={[styles.linkBtn, { backgroundColor: '#9B2C2C' }]} onPress={() => openURL(song.youtube_url)}>
                <Ionicons name="logo-youtube" size={18} color="#fff" />
                <Text style={styles.linkBtnText}>YouTube</Text>
              </TouchableOpacity>
            ) : null}
            {song.cifra_url ? (
              <TouchableOpacity testID="open-cifra-button" style={[styles.linkBtn, { backgroundColor: colors.primary }]} onPress={() => openURL(song.cifra_url)}>
                <Ionicons name="document-text-outline" size={18} color="#fff" />
                <Text style={styles.linkBtnText}>Cifra</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {song.lyrics ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Letra</Text>
            <View style={styles.lyricsCard}>
              <Text style={styles.lyricsText}>{song.lyrics}</Text>
            </View>
          </View>
        ) : null}

        {/* Botão editar no rodapé para acesso rápido */}
        {canEdit && (
          <TouchableOpacity
            testID="edit-song-bottom-button"
            style={styles.editBtn}
            onPress={() => router.push(`/musica/nova?edit=${id}`)}
            activeOpacity={0.85}
          >
            <Ionicons name="pencil-outline" size={18} color="#fff" />
            <Text style={styles.editBtnText}>Editar Música</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: font.h3, fontWeight: '700', color: colors.text },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  hero: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  noteCircle: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#F2EBDB', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, textAlign: 'center', letterSpacing: -0.3 },
  artist: { fontSize: font.body, color: colors.textSecondary, marginTop: 4 },
  badges: { flexDirection: 'row', gap: 8, marginTop: spacing.sm },
  badge: { backgroundColor: colors.bg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  badgeText: { fontSize: font.caption, color: colors.text, fontWeight: '600' },
  links: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  linkBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: radius.full },
  linkBtnText: { color: '#fff', fontWeight: '600' },
  section: { marginBottom: spacing.lg },
  sectionTitle: { fontSize: font.h3, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  lyricsCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  lyricsText: { fontSize: font.body, color: colors.text, lineHeight: 24 },
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: radius.full, paddingVertical: 16, marginTop: spacing.sm },
  editBtnText: { color: '#fff', fontSize: font.body, fontWeight: '600' },
});
