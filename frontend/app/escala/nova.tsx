import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/api/client';
import { DatePickerField, TimePickerField } from '@/src/components/DateTimePickerField';
import { colors, radius, font, spacing } from '@/src/theme';

type Song = { id: string; title: string; artist: string };
type Member = { id: string; name: string };

export default function NovaEscala() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedSongs, setSelectedSongs] = useState<string[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [s, m] = await Promise.all([
        api<Song[]>('/songs'),
        api<Member[]>('/ministry/members'),
      ]);
      setSongs(s);
      setMembers(m);
    })();
  }, []);

  const toggle = (arr: string[], setter: (v: string[]) => void, id: string) => {
    setter(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  };

  const validateDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

  const submit = async () => {
    if (!title.trim()) { Alert.alert('Atenção', 'Informe o título'); return; }
    if (!validateDate(date)) { Alert.alert('Atenção', 'Data inválida. Use AAAA-MM-DD'); return; }
    setSaving(true);
    try {
      await api('/scales', {
        method: 'POST',
        body: {
          title: title.trim(),
          date,
          time: time.trim(),
          location: location.trim(),
          notes: notes.trim(),
          song_ids: selectedSongs,
          musician_ids: selectedMembers,
        },
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Falha ao salvar');
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
        <Text style={styles.headerTitle}>Nova Escala</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Field label="TÍTULO" testID="scale-title-input">
            <TextInput value={title} onChangeText={setTitle} placeholder="Ex: Culto de Domingo" style={styles.input} placeholderTextColor={colors.textMuted} testID="scale-title-input-field" />
          </Field>

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Field label="DATA" testID="scale-date-input" style={{ flex: 1 }}>
              <DatePickerField value={date} onChange={setDate} testID="scale-date-input-field" />
            </Field>
            <Field label="HORÁRIO" testID="scale-time-input" style={{ flex: 1 }}>
              <TimePickerField value={time} onChange={setTime} testID="scale-time-input-field" />
            </Field>
          </View>

          <Field label="LOCAL" testID="scale-location-input">
            <TextInput value={location} onChangeText={setLocation} placeholder="Igreja principal" style={styles.input} placeholderTextColor={colors.textMuted} testID="scale-location-input-field" />
          </Field>

          <Field label="OBSERVAÇÕES" testID="scale-notes-input">
            <TextInput value={notes} onChangeText={setNotes} placeholder="Notas, instruções, etc." style={[styles.input, styles.textarea]} multiline numberOfLines={3} placeholderTextColor={colors.textMuted} testID="scale-notes-input-field" />
          </Field>

          <Text style={styles.sectionTitle}>Repertório ({selectedSongs.length})</Text>
          <View style={styles.chips}>
            {songs.length === 0 && <Text style={styles.muted}>Nenhuma música no repertório.</Text>}
            {songs.map((s) => {
              const sel = selectedSongs.includes(s.id);
              return (
                <TouchableOpacity
                  key={s.id}
                  testID={`pick-song-${s.id}`}
                  style={[styles.chip, sel && styles.chipSelected]}
                  onPress={() => toggle(selectedSongs, setSelectedSongs, s.id)}
                >
                  <Text style={[styles.chipText, sel && styles.chipTextSelected]} numberOfLines={1}>{s.title}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Músicos ({selectedMembers.length})</Text>
          <View style={styles.chips}>
            {members.map((m) => {
              const sel = selectedMembers.includes(m.id);
              return (
                <TouchableOpacity
                  key={m.id}
                  testID={`pick-member-${m.id}`}
                  style={[styles.chip, sel && styles.chipSelected]}
                  onPress={() => toggle(selectedMembers, setSelectedMembers, m.id)}
                >
                  <Text style={[styles.chipText, sel && styles.chipTextSelected]}>{m.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            testID="save-scale-button"
            style={[styles.submit, saving && { opacity: 0.6 }]}
            onPress={submit}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Salvar Escala</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children, style, testID }: any) {
  return (
    <View style={[{ marginBottom: spacing.md }, style]} testID={testID}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: font.h3, fontWeight: '700', color: colors.text },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  label: { fontSize: font.small, fontWeight: '700', color: colors.textSecondary, letterSpacing: 1, marginBottom: 6 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 14,
    fontSize: font.body, color: colors.text,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  sectionTitle: { fontSize: font.h3, fontWeight: '700', color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full, maxWidth: '100%' },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: font.caption, fontWeight: '500' },
  chipTextSelected: { color: '#fff', fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: font.caption },
  submit: { backgroundColor: colors.primary, borderRadius: radius.full, paddingVertical: 16, alignItems: 'center', marginTop: spacing.lg },
  submitText: { color: '#fff', fontSize: font.body, fontWeight: '600' },
});
