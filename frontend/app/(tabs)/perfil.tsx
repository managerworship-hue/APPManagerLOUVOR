import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Platform,
  Modal, FlatList, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import { api } from '@/src/api/client';
import { colors, radius, font, spacing } from '@/src/theme';

const INSTRUMENT_LIST = [
  'Violão', 'Guitarra', 'Baixo', 'Teclado', 'Piano', 'Bateria', 'Percussão',
  'Violino', 'Violoncelo', 'Flauta', 'Saxofone', 'Trompete', 'Trombone',
  'Voz (Soprano)', 'Voz (Contralto)', 'Voz (Tenor)', 'Voz (Barítono)',
  'Backing Vocal', 'Vocal Principal', 'Direção', 'Som/Técnico',
];

const AVATARS = [
  '🎵', '🎶', '🎸', '🎹', '🥁', '🎺', '🎻', '🎤',
  '🙏', '✝️', '🕊️', '⭐', '🌟', '💫', '🔥', '🌊',
  '🦁', '🦅', '🌿', '🌸', '🎯', '👑', '🛡️', '⚡',
];

export default function ProfileScreen() {
  const router = useRouter();
  const { user, ministry, isLeader, logout, setUser } = useAuth();

  const [instrumentModal, setInstrumentModal] = useState(false);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>(user?.instruments ?? []);
  const [savingInstruments, setSavingInstruments] = useState(false);

  const [avatarModal, setAvatarModal] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

  const confirmLogout = async () => {
    const doLogout = async () => { await logout(); router.replace('/login'); };
    if (Platform.OS === 'web') {
      if (window.confirm('Tem certeza que deseja sair da conta?')) doLogout();
    } else {
      Alert.alert('Sair', 'Tem certeza que deseja sair?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: doLogout },
      ]);
    }
  };

  const toggleInstrument = (inst: string) =>
    setSelectedInstruments(prev =>
      prev.includes(inst) ? prev.filter(i => i !== inst) : [...prev, inst]
    );

  const saveInstruments = async () => {
    setSavingInstruments(true);
    try {
      const updated = await api('/auth/me', { method: 'PUT', body: { instruments: selectedInstruments } });
      if (setUser) setUser(updated);
      setInstrumentModal(false);
    } catch (e: any) {
      if (Platform.OS === 'web') { window.alert('Erro: ' + (e.message || '')); }
      else { Alert.alert('Erro', e.message || 'Falha ao guardar'); }
    } finally {
      setSavingInstruments(false);
    }
  };

  const saveAvatar = async (avatar: string) => {
    setSavingAvatar(true);
    try {
      const updated = await api('/auth/me', { method: 'PUT', body: { avatar } });
      if (setUser) setUser(updated);
      setAvatarModal(false);
    } catch (e: any) {
      if (Platform.OS === 'web') { window.alert('Erro: ' + (e.message || '')); }
      else { Alert.alert('Erro', e.message || 'Falha ao guardar'); }
    } finally {
      setSavingAvatar(false);
    }
  };

  const avatarEmoji = user?.avatar ?? '';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Perfil</Text>

        {/* Card do utilizador */}
        <View style={styles.userCard}>
          <TouchableOpacity style={styles.avatarWrap} onPress={() => setAvatarModal(true)} activeOpacity={0.8}>
            <View style={styles.avatar}>
              {avatarEmoji
                ? <Text style={styles.avatarEmoji}>{avatarEmoji}</Text>
                : <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
              }
            </View>
            <View style={styles.avatarEditBadge}>
              <Ionicons name="camera-outline" size={12} color="#fff" />
            </View>
          </TouchableOpacity>

          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name={isLeader ? 'star' : 'person'} size={12} color={isLeader ? colors.gold : colors.textSecondary} />
            <Text style={[styles.roleText, isLeader && { color: colors.gold }]}>
              {isLeader ? 'Líder' : 'Membro'}
            </Text>
          </View>
        </View>

        {/* ── CONFIGURAÇÕES DO PERFIL (todos os utilizadores) ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>MEU PERFIL</Text>
          <View style={styles.card}>
            {/* Instrumentos */}
            <TouchableOpacity
              style={styles.action}
              onPress={() => { setSelectedInstruments(user?.instruments ?? []); setInstrumentModal(true); }}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#E6E9F0' }]}>
                <Ionicons name="musical-notes-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>Meus Instrumentos</Text>
                <Text style={styles.actionSubtitle} numberOfLines={1}>
                  {(user?.instruments?.length ?? 0) > 0
                    ? user!.instruments!.join(' · ')
                    : 'Nenhum instrumento selecionado'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            {/* Foto de perfil */}
            <TouchableOpacity style={styles.action} onPress={() => setAvatarModal(true)}>
              <View style={[styles.actionIcon, { backgroundColor: '#F2EBDB' }]}>
                <Ionicons name="happy-outline" size={18} color={colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>Foto de Perfil</Text>
                <Text style={styles.actionSubtitle}>Escolher avatar</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── MINISTÉRIO (todos os utilizadores) ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>MINISTÉRIO</Text>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.cardIcon}>
                <Ionicons name="home-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{ministry?.name}</Text>
                <Text style={styles.cardSubtitle}>Código: {ministry?.invite_code}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── GESTÃO (apenas líder) ── */}
        {isLeader && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>GESTÃO</Text>
            <View style={styles.card}>
              <TouchableOpacity style={styles.action} onPress={() => router.push('/membros')}>
                <View style={[styles.actionIcon, { backgroundColor: '#E6E9F0' }]}>
                  <Ionicons name="people-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionTitle}>Membros</Text>
                  <Text style={styles.actionSubtitle}>Ver e gerir a equipa</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <View style={styles.actionDivider} />

              <TouchableOpacity style={styles.action} onPress={() => router.push('/convidar')}>
                <View style={[styles.actionIcon, { backgroundColor: '#F2EBDB' }]}>
                  <Ionicons name="share-outline" size={18} color={colors.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionTitle}>Convidar membros</Text>
                  <Text style={styles.actionSubtitle}>Partilhar o código de convite</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <View style={styles.actionDivider} />

              <TouchableOpacity style={styles.action} onPress={() => router.push('/api-docs')}>
                <View style={[styles.actionIcon, { backgroundColor: '#E6F0EA' }]}>
                  <Ionicons name="code-slash-outline" size={18} color={colors.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionTitle}>Integração / API</Text>
                  <Text style={styles.actionSubtitle}>Ligar a app PWA externa</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Membros não-líderes vêem botão para ir à lista de membros (apenas visualização) */}
        {!isLeader && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>EQUIPA</Text>
            <View style={styles.card}>
              <TouchableOpacity style={styles.action} onPress={() => router.push('/membros')}>
                <View style={[styles.actionIcon, { backgroundColor: '#E6E9F0' }]}>
                  <Ionicons name="people-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionTitle}>Ver equipa</Text>
                  <Text style={styles.actionSubtitle}>Membros do ministério</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout}>
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={styles.logoutText}>Sair da conta</Text>
        </TouchableOpacity>

        <Text style={styles.version}>LouvorApp · v2.0</Text>
      </ScrollView>

      {/* Modal de avatares */}
      <Modal visible={avatarModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAvatarModal(false)}>
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setAvatarModal(false)} style={styles.headerBtn}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Foto de Perfil</Text>
            <View style={{ width: 44 }} />
          </View>
          <Text style={styles.modalSub}>Toca num avatar para o selecionar.</Text>
          {savingAvatar ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={AVATARS}
              keyExtractor={i => i}
              numColumns={4}
              contentContainerStyle={styles.avatarGrid}
              renderItem={({ item }) => {
                const isSelected = user?.avatar === item;
                return (
                  <TouchableOpacity
                    style={[styles.avatarOption, isSelected && styles.avatarOptionSelected]}
                    onPress={() => saveAvatar(item)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.avatarOptionEmoji}>{item}</Text>
                    {isSelected && (
                      <View style={styles.avatarOptionCheck}>
                        <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Modal de instrumentos */}
      <Modal visible={instrumentModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setInstrumentModal(false)}>
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setInstrumentModal(false)} style={styles.headerBtn}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Meus Instrumentos</Text>
            <TouchableOpacity onPress={saveInstruments} style={styles.headerBtn} disabled={savingInstruments}>
              <Text style={[styles.saveText, savingInstruments && { opacity: 0.4 }]}>
                {savingInstruments ? '...' : 'Guardar'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSub}>Seleciona os instrumentos que tocas na equipa.</Text>
          <FlatList
            data={INSTRUMENT_LIST}
            keyExtractor={i => i}
            contentContainerStyle={styles.instrumentList}
            renderItem={({ item }) => {
              const selected = selectedInstruments.includes(item);
              return (
                <TouchableOpacity
                  style={[styles.instrumentItem, selected && styles.instrumentItemSelected]}
                  onPress={() => toggleInstrument(item)}
                >
                  <Text style={[styles.instrumentItemText, selected && styles.instrumentItemTextSelected]}>{item}</Text>
                  {selected && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  title: { fontSize: font.h1, fontWeight: '700', color: colors.text, letterSpacing: -0.5, marginBottom: spacing.lg },
  userCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg },
  avatarWrap: { position: 'relative', marginBottom: spacing.sm },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 38 },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '700' },
  avatarEditBadge: { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  userName: { fontSize: font.h3, fontWeight: '700', color: colors.text },
  userEmail: { fontSize: font.caption, color: colors.textSecondary, marginTop: 2 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.bg, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
  roleText: { fontSize: font.small, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.5 },
  section: { marginBottom: spacing.lg },
  sectionLabel: { fontSize: font.small, fontWeight: '700', color: colors.textSecondary, letterSpacing: 1, marginBottom: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  cardRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm },
  cardIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#E6E9F0', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: font.body, fontWeight: '600', color: colors.text },
  cardSubtitle: { fontSize: font.caption, color: colors.textSecondary, marginTop: 2 },
  action: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm },
  actionIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontSize: font.body, fontWeight: '600', color: colors.text },
  actionSubtitle: { fontSize: font.caption, color: colors.textSecondary, marginTop: 2 },
  actionDivider: { height: 1, backgroundColor: colors.border, marginLeft: spacing.md + 36 + spacing.sm },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.surface, paddingVertical: 16, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  logoutText: { color: colors.error, fontWeight: '600', fontSize: font.body },
  version: { textAlign: 'center', color: colors.textMuted, fontSize: font.small, marginTop: spacing.lg },
  modalSafe: { flex: 1, backgroundColor: colors.bg },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerBtn: { minWidth: 44, height: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  modalTitle: { fontSize: font.h3, fontWeight: '700', color: colors.text, flex: 1, textAlign: 'center' },
  saveText: { fontSize: font.body, color: colors.primary, fontWeight: '700' },
  modalSub: { fontSize: font.caption, color: colors.textSecondary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  avatarGrid: { padding: spacing.md, gap: 12 },
  avatarOption: { flex: 1, margin: 4, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, position: 'relative' },
  avatarOptionSelected: { borderColor: colors.primary, borderWidth: 2, backgroundColor: '#EDF2FF' },
  avatarOptionEmoji: { fontSize: 36 },
  avatarOptionCheck: { position: 'absolute', top: 4, right: 4 },
  instrumentList: { padding: spacing.md, gap: 8 },
  instrumentItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: 14, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  instrumentItemSelected: { borderColor: colors.primary, backgroundColor: '#EDF2FF' },
  instrumentItemText: { fontSize: font.body, color: colors.text },
  instrumentItemTextSelected: { color: colors.primary, fontWeight: '700' },
});
