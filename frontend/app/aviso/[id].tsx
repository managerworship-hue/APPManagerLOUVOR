import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/api/client';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { radius, font, spacing } from '@/src/theme';
import { formatRelative } from '@/src/utils/date';

type Announcement = {
  id: string;
  title: string;
  body: string;
  author_name: string;
  created_at: string;
};

export default function AvisoDetail() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isLeader } = useAuth();
  const [aviso, setAviso] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      // Carrega todos os avisos e filtra pelo id (a API não tem GET /announcements/:id)
      const all = await api<Announcement[]>('/announcements');
      const found = all.find(a => a.id === id);
      if (!found) throw new Error('Aviso não encontrado');
      setAviso(found);
      setEditTitle(found.title);
      setEditBody(found.body);
    } catch (e: any) {
      if (Platform.OS === 'web') { window.alert('Erro: ' + e.message); }
      else { Alert.alert('Erro', e.message); }
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  const onDelete = () => {
    const doDelete = async () => {
      try {
        await api(`/announcements/${id}`, { method: 'DELETE' });
        router.back();
      } catch (e: any) {
        if (Platform.OS === 'web') { window.alert('Erro: ' + e.message); }
        else { Alert.alert('Erro', e.message); }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Excluir este aviso? Esta ação não pode ser desfeita.')) doDelete();
    } else {
      Alert.alert('Excluir aviso', 'Esta ação não pode ser desfeita.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const onSave = async () => {
    if (!editTitle.trim() || !editBody.trim()) {
      if (Platform.OS === 'web') { window.alert('Preencha o título e a mensagem'); }
      else { Alert.alert('Atenção', 'Preencha o título e a mensagem'); }
      return;
    }
    setSaving(true);
    try {
      await api(`/announcements/${id}`, {
        method: 'PUT',
        body: { title: editTitle.trim(), body: editBody.trim() },
      });
      setAviso(prev => prev ? { ...prev, title: editTitle.trim(), body: editBody.trim() } : prev);
      setEditing(false);
    } catch (e: any) {
      if (Platform.OS === 'web') { window.alert('Erro: ' + (e.message || 'Falha ao guardar')); }
      else { Alert.alert('Erro', e.message || 'Falha ao guardar'); }
    } finally {
      setSaving(false);
    }
  };

  if (loading || !aviso) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity testID="back-button" onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Aviso</Text>
        {isLeader ? (
          <View style={styles.headerActions}>
            {editing ? (
              <TouchableOpacity
                onPress={() => setEditing(false)}
                style={styles.headerBtn}
                disabled={saving}
              >
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                testID="edit-aviso-button"
                onPress={() => setEditing(true)}
                style={styles.headerBtn}
              >
                <Ionicons name="pencil-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity testID="delete-aviso-button" onPress={onDelete} style={styles.headerBtn}>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Cabeçalho do aviso */}
          <View style={styles.metaRow}>
            <View style={styles.metaIcon}>
              <Ionicons name="megaphone" size={16} color={colors.gold} />
            </View>
            <View>
              <Text style={styles.author}>{aviso.author_name}</Text>
              <Text style={styles.time}>{formatRelative(aviso.created_at)}</Text>
            </View>
          </View>

          {editing ? (
            /* Modo edição */
            <View style={styles.editSection}>
              <Text style={styles.fieldLabel}>TÍTULO</Text>
              <TextInput
                testID="edit-aviso-title"
                value={editTitle}
                onChangeText={setEditTitle}
                style={styles.input}
                placeholderTextColor={colors.textMuted}
                placeholder="Título do aviso"
              />

              <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>MENSAGEM</Text>
              <TextInput
                testID="edit-aviso-body"
                value={editBody}
                onChangeText={setEditBody}
                style={[styles.input, styles.textarea]}
                placeholderTextColor={colors.textMuted}
                placeholder="Mensagem completa..."
                multiline
              />

              <TouchableOpacity
                testID="save-aviso-button"
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={onSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>Guardar Alterações</Text>
                }
              </TouchableOpacity>
            </View>
          ) : (
            /* Modo leitura */
            <View>
              <Text style={styles.avisoTitle}>{aviso.title}</Text>
              <View style={styles.bodyCard}>
                <Text style={styles.avisoBody}>{aviso.body}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  metaIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#F2EBDB', alignItems: 'center', justifyContent: 'center' },
  author: { fontSize: font.body, fontWeight: '700', color: colors.text },
  time: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  avisoTitle: { fontSize: 22, fontWeight: '700', color: colors.text, letterSpacing: -0.3, marginBottom: spacing.md },
  bodyCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  avisoBody: { fontSize: font.body, color: colors.text, lineHeight: 24 },
  editSection: { gap: 0 },
  fieldLabel: { fontSize: font.small, fontWeight: '700', color: colors.textSecondary, letterSpacing: 1, marginBottom: 6 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 14, fontSize: font.body, color: colors.text },
  textarea: { minHeight: 160, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.full, paddingVertical: 16, alignItems: 'center', marginTop: spacing.lg },
  saveBtnText: { color: '#fff', fontSize: font.body, fontWeight: '600' },
});
