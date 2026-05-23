import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Platform,
  Modal, FlatList,
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

export default function ProfileScreen() {
  const router = useRouter();
  const { user, ministry, isLeader, logout, setUser } = useAuth();
  const [instrumentModal, setInstrumentModal] = useState(false);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>(
    user?.instruments ?? []
  );
  const [savingInstruments, setSavingInstruments] = useState(false);

  const confirmLogout = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Tem certeza que deseja sair da conta?');
      if (confirmed) {
        await logout();
        router.replace('/login');
      }
    } else {
      Alert.alert('Sair', 'Tem certeza que deseja sair?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: async () => {
          await logout();
          router.replace('/login');
        }},
      ]);
    }
  };

  const toggleInstrument = (inst: string) => {
    setSelectedInstruments((prev) =>
      prev.includes(inst) ? prev.filter((i) => i !== inst) : [...prev, inst]
    );
  };

  const saveInstruments = async () => {
    setSavingInstruments(true);
    try {
      const updated = await api('/auth/me', {
        method: 'PUT',
        body: { instruments: selectedInstruments },
      });
      if (setUser) setUser(updated);
      setInstrumentModal(false);
      Alert.alert('Guardado', 'Instrumentos atualizados com sucesso.');
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Falha ao guardar instrumentos');
    } finally {
      setSavingInstruments(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Perfil</Text>

        {/* User card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Ionicons
              name={isLeader ? 'star' : 'person'}
              size={12}
              color={isLeader ? colors.gold : colors.textSecondary}
            />
            <Text style={[styles.roleText, isLeader && { color: colors.gold }]}>
              {isLeader ? 'Líder' : 'Membro'}
            </Text>
          </View>

          {/* Instrumentos do utilizador */}
          <TouchableOpacity
            style={styles.instrumentsBtn}
            onPress={() => {
              setSelectedInstruments(user?.instruments ?? []);
              setInstrumentModal(true);
            }}
            activeOpacity={0.75}
          >
            <Ionicons name="musical-notes-outline" size={15} color={colors.primary} />
            <Text style={styles.instrumentsBtnText}>
              {(user?.instruments?.length ?? 0) > 0
                ? user!.instruments!.join(' · ')
                : 'Adicionar instrumentos'}
            </Text>
            <Ionicons name="pencil-outline" size={13} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Ministry */}
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

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>GESTÃO</Text>
          <View style={styles.card}>
            <TouchableOpacity
              testID="profile-members-action"
              style={styles.action}
              onPress={() => router.push('/membros')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#E6E9F0' }]}>
                <Ionicons name="people-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>Membros</Text>
                <Text style={styles.actionSubtitle}>Ver e gerir a equipa</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Convidar membros: apenas para líderes (item 4) */}
            {isLeader && (
              <>
                <View style={styles.actionDivider} />
                <TouchableOpacity
                  testID="profile-invite-action"
                  style={styles.action}
                  onPress={() => router.push('/convidar')}
                >
                  <View style={[styles.actionIcon, { backgroundColor: '#F2EBDB' }]}>
                    <Ionicons name="share-outline" size={18} color={colors.gold} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actionTitle}>Convidar membros</Text>
                    <Text style={styles.actionSubtitle}>Partilhar o código de convite</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </>
            )}

            <View style={styles.actionDivider} />

            <TouchableOpacity
              testID="profile-api-action"
              style={styles.action}
              onPress={() => router.push('/api-docs')}
            >
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

        <TouchableOpacity
          testID="logout-button"
          style={styles.logoutBtn}
          onPress={confirmLogout}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={styles.logoutText}>Sair da conta</Text>
        </TouchableOpacity>

        <Text style={styles.version}>LouvorApp · v2.0</Text>
      </ScrollView>

      {/* Modal de instrumentos */}
      <Modal
        visible={instrumentModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setInstrumentModal(false)}
      >
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setInstrumentModal(false)} style={styles.headerBtn}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Meus Instrumentos</Text>
            <TouchableOpacity
              onPress={saveInstruments}
              style={styles.headerBtn}
              disabled={savingInstruments}
            >
              <Text style={[styles.saveText, savingInstruments && { opacity: 0.4 }]}>
                {savingInstruments ? 'A guardar...' : 'Guardar'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSub}>
            Seleciona os instrumentos que tocas. Serão visíveis no teu perfil e nas escalas.
          </Text>

          <FlatList
            data={INSTRUMENT_LIST}
            keyExtractor={(i) => i}
            contentContainerStyle={styles.instrumentList}
            renderItem={({ item }) => {
              const selected = selectedInstruments.includes(item);
              return (
                <TouchableOpacity
                  style={[styles.instrumentItem, selected && styles.instrumentItemSelected]}
                  onPress={() => toggleInstrument(item)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.instrumentItemText, selected && styles.instrumentItemTextSelected]}>
                    {item}
                  </Text>
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
  userCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  userName: { fontSize: font.h3, fontWeight: '700', color: colors.text },
  userEmail: { fontSize: font.caption, color: colors.textSecondary, marginTop: 2 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: spacing.sm,
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: colors.bg,
    borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border,
  },
  roleText: { fontSize: font.small, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.5 },
  instrumentsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: spacing.md,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: colors.bg,
    borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border,
    maxWidth: '100%', flexWrap: 'wrap',
  },
  instrumentsBtnText: {
    fontSize: font.small, color: colors.primary, fontWeight: '600', flex: 1, flexWrap: 'wrap',
  },
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
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.surface,
    paddingVertical: 16,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  logoutText: { color: colors.error, fontWeight: '600', fontSize: font.body },
  version: { textAlign: 'center', color: colors.textMuted, fontSize: font.small, marginTop: spacing.lg },
  // Modal
  modalSafe: { flex: 1, backgroundColor: colors.bg },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: font.h3, fontWeight: '700', color: colors.text },
  saveText: { fontSize: font.body, color: colors.primary, fontWeight: '700' },
  modalSub: { fontSize: font.caption, color: colors.textSecondary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  instrumentList: { padding: spacing.md, gap: 8 },
  instrumentItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  instrumentItemSelected: { borderColor: colors.primary, backgroundColor: '#EDF2FF' },
  instrumentItemText: { fontSize: font.body, color: colors.text },
  instrumentItemTextSelected: { color: colors.primary, fontWeight: '700' },
});
