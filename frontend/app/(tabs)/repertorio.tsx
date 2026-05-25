import React, { useCallback, useState, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, Modal, Alert, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/api/client';
import { useAuth } from '@/src/context/AuthContext';
import { storage } from '@/src/utils/storage';
import { colors, radius, font, spacing } from '@/src/theme';

type Song = {
  id: string;
  title: string;
  artist: string;
  key: string;
  bpm: number | null;
  youtube_url: string;
  cifra_url: string;
};

export default function RepertorioScreen() {
  const router = useRouter();
  const { hasPermission, isLeader } = useAuth();
  const [items, setItems] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  // Estados da Integração Google Drive
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const [clientId, setClientId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [syncResult, setSyncResult] = useState<{ success: boolean; count: number; errors: string[] } | null>(null);

  // Carregar Client ID guardado nas preferências
  React.useEffect(() => {
    storage.getItem('google_client_id', '').then((saved) => {
      if (saved) setClientId(saved);
    });
  }, []);

  const handleGoogleAuth = async () => {
    if (!clientId.trim()) {
      if (Platform.OS === 'web') {
        window.alert('Por favor, configure o seu Google Client ID primeiro.');
      } else {
        Alert.alert('Erro', 'Por favor, configure o seu Google Client ID primeiro.');
      }
      return;
    }
    
    // Guardar o Client ID para as próximas vezes
    await storage.setItem('google_client_id', clientId.trim());
    
    setProgressText('A carregar biblioteca do Google...');
    setSyncing(true);
    setSyncResult(null);
    
    try {
      // 1. Carregar script do Google Identity Services
      const loaded = await new Promise<boolean>((resolve) => {
        if ((window as any).google) {
          resolve(true);
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });
      
      if (!loaded) {
        throw new Error('Falha ao carregar a biblioteca do Google. Verifique a sua ligação.');
      }
      
      setProgressText('A abrir autenticação do Google...');
      
      // 2. Iniciar fluxo de token OAuth2
      const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId.trim(),
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: async (response: any) => {
          if (response.error) {
            setSyncing(false);
            if (Platform.OS === 'web') {
              window.alert('Autenticação cancelada ou erro: ' + response.error);
            }
            return;
          }
          if (response.access_token) {
            setAccessToken(response.access_token);
            await runImport(response.access_token);
          }
        },
      });
      
      tokenClient.requestAccessToken();
      
    } catch (e: any) {
      setSyncing(false);
      if (Platform.OS === 'web') {
        window.alert('Erro de Conexão: ' + e.message);
      } else {
        Alert.alert('Erro', e.message);
      }
    }
  };

  const handleManualSync = async () => {
    if (!accessToken.trim()) {
      if (Platform.OS === 'web') {
        window.alert('Insira um Access Token válido.');
      } else {
        Alert.alert('Erro', 'Insira um Access Token válido.');
      }
      return;
    }
    setSyncing(true);
    setSyncResult(null);
    await runImport(accessToken.trim());
  };

  const runImport = async (token: string) => {
    setProgressText('A ligar ao Google Drive...\nIsto pode levar algum tempo dependendo da quantidade de músicas.');
    try {
      const res = await api<{ ok: boolean; imported_count: number; errors: string[] }>('/songs/import/google-drive', {
        method: 'POST',
        body: { access_token: token },
      });
      
      setSyncResult({
        success: true,
        count: res.imported_count,
        errors: res.errors,
      });
      
      // Recarregar a lista
      load();
    } catch (e: any) {
      setSyncResult({
        success: false,
        count: 0,
        errors: [e.message || 'Erro desconhecido na sincronização'],
      });
    } finally {
      setSyncing(false);
    }
  };

  const load = useCallback(async () => {
    try {
      const r = await api<Song[]>('/songs');
      setItems(r);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((s) =>
      s.title.toLowerCase().includes(q) ||
      (s.artist || '').toLowerCase().includes(q)
    );
  }, [items, query]);

  const canEdit = isLeader;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Repertório</Text>
          <Text style={styles.subtitle}>{items.length} música{items.length !== 1 ? 's' : ''}</Text>
        </View>
        {canEdit && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[styles.fabSmall, { backgroundColor: '#4285F4' }]}
              onPress={() => setSyncModalVisible(true)}
              activeOpacity={0.85}
              title="Sincronizar Google Drive"
            >
              <Ionicons name="logo-google" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              testID="new-song-button"
              style={styles.fabSmall}
              onPress={() => router.push('/musica/nova')}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={colors.textMuted} />
        <TextInput
          testID="search-songs-input"
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar por título ou artista"
          placeholderTextColor={colors.textMuted}
          style={styles.search}
        />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="musical-notes-outline" size={40} color={colors.textMuted} />
          <Text style={styles.emptyText}>
            {query ? 'Nenhuma música encontrada' : 'Nenhuma música no repertório'}
          </Text>
          {canEdit && !query && (
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push('/musica/nova')}
              testID="empty-new-song-button"
            >
              <Text style={styles.emptyBtnText}>Adicionar música</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              testID={`song-item-${item.id}`}
              style={styles.row}
              onPress={() => router.push(`/musica/${item.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.noteCircle}>
                <Ionicons name="musical-note" size={16} color={colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
                {item.artist ? (
                  <Text style={styles.songArtist} numberOfLines={1}>{item.artist}</Text>
                ) : null}
                <View style={styles.badges}>
                  {item.key ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Tom: {item.key}</Text>
                    </View>
                  ) : null}
                  {item.bpm ? (
                    <View style={[styles.badge, { backgroundColor: '#F2EBDB' }]}>
                      <Text style={[styles.badgeText, { color: colors.gold }]}>{item.bpm} BPM</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <View style={styles.linkIcons}>
                {item.youtube_url ? <Ionicons name="logo-youtube" size={16} color={colors.error} /> : null}
                {item.cifra_url ? <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} /> : null}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>

      {/* Modal de Importação Google Drive */}
      <Modal
        visible={syncModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSyncModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSyncModalVisible(false)} style={styles.headerBtn}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Google Drive Sync</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalScroll}>
            <Text style={styles.modalSub}>
              Importe as suas letras e cifras diretamente do seu Drive de forma rápida!
            </Text>

            <View style={styles.cardInfo}>
              <Ionicons name="information-circle-outline" size={18} color={colors.primary} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Estrutura esperada no Google Drive:</Text>
                <Text style={styles.infoText}>
                  1. Uma pasta com o nome exato <Text style={{ fontWeight: '700' }}>Louvor</Text> na raiz do seu Drive.{"\n"}
                  2. Dentro dela, subpastas para cada música.{"\n"}
                  3. Em cada subpasta, um arquivo <Text style={{ fontWeight: '700' }}>.docx</Text> ou <Text style={{ fontWeight: '700' }}>.pdf</Text> com o título:{"\n"}
                  <Text style={{ fontStyle: 'italic', fontWeight: '600', color: colors.primary }}>[NOME DA MÚSICA - "TOM" - BPM]</Text>{"\n"}
                  (ex: <Text style={{ fontStyle: 'italic' }}>Aclame ao Senhor - G - 120</Text>) e a letra com as cifras abaixo.
                </Text>
              </View>
            </View>

            {/* Configuração profissional (OAuth Popup) - Apenas Web */}
            {Platform.OS === 'web' && (
              <View style={styles.sectionImport}>
                <Text style={styles.inputLabel}>MÉTODO 1: POP-UP DE LOGIN DO GOOGLE</Text>
                <View style={styles.inputWrap}>
                  <Text style={styles.inputSubLabel}>Introduza o seu Google Client ID:</Text>
                  <TextInput
                    value={clientId}
                    onChangeText={setClientId}
                    placeholder="xxxxxxxx.apps.googleusercontent.com"
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.btnPrimary, syncing && { opacity: 0.6 }]}
                  onPress={handleGoogleAuth}
                  disabled={syncing}
                >
                  {syncing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnPrimaryText}>Conectar e Sincronizar</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {Platform.OS === 'web' && <View style={styles.dividerWrap}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OU</Text>
              <View style={styles.dividerLine} />
            </View>}

            {/* Configuração rápida por Access Token - Suporta Web e Mobile */}
            <View style={styles.sectionImport}>
              <Text style={styles.inputLabel}>
                {Platform.OS === 'web' ? 'MÉTODO 2: TOKEN DE ACESSO DIRETO' : 'TOKEN DE ACESSO DO GOOGLE'}
              </Text>
              <Text style={styles.inputHelper}>
                Obtenha o seu token temporário em 10 segundos no{" "}
                <Text
                  style={{ color: colors.primary, textDecorationLine: 'underline' }}
                  onPress={() => {
                    if (Platform.OS === 'web') {
                      window.open('https://developers.google.com/oauthplayground', '_blank');
                    }
                  }}
                >
                  Google OAuth Playground
                </Text>{" "}
                (selecione o escopo "Drive API v3 - drive.readonly" e autorize).
              </Text>

              <View style={styles.inputWrap}>
                <Text style={styles.inputSubLabel}>Cole o seu Access Token:</Text>
                <TextInput
                  value={accessToken}
                  onChangeText={setAccessToken}
                  placeholder="ya29.a0Axoo..."
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <TouchableOpacity
                style={[styles.btnPrimary, { backgroundColor: colors.info }, syncing && { opacity: 0.6 }]}
                onPress={handleManualSync}
                disabled={syncing}
              >
                {syncing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Sincronizar com Token</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Status e Resultados */}
            {syncing && (
              <View style={styles.progressBox}>
                <ActivityIndicator color={colors.primary} size="large" style={{ marginBottom: 12 }} />
                <Text style={styles.progressTitle}>Sincronização em Curso</Text>
                <Text style={styles.progressSub}>{progressText}</Text>
              </View>
            )}

            {syncResult && (
              <View style={[styles.resultBox, !syncResult.success && { borderColor: colors.error }]}>
                {syncResult.success ? (
                  <>
                    <Ionicons name="checkmark-circle" size={24} color={colors.success} style={{ marginBottom: 6 }} />
                    <Text style={styles.resultTitle}>Sincronização Concluída!</Text>
                    <Text style={styles.resultText}>
                      Importámos com sucesso <Text style={{ fontWeight: '700' }}>{syncResult.count}</Text> novas músicas para o seu repertório.
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="alert-circle" size={24} color={colors.error} style={{ marginBottom: 6 }} />
                    <Text style={[styles.resultTitle, { color: colors.error }]}>Erro de Sincronização</Text>
                  </>
                )}

                {syncResult.errors.length > 0 && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={styles.errorLabel}>Detalhes / Alertas ({syncResult.errors.length}):</Text>
                    {syncResult.errors.slice(0, 5).map((err, idx) => (
                      <Text key={idx} style={styles.errorItem}>• {err}</Text>
                    ))}
                    {syncResult.errors.length > 5 && (
                      <Text style={[styles.errorItem, { fontStyle: 'italic' }]}>... e mais {syncResult.errors.length - 5} alertas.</Text>
                    )}
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, paddingBottom: spacing.sm },
  title: { fontSize: font.h1, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: font.caption, color: colors.textSecondary },
  fabSmall: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md, marginBottom: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  search: { flex: 1, fontSize: font.body, color: colors.text },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  emptyText: { fontSize: font.body, color: colors.textSecondary, marginTop: spacing.md },
  emptyBtn: { marginTop: spacing.lg, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.full },
  emptyBtnText: { color: '#fff', fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
    gap: spacing.md,
  },
  noteCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F2EBDB',
    alignItems: 'center', justifyContent: 'center',
  },
  songTitle: { fontSize: font.body, fontWeight: '700', color: colors.text },
  songArtist: { fontSize: font.caption, color: colors.textSecondary, marginTop: 2 },
  badges: { flexDirection: 'row', gap: 6, marginTop: 6 },
  badge: { backgroundColor: colors.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  badgeText: { fontSize: font.small, color: colors.text, fontWeight: '600' },
  linkIcons: { flexDirection: 'row', gap: 8 },
  
  // Estilos do Modal Google Drive Import
  modalSafe: { flex: 1, backgroundColor: colors.bg },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerBtn: { minWidth: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: font.h3, fontWeight: '700', color: colors.text, flex: 1, textAlign: 'center' },
  modalSub: { fontSize: font.caption, color: colors.textSecondary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, textAlign: 'center', lineHeight: 18 },
  modalScroll: { padding: spacing.md, paddingBottom: spacing.xl },
  cardInfo: { flexDirection: 'row', gap: 10, backgroundColor: '#EDF2FF', borderLeftWidth: 4, borderLeftColor: colors.primary, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
  infoTitle: { fontSize: font.body, fontWeight: '700', color: colors.text, marginBottom: 4 },
  infoText: { fontSize: font.caption, color: colors.textSecondary, lineHeight: 18 },
  sectionImport: { backgroundColor: colors.surface, borderHeight: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1 },
  inputLabel: { fontSize: font.caption, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5, marginBottom: spacing.md },
  inputSubLabel: { fontSize: font.small, fontWeight: '700', color: colors.text, marginBottom: 6 },
  inputHelper: { fontSize: font.caption, color: colors.textSecondary, lineHeight: 16, marginBottom: spacing.md },
  inputWrap: { marginBottom: spacing.md },
  input: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: font.body, color: colors.text },
  btnPrimary: { backgroundColor: colors.primary, paddingVertical: 12, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: font.body, fontWeight: '700' },
  dividerWrap: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { marginHorizontal: spacing.md, color: colors.textMuted, fontSize: font.small, fontWeight: '700' },
  progressBox: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, alignItems: 'center', marginVertical: spacing.md },
  progressTitle: { fontSize: font.body, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  progressSub: { fontSize: font.caption, color: colors.textSecondary, textAlign: 'center', lineHeight: 16 },
  resultBox: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.success, padding: spacing.md, marginVertical: spacing.md, alignItems: 'center' },
  resultTitle: { fontSize: font.body, fontWeight: '700', color: colors.success, marginBottom: spacing.xs },
  resultText: { fontSize: font.caption, color: colors.text, textAlign: 'center', lineHeight: 16 },
  errorLabel: { fontSize: font.caption, fontWeight: '700', color: colors.error, marginBottom: spacing.xs, marginTop: 4, width: '100%' },
  errorItem: { fontSize: font.small, color: colors.textSecondary, marginBottom: 2, width: '100%' },
});
