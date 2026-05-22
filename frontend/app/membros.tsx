import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
  Switch, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/api/client';
import { useAuth } from '@/src/context/AuthContext';
import { colors, radius, font, spacing } from '@/src/theme';

type Member = {
  id: string;
  name: string;
  email: string;
  role: 'leader' | 'member';
  permissions: string[];
  instruments: string[];
};

const PERMS = [
  { key: 'edit_scales', label: 'Editar escalas' },
  { key: 'edit_songs', label: 'Editar repertório' },
  { key: 'edit_announcements', label: 'Publicar avisos' },
];

export default function MembrosScreen() {
  const router = useRouter();
  const { isLeader, user: me } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api<Member[]>('/ministry/members');
      setMembers(r);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const updateMember = async (id: string, payload: any) => {
    try {
      const updated = await api<Member>(`/ministry/members/${id}`, { method: 'PUT', body: payload });
      setMembers(members.map((m) => m.id === id ? updated : m));
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    }
  };

  const togglePerm = (m: Member, perm: string) => {
    const has = m.permissions.includes(perm);
    const newPerms = has ? m.permissions.filter(p => p !== perm) : [...m.permissions, perm];
    updateMember(m.id, { permissions: newPerms });
  };

  const toggleRole = (m: Member) => {
    const newRole = m.role === 'leader' ? 'member' : 'leader';
    Alert.alert(
      newRole === 'leader' ? 'Promover a líder' : 'Rebaixar a membro',
      newRole === 'leader'
        ? `${m.name} terá acesso total ao ministério.`
        : `${m.name} perderá privilégios de líder.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: () => updateMember(m.id, { role: newRole }) },
      ]
    );
  };

  const removeMember = (m: Member) => {
    Alert.alert('Remover do ministério', `Remover ${m.name} permanentemente?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: async () => {
        try {
          await api(`/ministry/members/${m.id}`, { method: 'DELETE' });
          setMembers(members.filter(x => x.id !== m.id));
        } catch (e: any) { Alert.alert('Erro', e.message); }
      } },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity testID="back-button" onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Membros</Text>
        <TouchableOpacity testID="invite-button" onPress={() => router.push('/convidar')} style={styles.headerBtn}>
          <Ionicons name="person-add-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        >
          {members.map((m) => {
            const isMe = m.id === me?.id;
            const open = expanded === m.id;
            return (
              <View key={m.id} style={styles.card} testID={`member-card-${m.id}`}>
                <TouchableOpacity
                  testID={`member-row-${m.id}`}
                  style={styles.row}
                  onPress={() => isLeader && !isMe && setExpanded(open ? null : m.id)}
                  activeOpacity={isLeader && !isMe ? 0.7 : 1}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{m.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.name}>{m.name}{isMe ? ' (você)' : ''}</Text>
                      {m.role === 'leader' && (
                        <View style={styles.leaderTag}>
                          <Ionicons name="star" size={10} color={colors.gold} />
                          <Text style={styles.leaderText}>LÍDER</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.email}>{m.email}</Text>
                    {m.instruments && m.instruments.length > 0 ? (
                      <Text style={styles.instruments}>{m.instruments.join(' · ')}</Text>
                    ) : null}
                  </View>
                  {isLeader && !isMe && (
                    <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
                  )}
                </TouchableOpacity>

                {open && isLeader && !isMe && (
                  <View style={styles.expanded}>
                    {m.role !== 'leader' && (
                      <>
                        <Text style={styles.expandedLabel}>PERMISSÕES</Text>
                        {PERMS.map((p) => (
                          <View key={p.key} style={styles.permRow}>
                            <Text style={styles.permLabel}>{p.label}</Text>
                            <Switch
                              testID={`perm-${m.id}-${p.key}`}
                              value={m.permissions.includes(p.key)}
                              onValueChange={() => togglePerm(m, p.key)}
                              trackColor={{ false: colors.border, true: colors.gold }}
                              thumbColor="#fff"
                            />
                          </View>
                        ))}
                      </>
                    )}

                    <View style={styles.actions}>
                      <TouchableOpacity
                        testID={`toggle-role-${m.id}`}
                        style={styles.actionBtn}
                        onPress={() => toggleRole(m)}
                      >
                        <Ionicons name={m.role === 'leader' ? 'arrow-down' : 'arrow-up'} size={14} color={colors.primary} />
                        <Text style={styles.actionText}>
                          {m.role === 'leader' ? 'Rebaixar' : 'Promover a líder'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        testID={`remove-member-${m.id}`}
                        style={[styles.actionBtn, { borderColor: '#F2D5D5' }]}
                        onPress={() => removeMember(m)}
                      >
                        <Ionicons name="trash-outline" size={14} color={colors.error} />
                        <Text style={[styles.actionText, { color: colors.error }]}>Remover</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: font.h3, fontWeight: '700', color: colors.text },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: font.body, fontWeight: '700', color: colors.text },
  leaderTag: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#F2EBDB', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  leaderText: { fontSize: 9, color: colors.gold, fontWeight: '700', letterSpacing: 0.5 },
  email: { fontSize: font.caption, color: colors.textSecondary, marginTop: 2 },
  instruments: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  expanded: { padding: spacing.md, paddingTop: 0, borderTopWidth: 1, borderTopColor: colors.border, gap: 6 },
  expandedLabel: { fontSize: font.small, fontWeight: '700', color: colors.textSecondary, letterSpacing: 1, marginTop: spacing.sm, marginBottom: 4 },
  permRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  permLabel: { fontSize: font.caption, color: colors.text },
  actions: { flexDirection: 'row', gap: 8, marginTop: spacing.sm },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg },
  actionText: { fontSize: font.caption, color: colors.primary, fontWeight: '600' },
});
