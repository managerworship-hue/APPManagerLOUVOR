import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/api/client';
import { useAuth } from '@/src/context/AuthContext';
import { storage } from '@/src/utils/storage';
import { useTheme } from '@/src/context/ThemeContext';
import { radius, font, spacing } from '@/src/theme';
import { formatDay, formatMonth, formatRelative } from '@/src/utils/date';

type Stats = {
  members: number;
  songs: number;
  scales: number;
  announcements: number;
  next_scale: any | null;
};

type Announcement = {
  id: string;
  title: string;
  body: string;
  author_name: string;
  created_at: string;
};

type NotificationItem = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  created_at: string;
  url: string;
};

export default function HomeScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const router = useRouter();
  const { user, ministry, isLeader } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      // 1. Carregar instantaneamente do cache para exibição imediata
      const [cachedStats, cachedAnn, cachedNotif] = await Promise.all([
        storage.getItem('cached_stats', null) as Promise<Stats | null>,
        storage.getItem('cached_announcements', [] as any) as Promise<Announcement[] | null>,
        storage.getItem('cached_notifications', [] as any) as Promise<NotificationItem[] | null>,
      ]);

      if (cachedStats && stats === null) {
        setStats(cachedStats);
        if (cachedAnn) setAnnouncements(cachedAnn.slice(0, 3));
        if (cachedNotif) setNotifications(cachedNotif);
        setLoading(false);
      }

      // 2. Buscar dados frescos em segundo plano
      const [s, a, n] = await Promise.all([
        api<Stats>('/stats'),
        api<Announcement[]>('/announcements'),
        api<NotificationItem[]>('/notifications'),
      ]);
      setStats(s);
      setAnnouncements(a.slice(0, 3));
      setNotifications(n);

      await Promise.all([
        storage.setItem('cached_stats', s as any),
        storage.setItem('cached_announcements', a as any),
        storage.setItem('cached_notifications', n as any),
      ]);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [stats]);

  const markAllAsRead = async () => {
    try {
      await api('/notifications/read-all', { method: 'POST' });
      const updated = notifications.map(notif => ({ ...notif, read: true }));
      setNotifications(updated);
      await storage.setItem('cached_notifications', updated as any);
    } catch (e) {
      console.error(e);
    }
  };

  const handleNotificationPress = async (notif: NotificationItem) => {
    try {
      if (!notif.read) {
        await api(`/notifications/mark-read/${notif.id}`, { method: 'POST' });
        const updated = notifications.map(n => n.id === notif.id ? { ...n, read: true } : n);
        setNotifications(updated);
        await storage.setItem('cached_notifications', updated as any);
      }
      setNotifModalVisible(false);
      if (notif.url) {
        router.push(notif.url as any);
      }
    } catch (e) {
      console.error(e);
      setNotifModalVisible(false);
      if (notif.url) {
        router.push(notif.url as any);
      }
    }
  };

  const hasUnread = notifications.some(n => !n.read);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting} testID="home-greeting">Olá, {user?.name?.split(' ')[0]}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <Text style={styles.ministryName}>{ministry?.name}</Text>
              {isLeader && (
                <View style={styles.leaderTag}>
                  <Ionicons name="star" size={10} color={colors.gold} />
                  <Text style={styles.leaderText}>LÍDER</Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.headerRight}>
            {/* Sininho de Notificações */}
            <TouchableOpacity
              testID="home-notifications-button"
              style={styles.iconBtn}
              onPress={() => setNotifModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="notifications-outline" size={20} color={colors.text} />
              {hasUnread && <View style={styles.unreadBadge} />}
            </TouchableOpacity>

            {/* Convidar: apenas líder */}
            {isLeader && (
              <TouchableOpacity
                testID="home-invite-button"
                style={styles.iconBtn}
                onPress={() => router.push('/convidar')}
                activeOpacity={0.7}
              >
                <Ionicons name="share-outline" size={20} color={colors.text} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Próxima escala */}
            {stats?.next_scale ? (
              <TouchableOpacity
                testID="next-scale-card"
                style={styles.nextCard}
                onPress={() => router.push(`/escala/${stats.next_scale.id}`)}
                activeOpacity={0.85}
              >
                <View style={styles.nextOverlay} />
                <Text style={styles.nextLabel}>PRÓXIMA ESCALA</Text>
                <Text style={styles.nextTitle}>{stats.next_scale.title}</Text>
                <View style={styles.nextRow}>
                  <Ionicons name="calendar" size={14} color={colors.gold} />
                  <Text style={styles.nextMeta}>
                    {formatDay(stats.next_scale.date)} {formatMonth(stats.next_scale.date)}
                    {stats.next_scale.time ? `  ·  ${stats.next_scale.time}` : ''}
                  </Text>
                </View>
                {stats.next_scale.location ? (
                  <View style={styles.nextRow}>
                    <Ionicons name="location" size={14} color={colors.gold} />
                    <Text style={styles.nextMeta}>{stats.next_scale.location}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            ) : (
              <View style={styles.emptyCard}>
                <Ionicons name="calendar-outline" size={28} color={colors.textMuted} />
                <Text style={styles.emptyText}>Nenhuma escala próxima</Text>
                <Text style={styles.emptySubtext}>Crie a primeira escala do ministério</Text>
              </View>
            )}

            {/* Grid de estatísticas */}
            <View style={styles.grid}>
              <TouchableOpacity style={styles.statCard} onPress={() => router.push('/membros')} testID="stat-members">
                <View style={[styles.statIcon, { backgroundColor: '#F2EBDB' }]}>
                  {/* item 3: ícone de grupo de pessoas */}
                  <Ionicons name="people-outline" size={20} color={colors.gold} />
                </View>
                <Text style={styles.statValue}>{stats?.members ?? 0}</Text>
                <Text style={styles.statLabel}>Membros</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(tabs)/repertorio')} testID="stat-songs">
                <View style={[styles.statIcon, { backgroundColor: '#E6E9F0' }]}>
                  <Ionicons name="musical-note" size={20} color={colors.primary} />
                </View>
                <Text style={styles.statValue}>{stats?.songs ?? 0}</Text>
                <Text style={styles.statLabel}>Músicas</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(tabs)/escalas')} testID="stat-scales">
                <View style={[styles.statIcon, { backgroundColor: '#E6F0EA' }]}>
                  <Ionicons name="calendar-outline" size={20} color={colors.success} />
                </View>
                <Text style={styles.statValue}>{stats?.scales ?? 0}</Text>
                <Text style={styles.statLabel}>Escalas</Text>
              </TouchableOpacity>
              {/* Avisos: só líder cria */}
              <TouchableOpacity
                style={styles.statCard}
                onPress={() => isLeader ? router.push('/aviso/novo') : null}
                testID="stat-announcements"
                activeOpacity={isLeader ? 0.7 : 1}
              >
                <View style={[styles.statIcon, { backgroundColor: '#F2E6E6' }]}>
                  <Ionicons name="megaphone-outline" size={20} color={colors.error} />
                </View>
                <Text style={styles.statValue}>{stats?.announcements ?? 0}</Text>
                <Text style={styles.statLabel}>Avisos</Text>
              </TouchableOpacity>
            </View>

            {/* Avisos recentes — clicáveis (item 8) */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Avisos recentes</Text>
              {isLeader && (
                <TouchableOpacity onPress={() => router.push('/aviso/novo')} testID="new-announcement-button">
                  <Text style={styles.sectionLink}>Novo +</Text>
                </TouchableOpacity>
              )}
            </View>

            {announcements.length === 0 ? (
              <View style={styles.emptySmall}>
                <Text style={styles.emptySubtext}>Sem avisos ainda</Text>
              </View>
            ) : (
              announcements.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  style={styles.annCard}
                  testID={`announcement-${a.id}`}
                  onPress={() => router.push(`/aviso/${a.id}`)}
                  activeOpacity={0.75}
                >
                  <View style={styles.annHeader}>
                    <Ionicons name="megaphone" size={14} color={colors.gold} />
                    <Text style={styles.annAuthor}>{a.author_name}</Text>
                    <Text style={styles.annTime}>· {formatRelative(a.created_at)}</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
                  </View>
                  <Text style={styles.annTitle}>{a.title}</Text>
                  <Text style={styles.annBody} numberOfLines={2}>{a.body}</Text>
                </TouchableOpacity>
              ))
            )}

            <View style={{ height: 24 }} />
          </>
        )}
      </ScrollView>

      {/* Modal de Notificações */}
      <Modal
        visible={notifModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setNotifModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setNotifModalVisible(false)} style={styles.headerBtn}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Notificações</Text>
            {hasUnread ? (
              <TouchableOpacity onPress={markAllAsRead} style={styles.readAllBtn} activeOpacity={0.7}>
                <Ionicons name="checkmark-done-outline" size={22} color={colors.info} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 44 }} />
            )}
          </View>

          {notifications.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={40} color={colors.textMuted} />
              <Text style={styles.emptyText}>Sem notificações no momento</Text>
              <Text style={styles.emptySubtext}>Avisaremos assim que houver novidades.</Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.notifList}
              ItemSeparatorComponent={() => <View style={styles.notifDivider} />}
              renderItem={({ item }) => {
                let icon = 'notifications-outline';
                let iconColor = colors.textSecondary;
                let bg = 'rgba(143, 163, 200, 0.05)';
                
                if (item.type === 'welcome') {
                  icon = 'hand-left-outline';
                  iconColor = colors.gold;
                  bg = 'rgba(235, 197, 89, 0.1)';
                } else if (item.type === 'member_joined') {
                  icon = 'people-outline';
                  iconColor = colors.primary;
                  bg = 'rgba(66, 133, 244, 0.1)';
                } else if (item.type === 'scale_added') {
                  icon = 'calendar-outline';
                  iconColor = colors.success;
                  bg = 'rgba(52, 168, 83, 0.1)';
                } else if (item.type === 'scale_created') {
                  icon = 'time-outline';
                  iconColor = colors.info;
                  bg = 'rgba(143, 163, 200, 0.1)';
                } else if (item.type === 'scale_updated') {
                  icon = 'create-outline';
                  iconColor = colors.gold;
                  bg = 'rgba(235, 197, 89, 0.1)';
                } else if (item.type === 'scale_removed') {
                  icon = 'close-circle-outline';
                  iconColor = colors.error;
                  bg = 'rgba(219, 68, 85, 0.1)';
                } else if (item.type === 'announcement') {
                  icon = 'megaphone-outline';
                  iconColor = colors.error;
                  bg = 'rgba(219, 68, 85, 0.1)';
                }

                return (
                  <TouchableOpacity
                    style={[styles.notifRow, !item.read && styles.notifUnread]}
                    onPress={() => handleNotificationPress(item)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.notifIconWrap, { backgroundColor: bg }]}>
                      <Ionicons name={icon as any} size={18} color={iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.notifTitleRow}>
                        <Text style={[styles.notifTitle, !item.read && styles.notifTitleBold]}>
                          {item.title}
                        </Text>
                        {!item.read && <View style={styles.notifDot} />}
                      </View>
                      <Text style={styles.notifBody}>{item.body}</Text>
                      <Text style={styles.notifTime}>{formatRelative(item.created_at)}</Text>
                    </View>
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

const getStyles = (colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  greeting: { fontSize: font.h2, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  ministryName: { fontSize: font.caption, color: colors.textSecondary },
  leaderTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#F2EBDB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  leaderText: {
    fontSize: 9,
    color: colors.gold,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  nextCard: { backgroundColor: colors.primary, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, overflow: 'hidden', position: 'relative' },
  nextOverlay: { position: 'absolute', right: -20, top: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(197,160,89,0.15)' },
  nextLabel: { fontSize: font.small, color: colors.gold, fontWeight: '700', letterSpacing: 1.5, marginBottom: 6 },
  nextTitle: { fontSize: 22, color: '#fff', fontWeight: '700', marginBottom: spacing.sm, letterSpacing: -0.3 },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  nextMeta: { color: 'rgba(255,255,255,0.85)', fontSize: font.body },
  emptyCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  emptyText: { fontSize: font.body, color: colors.text, fontWeight: '600', marginTop: 8 },
  emptySubtext: { fontSize: font.caption, color: colors.textSecondary, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  statCard: { flexBasis: '48%', flexGrow: 1, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  statIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  statValue: { fontSize: 24, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
  statLabel: { fontSize: font.caption, color: colors.textSecondary, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sectionTitle: { fontSize: font.h3, fontWeight: '700', color: colors.text },
  sectionLink: { color: colors.primary, fontWeight: '600', fontSize: font.caption },
  emptySmall: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  annCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  annHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  annAuthor: { fontSize: font.small, color: colors.text, fontWeight: '600' },
  annTime: { fontSize: font.small, color: colors.textMuted },
  annTitle: { fontSize: font.body, fontWeight: '700', color: colors.text, marginBottom: 4 },
  annBody: { fontSize: font.caption, color: colors.textSecondary, lineHeight: 20 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  unreadBadge: {
    position: 'absolute',
    right: 2,
    top: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
  modalSafe: { flex: 1, backgroundColor: colors.bg },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  readAllBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: font.h3, fontWeight: '700', color: colors.text },
  notifList: { padding: spacing.md },
  notifDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.md,
  },
  notifUnread: {
    backgroundColor: 'rgba(143, 163, 200, 0.03)',
  },
  notifIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  notifTitle: { fontSize: font.body, color: colors.textSecondary },
  notifTitleBold: { fontWeight: '700', color: colors.text },
  notifBody: { fontSize: font.caption, color: colors.textSecondary, lineHeight: 18, marginBottom: 4 },
  notifTime: { fontSize: font.small, color: colors.textMuted },
  notifDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.info },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
});
