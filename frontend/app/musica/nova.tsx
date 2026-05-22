import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/api/client';
import { colors, radius, font, spacing } from '@/src/theme';

export default function NovaMusica() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [key, setKey] = useState('');
  const [bpm, setBpm] = useState('');
  const [youtube, setYoutube] = useState('');
  const [cifra, setCifra] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim()) { Alert.alert('Atenção', 'Informe o título'); return; }
    setSaving(true);
    try {
      await api('/songs', {
        method: 'POST',
        body: {
          title: title.trim(),
          artist: artist.trim(),
          key: key.trim(),
          bpm: bpm ? parseInt(bpm, 10) : null,
          youtube_url: youtube.trim(),
          cifra_url: cifra.trim(),
          lyrics,
        },
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity testID="back-button" onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nova Música</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Field label="TÍTULO">
            <TextInput value={title} onChangeText={setTitle} placeholder="Nome da música" style={styles.input} placeholderTextColor={colors.textMuted} testID="song-title-input" />
          </Field>
          <Field label="ARTISTA">
            <TextInput value={artist} onChangeText={setArtist} placeholder="Cantor / banda" style={styles.input} placeholderTextColor={colors.textMuted} testID="song-artist-input" />
          </Field>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Field label="TOM" style={{ flex: 1 }}>
              <TextInput value={key} onChangeText={setKey} placeholder="Ex: G" style={styles.input} placeholderTextColor={colors.textMuted} testID="song-key-input" />
            </Field>
            <Field label="BPM" style={{ flex: 1 }}>
              <TextInput value={bpm} onChangeText={setBpm} placeholder="120" keyboardType="number-pad" style={styles.input} placeholderTextColor={colors.textMuted} testID="song-bpm-input" />
            </Field>
          </View>
          <Field label="LINK DO YOUTUBE">
            <TextInput value={youtube} onChangeText={setYoutube} placeholder="https://youtube.com/..." style={styles.input} placeholderTextColor={colors.textMuted} autoCapitalize="none" testID="song-youtube-input" />
          </Field>
          <Field label="LINK DA CIFRA">
            <TextInput value={cifra} onChangeText={setCifra} placeholder="https://cifraclub.com.br/..." style={styles.input} placeholderTextColor={colors.textMuted} autoCapitalize="none" testID="song-cifra-input" />
          </Field>
          <Field label="LETRA">
            <TextInput value={lyrics} onChangeText={setLyrics} placeholder="Letra da música..." style={[styles.input, { minHeight: 120, textAlignVertical: 'top' }]} multiline placeholderTextColor={colors.textMuted} testID="song-lyrics-input" />
          </Field>

          <TouchableOpacity
            testID="save-song-button"
            style={[styles.submit, saving && { opacity: 0.6 }]}
            onPress={submit}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Salvar Música</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children, style }: any) {
  return (
    <View style={[{ marginBottom: spacing.md }, style]}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: font.h3, fontWeight: '700', color: colors.text },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  label: { fontSize: font.small, fontWeight: '700', color: colors.textSecondary, letterSpacing: 1, marginBottom: 6 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 14, fontSize: font.body, color: colors.text },
  submit: { backgroundColor: colors.primary, borderRadius: radius.full, paddingVertical: 16, alignItems: 'center', marginTop: spacing.md },
  submitText: { color: '#fff', fontSize: font.body, fontWeight: '600' },
});
