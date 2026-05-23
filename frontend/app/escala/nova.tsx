import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
  Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/api/client';
import { DatePickerField, TimePickerField } from '@/src/components/DateTimePickerField';
import { colors, radius, font, spacing } from '@/src/theme';

type Song = { id: string; title: string; artist: string };
type Member = { id: string; name: string; instruments?: string[] };

export default function NovaEscala() {
  const router = useRouter();
  // Suporta modo edição: /escala/nova?edit=SCALE_ID
  const params = useLocalSearchParams<{ edit?: string }>();
  const editId = params.edit ?? null;
  const isEditing = !!editId;

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
  const [loadingData, setLoadingData] = useState(true);

  // Modal de músicas (item 2)
  const [songModalVisible, setSongModalVisible] = useState(false);
  const [songQuery, setSongQuery] = useState('');

  // Modal de músicos
  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [memberQuery, setMemberQuery] = useState('');

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [s, m] = await Promise.all([
        api<Song[]>('/songs'),
        api<Member[]>('/ministry/members'),
      ]);
      setSongs(s);
      setMembers(m);

      // Se está a editar, carrega os dados da escala
      if (editId) {
        const scale = await api<any>(`/scales/${editId}`);
        setTitle(scale.title ?? '');
        setDate(scale.date ?? '');
        setTime(scale.time ?? '');
        setLocation(scale.location ?? '');
        setNotes(scale.notes ?? '');
        setSelectedSongs(scale.song_ids ?? []);
        setSelectedMembers(scale.musician_ids ?? []);
      }
    } catch (e: any) {
      if (Platform.OS === 'web') {
        window.alert('Erro ao carregar dados: ' + (e.message || ''));
      } else {
        Alert.alert('Erro', e.message || 'Falha ao carregar dados');
      }
    } finally {
      setLoadingData(false);
    }
  }, [editId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const toggle = (arr: string[], setter: (v: string[]) => void, id: string) => {
    setter(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  };

  const validateDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

  const submit = async () => {
    if (!title.trim()) {
      if (Platform.OS === 'web') { window.alert('Informe o título'); } else { Alert.alert('Atenção', 'Informe o título'); }
      return;
    }
    if (!validateDate(date)) {
      if (Platform.OS === 'web') { window.alert('Data inválida. Use AAAA-MM-DD'); } else { Alert.alert('Atenção', 'Data inválida. Use AAAA-MM-DD'); }
      return;
    }
    setSaving(true);
    try {
      const body = {
        title: title.trim(),
        date,
        time: time.trim(),
        location: location.trim(),
        notes: notes.trim(),
        song_ids: selectedSongs,
        musician_ids: selectedMembers,
      };
      if (isEditing) {
        await api(`/scales/${editId}`, { method: 'PUT', body });
      } else {
        await api('/scales', { method: 'POST', body });
      }
      router.back();
    } catch (e: any) {
      if (Platform.OS === 'web') { window.alert('Erro: ' + (e.message || 'Falha ao guardar')); } else { Alert.alert('Erro', e.message || 'Falha ao guardar'); }
    } finally {
      setSaving(false);
    }
  };

  // Músicas filtradas no modal
  const filteredSongs = songQuery.trim()
    ? songs.filter(s =>
        s.title.toLowerCase().includes(songQuery.toLowerCase()) ||
        (s.artist || '').toLowerCase().includes(songQuery.toLowerCase())
      )
    : songs;

  // Membros filtrados no modal
  const filteredMembers = memberQuery.trim()
    ? members.filter(m => m.name.toLowerCase().includes(memberQuery.toLowerCase()))
    : members;

  // Nomes das músicas selecionadas para exibir
  const selectedSongNames = selectedSongs
    .map(id => songs.find(s => s.id === id)?.title)
    .filter(Boolean) as string[];

  const selectedMemberNames = selectedMembers
    .map(id => members.find(m => m.id === id)?.name)
    .filter(Boolean) as string[];

  if (loadingData) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity testID="back-button" onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Editar Escala' : 'Nova Escala'}</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <Field label="TÍTULO" testID="scale-title-input">
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Ex: Culto de Domingo"
              style={styles.input}
              placeholderTextColor={colors.textMuted}
              testID="scale-title-input-field"
            />
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
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="Igreja principal"
              style={styles.input}
              placeholderTextColor={colors.textMuted}
              testID="scale-location-input-field"
            />
          </Field>

          <Field label="OBSERVAÇÕES" testID="scale-notes-input">
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Notas, instruções, etc."
              style={[styles.input, styles.textarea]}
              multiline
              numberOfLines={3}
              placeholderTextColor={colors.textMuted}
              testID="scale-notes-input-field"
            />
          </Field>

          {/* REPERTÓRIO — caixa com + (item 2) */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Repertório ({selectedSongs.length})</Text>
            {selectedSongs.length > 0 && (
              <TouchableOpacity onPress={() => setSelectedSongs([])} style={styles.clearBtn} testID="clear-selected-songs">
                <Text style={styles.clearBtnText}>Limpar</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Músicas selecionadas como tags */}
          {selectedSongNames.length > 0 && (
            <View style={styles.tagsWrap}>
              {selectedSongs.map((id) => {
                const song = songs.find(s => s.id === id);
                if (!song) return null;
                return (
                  <View key={id} style={styles.tag}>
                    <Text style={styles.tagText} numberOfLines={1}>{song.title}</Text>
                    <TouchableOpacity onPress={() => toggle(selectedSongs, setSelectedSongs, id)}>
                      <Ionicons name="close-circle" size={14} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {/* Botão + para abrir modal de músicas */}
          <TouchableOpacity
            testID="open-song-picker"
            style={styles.addBox}
            onPress={() => { setSongQuery(''); setSongModalVisible(true); }}
            activeOpacity={0.75}
          >
            <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
            <Text style={styles.addBoxText}>
              {songs.length === 0 ? 'Nenhuma música cadastrada' : 'Selecionar músicas'}
            </Text>
          </TouchableOpacity>

          {/* MÚSICOS */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Músicos ({selectedMembers.length})</Text>
            {selectedMembers.length > 0 && (
              <TouchableOpacity onPress={() => setSelectedMembers([])} style={styles.clearBtn} testID="clear-selected-members">
                <Text style={styles.clearBtnText}>Limpar</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Membros selecionados como tags */}
          {selectedMembers.length > 0 && (
            <View style={styles.tagsWrap}>
              {selectedMembers.map((id) => {
                const member = members.find(m => m.id === id);
                if (!member) return null;
                return (
                  <View key={id} style={styles.tag}>
                    <Text style={styles.tagText}>{member.name}</Text>
                    <TouchableOpacity onPress={() => toggle(selectedMembers, setSelectedMembers, id)}>
                      <Ionicons name="close-circle" size={14} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          <TouchableOpacity
            testID="open-member-picker"
            style={styles.addBox}
            onPress={() => { setMemberQuery(''); setMemberModalVisible(true); }}
            activeOpacity={0.75}
          >
            <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
            <Text style={styles.addBoxText}>
              {members.length === 0 ? 'Nenhum membro no ministério' : 'Selecionar músicos'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="save-scale-button"
            style={[styles.submit, saving && { opacity: 0.6 }]}
            onPress={submit}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitText}>{isEditing ? 'Guardar Alterações' : 'Guardar Escala'}</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal de seleção de músicas (item 2) */}
      <Modal
        visible={songModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSongModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSongModalVisible(false)} style={styles.headerBtn}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Repertório</Text>
            <TouchableOpacity onPress={() => setSongModalVisible(false)} style={styles.headerBtn}>
              <Text style={styles.doneText}>Concluído</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              testID="search-songs-input"
              value={songQuery}
              onChangeText={setSongQuery}
              placeholder="Buscar música..."
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              autoFocus
            />
            {songQuery ? (
              <TouchableOpacity onPress={() => setSongQuery('')}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          {filteredSongs.length === 0 ? (
            <View style={styles.emptyModal}>
              <Text style={styles.muted}>Nenhuma música encontrada.</Text>
            </View>
          ) : (
            <FlatList
              data={filteredSongs}
              keyExtractor={(i) => i.id}
              contentContainerStyle={{ paddingBottom: 32 }}
              renderItem={({ item }) => {
                const sel = selectedSongs.includes(item.id);
                return (
                  <TouchableOpacity
                    testID={`pick-song-${item.id}`}
                    style={[styles.modalItem, sel && styles.modalItemSelected]}
                    onPress={() => toggle(selectedSongs, setSelectedSongs, item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modalItemTitle, sel && { color: colors.primary }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      {item.artist ? (
                        <Text style={styles.modalItemSub} numberOfLines={1}>{item.artist}</Text>
                      ) : null}
                    </View>
                    {sel && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Modal de seleção de músicos */}
      <Modal
        visible={memberModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setMemberModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setMemberModalVisible(false)} style={styles.headerBtn}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Músicos</Text>
            <TouchableOpacity onPress={() => setMemberModalVisible(false)} style={styles.headerBtn}>
              <Text style={styles.doneText}>Concluído</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              testID="search-members-input"
              value={memberQuery}
              onChangeText={setMemberQuery}
              placeholder="Buscar membro..."
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              autoFocus
            />
            {memberQuery ? (
              <TouchableOpacity onPress={() => setMemberQuery('')}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          {filteredMembers.length === 0 ? (
            <View style={styles.emptyModal}>
              <Text style={styles.muted}>Nenhum membro encontrado.</Text>
            </View>
          ) : (
            <FlatList
              data={filteredMembers}
              keyExtractor={(i) => i.id}
              contentContainerStyle={{ paddingBottom: 32 }}
              renderItem={({ item }) => {
                const sel = selectedMembers.includes(item.id);
                return (
                  <TouchableOpacity
                    testID={`pick-member-${item.id}`}
                    style={[styles.modalItem, sel && styles.modalItemSelected]}
                    onPress={() => toggle(selectedMembers, setSelectedMembers, item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modalItemTitle, sel && { color: colors.primary }]}>
                        {item.name}
                      </Text>
                      {item.instruments && item.instruments.length > 0 && (
                        <Text style={styles.modalItemSub}>{item.instruments.join(' · ')}</Text>
                      )}
                    </View>
                    {sel && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </SafeAreaView>
      </Modal>
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
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
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
  sectionTitle: { fontSize: font.h3, fontWeight: '700', color: colors.text },
  sectionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: spacing.md, marginBottom: spacing.sm,
  },
  clearBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  clearBtnText: { fontSize: font.small, color: colors.error, fontWeight: '600' },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EDF2FF',
    borderWidth: 1, borderColor: colors.primary,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: radius.full,
    maxWidth: '100%',
  },
  tagText: { fontSize: font.small, color: colors.primary, fontWeight: '600' },
  addBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: 14, paddingHorizontal: spacing.md,
    backgroundColor: '#F7F9FF',
    marginBottom: spacing.sm,
  },
  addBoxText: { fontSize: font.body, color: colors.primary, fontWeight: '600' },
  submit: {
    backgroundColor: colors.primary, borderRadius: radius.full,
    paddingVertical: 16, alignItems: 'center', marginTop: spacing.lg,
  },
  submitText: { color: '#fff', fontSize: font.body, fontWeight: '600' },
  muted: { color: colors.textMuted, fontSize: font.caption },
  // Modal
  modalSafe: { flex: 1, backgroundColor: colors.bg },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.sm, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: font.h3, fontWeight: '700', color: colors.text },
  doneText: { fontSize: font.body, color: colors.primary, fontWeight: '700' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: font.body, color: colors.text },
  emptyModal: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  modalItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalItemSelected: { backgroundColor: '#F0F4FF' },
  modalItemTitle: { fontSize: font.body, fontWeight: '600', color: colors.text },
  modalItemSub: { fontSize: font.caption, color: colors.textSecondary, marginTop: 2 },
});
