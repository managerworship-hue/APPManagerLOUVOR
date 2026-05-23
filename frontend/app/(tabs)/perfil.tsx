import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import { colors, radius, font, spacing } from '@/src/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, ministry, isLeader, logout } = useAuth();

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
        } },
      ]);
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
                <Text style={styles.actionSubtitle}>Ver e gerenciar a equipe</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

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
                <Text style={styles.actionSubtitle}>Compartilhe o código de convite</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

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
                <Text style={styles.actionSubtitle}>Conecte seu app PWA externo</Text>
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
});
