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
type SelectedMember = { id: string; instrument: string };

function showAlert(msg: string) {
  if (Platform.OS === 'web') window.alert(msg);
  else Alert.alert('Atenção', msg);
}

export default function NovaEscala() {
  const router = useRouter();
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
  const [selectedMembers, setSelectedMembers] = useState<SelectedMember[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const [songModal, setSongModal] = useState(false);
  const [songQuery, setSongQuery] = useState('');
  const [memberModal, setMemberModal] = useState(false);
  const [memberQuery, setMemberQuery] = useState('');
  const [instrumentModal, setInstrumentModal] = useState(false);
  const [pendingMember, setPendingMember] = useState<Member | null>(null);

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [s, m] = await Promise.all([
        api<Song[]>('/songs'),
        api<Member[]>('/ministry/members'),
      ]);
      setSongs(s);
      setMembers(m);
      if (editId) {
        const scale = await api<any>(`/scales/${editId}`);
        setTitle(scale.title ?? '');
        setDate(scale.date ?? '');
        setTime(scale.time ?? '');
        setLocation(scale.location ?? '');
        setNotes(scale.notes ?? '');
        setSelectedSongs(scale.song_ids ?? []);
        const instruments: Record<string, string> = scale.musician_instruments ?? {};
        setSelectedMembers((scale.musician_ids ?? []).map((id: string) => ({
          id,
          instrument: instruments[id] ?? '',
        })));
      }
    } catch (e: any) {
      showAlert('Erro ao carregar: ' + (e.message || ''));
    } finally {
      setLoadingData(false);
    }
  }, [editId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const toggleSong = (id: string) =>
    setSelectedSongs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleMemberTap = (member: Member) => {
    const already = selectedMembers.find(x => x.id === member.id);
    if (already) {
      setSelectedMembers(prev => prev.filter(x => x.id !== member.id));
    } else if (member.instruments && member.instruments.length > 0) {
      setPendingMember(member);
      setInstrumentModal(true);
    } else {
      setSelectedMembers(prev => [...prev, { id: member.id, instrument: '' }]);
    }
  };

  const confirmInstrument = (instrument: string) => {
    if (!pendingMember) return;
    setSelectedMembers(prev => [...prev, { id: pendingMember.id, instrument }]);
    setPendingMember(null);
    setInstrumentModal(false);
  };

  const submit = async () => {
    if (!title.trim()) { showAlert('Informe o título'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { showAlert('Data inválida. Use AAAA-MM-DD'); return; }
    setSaving(true);
    try {
      // Monta dicionário instrumento por músico para guardar na escala (item 3)
      const musician_instruments: Record<string, string> = {};
      selectedMembers.forEach(({ id, instrument }) => {
        if (instrument) musician_instruments[id] = instrument;
      });
      const body = {
        title: title.trim(), date,
        time: time.trim(), location: location.trim(), notes: notes.trim(),
        song_ids: selectedSongs,
        musician_ids: selectedMembers.map(m => m.id),
        musician_instruments,
      };
      if (isEditing) {
        await api(`/scales/${editId}`, { method: 'PUT', body });
      } else {
        await api('/scales', { method: 'POST', body });
      }
      router.back();
    } catch (e: any) {
      showAlert('Erro: ' + (e.message || 'Falha ao guardar'));
    } finally {
      setSaving(false);
    }
  };

  const filteredSongs = songQuery.trim()
    ? songs.filter(s => s.title.toLowerCase().includes(songQuery.toLowerCase()) || (s.artist || '').toLowerCase().includes(songQuery.toLowerCase()))
    : songs;

  const filteredMembers = memberQuery.trim()
    ? members.filter(m => m.name.toLowerCase().includes(memberQuery.toLowerCase()))
    : members;

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

          <Field label="TÍTULO"><TextInput value={title} onChangeText={setTitle} placeholder="Ex: Culto de Domingo" style={styles.input} placeholderTextColor={colors.textMuted} /></Field>

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Field label="DATA" style={{ flex: 1 }}><DatePickerField value={date} onChange={setDate} /></Field>
            <Field label="HORÁRIO" style={{ flex: 1 }}><TimePickerField value={time} onChange={setTime} /></Field>
          </View>

          <Field label="LOCAL"><TextInput value={location} onChangeText={setLocation} placeholder="Igreja principal" style={styles.input} placeholderTextColor={colors.textMuted} /></Field>
          <Field label="OBSERVAÇÕES"><TextInput value={notes} onChangeText={setNotes} placeholder="Notas, instruções..." style={[styles.input, styles.textarea]} multiline numberOfLines={3} placeholderTextColor={colors.textMuted} /></Field>

          {/* Repertório */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Repertório ({selectedSongs.length})</Text>
            {selectedSongs.length > 0 && <TouchableOpacity onPress={() => setSelectedSongs([])}><Text style={styles.clearText}>Limpar</Text></TouchableOpacity>}
          </View>
          {selectedSongs.length > 0 && (
            <View style={styles.tagsWrap}>
              {selectedSongs.map(id => {
                const song = songs.find(s => s.id === id);
                if (!song) return null;
                return (
                  <View key={id} style={styles.tag}>
                    <Text style={styles.tagText} numberOfLines={1}>{song.title}</Text>
                    <TouchableOpacity onPress={() => toggleSong(id)}><Ionicons name="close-circle" size={14} color={colors.primary} /></TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
          <TouchableOpacity style={styles.addBox} onPress={() => { setSongQuery(''); setSongModal(true); }}>
            <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
            <Text style={styles.addBoxText}>{songs.length === 0 ? 'Nenhuma música cadastrada' : 'Selecionar músicas'}</Text>
          </TouchableOpacity>

          {/* Músicos */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Músicos ({selectedMembers.length})</Text>
            {selectedMembers.length > 0 && <TouchableOpacity onPress={() => setSelectedMembers([])}><Text style={styles.clearText}>Limpar</Text></TouchableOpacity>}
          </View>
          {selectedMembers.length > 0 && (
            <View style={styles.tagsWrap}>
              {selectedMembers.map(({ id, instrument }) => {
                const member = members.find(m => m.id === id);
                if (!member) return null;
                return (
                  <View key={id} style={styles.tag}>
                    <View>
                      <Text style={styles.tagText}>{member.name}</Text>
                      {instrument ? <Text style={styles.tagSub}>{instrument}</Text> : null}
                    </View>
                    <TouchableOpacity onPress={() => setSelectedMembers(prev => prev.filter(x => x.id !== id))}><Ionicons name="close-circle" size={14} color={colors.primary} /></TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
          <TouchableOpacity style={styles.addBox} onPress={() => { setMemberQuery(''); setMemberModal(true); }}>
            <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
            <Text style={styles.addBoxText}>{members.length === 0 ? 'Nenhum membro no ministério' : 'Selecionar músicos'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.submit, saving && { opacity: 0.6 }]} onPress={submit} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{isEditing ? 'Guardar Alterações' : 'Guardar Escala'}</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal músicas */}
      <Modal visible={songModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSongModal(false)}>
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSongModal(false)} style={styles.headerBtn}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
            <Text style={styles.modalTitle}>Repertório</Text>
            <TouchableOpacity onPress={() => setSongModal(false)} style={styles.headerBtn}><Text style={styles.doneText}>Concluído</Text></TouchableOpacity>
          </View>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput value={songQuery} onChangeText={setSongQuery} placeholder="Buscar música..." placeholderTextColor={colors.textMuted} style={styles.searchInput} autoFocus />
            {songQuery ? <TouchableOpacity onPress={() => setSongQuery('')}><Ionicons name="close-circle" size={16} color={colors.textMuted} /></TouchableOpacity> : null}
          </View>
          <FlatList
            data={filteredSongs}
            keyExtractor={i => i.id}
            contentContainerStyle={{ paddingBottom: 32 }}
            ListEmptyComponent={<View style={styles.emptyModal}><Text style={styles.muted}>Nenhuma música encontrada.</Text></View>}
            renderItem={({ item }) => {
              const sel = selectedSongs.includes(item.id);
              return (
                <TouchableOpacity style={[styles.modalItem, sel && styles.modalItemSelected]} onPress={() => toggleSong(item.id)}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalItemTitle, sel && { color: colors.primary }]} numberOfLines={1}>{item.title}</Text>
                    {item.artist ? <Text style={styles.modalItemSub}>{item.artist}</Text> : null}
                  </View>
                  {sel && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>

      {/* Modal músicos */}
      <Modal visible={memberModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setMemberModal(false)}>
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setMemberModal(false)} style={styles.headerBtn}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
            <Text style={styles.modalTitle}>Músicos</Text>
            <TouchableOpacity onPress={() => setMemberModal(false)} style={styles.headerBtn}><Text style={styles.doneText}>Concluído</Text></TouchableOpacity>
          </View>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput value={memberQuery} onChangeText={setMemberQuery} placeholder="Buscar membro..." placeholderTextColor={colors.textMuted} style={styles.searchInput} autoFocus />
            {memberQuery ? <TouchableOpacity onPress={() => setMemberQuery('')}><Ionicons name="close-circle" size={16} color={colors.textMuted} /></TouchableOpacity> : null}
          </View>
          <FlatList
            data={filteredMembers}
            keyExtractor={i => i.id}
            contentContainerStyle={{ paddingBottom: 32 }}
            ListEmptyComponent={<View style={styles.emptyModal}><Text style={styles.muted}>Nenhum membro encontrado.</Text></View>}
            renderItem={({ item }) => {
              const sel = selectedMembers.find(x => x.id === item.id);
              return (
                <TouchableOpacity style={[styles.modalItem, sel && styles.modalItemSelected]} onPress={() => handleMemberTap(item)}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalItemTitle, sel && { color: colors.primary }]}>{item.name}</Text>
                    {item.instruments && item.instruments.length > 0
                      ? <Text style={styles.modalItemSub}>{item.instruments.join(' · ')}</Text>
                      : <Text style={[styles.modalItemSub, { fontStyle: 'italic' }]}>Sem instrumentos definidos</Text>}
                    {sel?.instrument ? <Text style={styles.modalItemInstrument}>✓ {sel.instrument}</Text> : null}
                  </View>
                  {sel && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>

      {/* Modal instrumento */}
      <Modal visible={instrumentModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setInstrumentModal(false); setPendingMember(null); }}>
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setInstrumentModal(false); setPendingMember(null); }} style={styles.headerBtn}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
            <Text style={styles.modalTitle}>Instrumento</Text>
            <View style={{ width: 44 }} />
          </View>
          <Text style={styles.instrumentSubtitle}>Qual instrumento {pendingMember?.name} vai tocar?</Text>
          <FlatList
            data={pendingMember?.instruments ?? []}
            keyExtractor={i => i}
            contentContainerStyle={{ padding: spacing.md, gap: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.instrumentOption} onPress={() => confirmInstrument(item)}>
                <Ionicons name="musical-notes-outline" size={18} color={colors.primary} />
                <Text style={styles.instrumentOptionText}>{item}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerBtn: { minWidth: 44, height: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  headerTitle: { fontSize: font.h3, fontWeight: '700', color: colors.text },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  label: { fontSize: font.small, fontWeight: '700', color: colors.textSecondary, letterSpacing: 1, marginBottom: 6 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 14, fontSize: font.body, color: colors.text },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  sectionTitle: { fontSize: font.h3, fontWeight: '700', color: colors.text },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.sm },
  clearText: { fontSize: font.small, color: colors.error, fontWeight: '600' },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EDF2FF', borderWidth: 1, borderColor: colors.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full },
  tagText: { fontSize: font.small, color: colors.primary, fontWeight: '600' },
  tagSub: { fontSize: 10, color: colors.primary, opacity: 0.75 },
  addBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: colors.primary, borderStyle: 'dashed', borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: spacing.md, backgroundColor: '#F7F9FF', marginBottom: spacing.sm },
  addBoxText: { fontSize: font.body, color: colors.primary, fontWeight: '600' },
  submit: { backgroundColor: colors.primary, borderRadius: radius.full, paddingVertical: 16, alignItems: 'center', marginTop: spacing.lg },
  submitText: { color: '#fff', fontSize: font.body, fontWeight: '600' },
  muted: { color: colors.textMuted, fontSize: font.caption },
  modalSafe: { flex: 1, backgroundColor: colors.bg },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: font.h3, fontWeight: '700', color: colors.text, flex: 1, textAlign: 'center' },
  doneText: { fontSize: font.body, color: colors.primary, fontWeight: '700' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: font.body, color: colors.text },
  emptyModal: { padding: spacing.lg, alignItems: 'center' },
  modalItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalItemSelected: { backgroundColor: '#F0F4FF' },
  modalItemTitle: { fontSize: font.body, fontWeight: '600', color: colors.text },
  modalItemSub: { fontSize: font.caption, color: colors.textSecondary, marginTop: 2 },
  modalItemInstrument: { fontSize: font.small, color: colors.primary, fontWeight: '600', marginTop: 2 },
  instrumentSubtitle: { fontSize: font.body, color: colors.textSecondary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  instrumentOption: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 16 },
  instrumentOptionText: { flex: 1, fontSize: font.body, color: colors.text, fontWeight: '600' },
});
