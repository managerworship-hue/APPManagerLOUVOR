import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Platform,
  Modal, FlatList, ActivityIndicator, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import { api } from '@/src/api/client';
import { storage } from '@/src/utils/storage';
import { useTheme } from '@/src/context/ThemeContext';
import { radius, font, spacing } from '@/src/theme';
import versionData from '@/src/version.json';

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
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const router = useRouter();
  const { user, ministry, isLeader, logout, setUser } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [instrumentModal, setInstrumentModal] = useState(false);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>(user?.instruments ?? []);
  const [savingInstruments, setSavingInstruments] = useState(false);

  // Estados da Integração Google Drive
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const [clientId, setClientId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [syncResult, setSyncResult] = useState<{ success: boolean; count: number; errors: string[] } | null>(null);

  // Estados Adicionais da Sincronização Permanente
  const [activeTab, setActiveTab] = useState<'session' | 'permanent'>('permanent');
  const [permanentConfigured, setPermanentConfigured] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [savingPermanent, setSavingPermanent] = useState(false);

  // Carregar configurações do Google ao abrir o modal
  useEffect(() => {
    if (syncModalVisible && isLeader) {
      // Carregar Client ID local se houver
      storage.getItem('google_client_id', '').then((saved) => {
        if (saved) setClientId(saved);
      });
      // Verificar se há credenciais permanentes no backend
      api<{ configured: boolean; client_id?: string }>('/songs/import/google-drive/config')
        .then((res) => {
          setPermanentConfigured(res.configured);
          if (res.client_id) {
            setClientId(res.client_id);
          }
        })
        .catch(() => {});
    }
  }, [syncModalVisible, isLeader]);

  const handleSavePermanentConfig = async () => {
    if (!clientId.trim() || !clientSecret.trim() || !refreshToken.trim()) {
      if (Platform.OS === 'web') {
        window.alert('Por favor, preencha todos os campos da conexão permanente.');
      } else {
        Alert.alert('Erro', 'Por favor, preencha todos os campos da conexão permanente.');
      }
      return;
    }

    setSavingPermanent(true);
    setSyncResult(null);
    try {
      await api('/songs/import/google-drive/config', {
        method: 'POST',
        body: {
          client_id: clientId.trim(),
          client_secret: clientSecret.trim(),
          refresh_token: refreshToken.trim(),
        },
      });

      // Guardar o Client ID local para preenchimento futuro
      await storage.setItem('google_client_id', clientId.trim());
      setPermanentConfigured(true);
      setClientSecret('');
      setRefreshToken('');
      
      if (Platform.OS === 'web') {
        window.alert('Sincronização permanente configurada com sucesso!');
      } else {
        Alert.alert('Sucesso', 'Sincronização permanente configurada com sucesso!');
      }
    } catch (e: any) {
      if (Platform.OS === 'web') {
        window.alert(e.message || 'Erro ao validar as credenciais.');
      } else {
        Alert.alert('Erro', e.message || 'Erro ao validar as credenciais.');
      }
    } finally {
      setSavingPermanent(false);
    }
  };

  const handleDeletePermanentConfig = async () => {
    const doDelete = async () => {
      try {
        await api('/songs/import/google-drive/config', { method: 'DELETE' });
        setPermanentConfigured(false);
        if (Platform.OS === 'web') {
          window.alert('Sincronização permanente desativada.');
        } else {
          Alert.alert('Desativado', 'Sincronização permanente desativada.');
        }
      } catch (e: any) {
        if (Platform.OS === 'web') {
          window.alert('Erro ao desativar: ' + e.message);
        } else {
          Alert.alert('Erro', 'Erro ao desativar: ' + e.message);
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Tem certeza de que deseja remover as credenciais salvas no servidor?')) {
        await doDelete();
      }
    } else {
      Alert.alert(
        'Remover Credenciais',
        'Tem certeza de que deseja remover as credenciais salvas no servidor?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Remover', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  const handlePermanentSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    setProgressText('A contactar o servidor e a renovar token do Google Drive...');
    
    try {
      const res = await api<{ ok: boolean; imported_count: number; errors: string[] }>('/songs/import/google-drive/sync', {
        method: 'POST',
      });
      
      setSyncResult({
        success: true,
        count: res.imported_count,
        errors: res.errors,
      });
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

  const handleDeleteMinistry = async () => {
    const doDelete = async () => {
      try {
        await api('/ministry', { method: 'DELETE' });
        if (Platform.OS === 'web') {
          window.alert('Ministério excluído com sucesso!');
        } else {
          Alert.alert('Sucesso', 'Ministério excluído com sucesso!');
        }
        await logout();
        router.replace('/login');
      } catch (e: any) {
        if (Platform.OS === 'web') {
          window.alert('Erro ao excluir: ' + (e.message || ''));
        } else {
          Alert.alert('Erro', e.message || 'Falha ao excluir ministério');
        }
      }
    };

    const msg = 'Tem certeza de que deseja excluir permanentemente o seu ministério? Esta ação é irreversível e apagará todas as escalas, músicas, avisos e membros cadastrados.';
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) {
        await doDelete();
      }
    } else {
      Alert.alert(
        'Excluir Ministério',
        msg,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Excluir', style: 'destructive', onPress: doDelete },
        ]
      );
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

            <View style={styles.actionDivider} />

            {/* Modo Escuro */}
            <TouchableOpacity style={styles.action} onPress={toggleTheme} activeOpacity={0.7}>
              <View style={[styles.actionIcon, { backgroundColor: theme === 'dark' ? '#333' : '#E6F0EA' }]}>
                <Ionicons name={theme === 'dark' ? 'moon' : 'sunny-outline'} size={18} color={theme === 'dark' ? '#FBBF24' : colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>Modo Escuro</Text>
                <Text style={styles.actionSubtitle}>{theme === 'dark' ? 'Ativo' : 'Desativado'}</Text>
              </View>
              <Ionicons name={theme === 'dark' ? 'toggle' : 'toggle-outline'} size={28} color={theme === 'dark' ? colors.success : colors.textMuted} />
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
            {isLeader && (
              <>
                <View style={styles.actionDivider} />
                <TouchableOpacity style={styles.action} onPress={handleDeleteMinistry} activeOpacity={0.7}>
                  <View style={[styles.actionIcon, { backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#FDE8E8' }]}>
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.actionTitle, { color: colors.error }]}>Excluir Ministério</Text>
                    <Text style={styles.actionSubtitle}>Apagar permanentemente o ministério e todos os dados</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </>
            )}
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

              <View style={styles.actionDivider} />

              <TouchableOpacity style={styles.action} onPress={() => setSyncModalVisible(true)}>
                <View style={[styles.actionIcon, { backgroundColor: '#E8F0FE' }]}>
                  <Ionicons name="logo-google" size={18} color="#4285F4" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionTitle}>Google Drive Sync</Text>
                  <Text style={styles.actionSubtitle}>Sincronizar músicas e cifras</Text>
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

        <Text style={styles.version}>Worship Manager · v{versionData.version}{versionData.build ? ` (${versionData.build})` : ''}</Text>
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

      {/* Modal de Importação Google Drive */}
      <Modal
        visible={syncModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSyncModalVisible(false)}
      >
        <SafeAreaView style={styles.syncModalSafe} edges={['top', 'bottom']}>
          <View style={styles.syncModalHeader}>
            <TouchableOpacity onPress={() => setSyncModalVisible(false)} style={styles.syncHeaderBtn}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.syncModalTitle}>Google Drive Sync</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView contentContainerStyle={styles.syncModalScroll}>
            <Text style={styles.syncModalSub}>
              Importe as suas letras e cifras diretamente do seu Drive de forma rápida!
            </Text>

            <View style={styles.cardInfo}>
              <Ionicons name="information-circle-outline" size={18} color={colors.primary} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Estrutura esperada no Google Drive:</Text>
                <Text style={styles.infoText}>
                  1. Uma pasta com o nome exato <Text style={{ fontWeight: '700' }}>Louvor</Text> na raiz do seu Drive.{"\n"}
                  2. Dentro dela, subpastas para cada música.{"\n"}
                  3. Em cada subpasta, um arquivo <Text style={{ fontWeight: '700' }}>.docx</Text>, <Text style={{ fontWeight: '700' }}>.pdf</Text> ou documento do <Text style={{ fontWeight: '700' }}>Google Docs</Text> com o título:{"\n"}
                  <Text style={{ fontStyle: 'italic', fontWeight: '600', color: colors.primary }}>[NOME DA MÚSICA - TOM - BPM]</Text>{"\n"}
                  (ex: <Text style={{ fontStyle: 'italic' }}>Aclame ao Senhor - G - 120</Text>) e a letra com as cifras abaixo.
                </Text>
              </View>
            </View>

            {/* Seletor de Abas */}
            <View style={styles.tabSelector}>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'permanent' && styles.tabBtnActive]}
                onPress={() => { setActiveTab('permanent'); setSyncResult(null); }}
              >
                <Ionicons name="flash-outline" size={16} color={activeTab === 'permanent' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.tabBtnText, activeTab === 'permanent' && styles.tabBtnTextActive]}>
                  Permanente
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'session' && styles.tabBtnActive]}
                onPress={() => { setActiveTab('session'); setSyncResult(null); }}
              >
                <Ionicons name="key-outline" size={16} color={activeTab === 'session' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.tabBtnText, activeTab === 'session' && styles.tabBtnTextActive]}>
                  Sessão (Token)
                </Text>
              </TouchableOpacity>
            </View>

            {activeTab === 'permanent' && (
              <View style={{ gap: spacing.md }}>
                {permanentConfigured ? (
                  <View style={styles.permanentConfiguredCard}>
                    <Ionicons name="checkmark-circle-outline" size={32} color={colors.success} style={{ marginBottom: spacing.xs }} />
                    <Text style={styles.permanentConfiguredTitle}>Conexão Permanente Ativa!</Text>
                    <Text style={styles.permanentConfiguredSub}>
                      As credenciais do Google Drive estão configuradas e prontas. O seu ministério pode sincronizar músicas a qualquer momento com 1 clique!
                    </Text>

                    <TouchableOpacity
                      style={[styles.btnPrimary, { width: '100%', marginTop: spacing.md }, syncing && { opacity: 0.6 }]}
                      onPress={handlePermanentSync}
                      disabled={syncing}
                    >
                      {syncing ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.btnPrimaryText}>Sincronizar Agora (1-Clique)</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{ marginTop: spacing.lg }}
                      onPress={handleDeletePermanentConfig}
                    >
                      <Text style={{ color: colors.error, fontWeight: '600', fontSize: font.caption, textDecorationLine: 'underline' }}>
                        Desativar Conexão Permanente
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.sectionImport}>
                    <Text style={styles.inputLabel}>CONFIGURAR SINCRONIZAÇÃO PERMANENTE</Text>
                    <Text style={styles.inputHelper}>
                      Configure uma vez e sincronize para sempre sem precisar introduzir tokens todas as vezes!
                      {"\n\n"}
                      1. Crie uma aplicação na <Text style={{fontWeight: '700'}}>Google Cloud Console</Text> para obter o seu <Text style={{fontWeight: '700'}}>Client ID</Text> e <Text style={{fontWeight: '700'}}>Client Secret</Text>.
                      {"\n"}
                      2. Vá ao <Text style={{fontWeight: '700'}}>Google OAuth Playground</Text> (link abaixo), selecione o escopo "drive.readonly" e autorize.
                      {"\n"}
                      3. No Passo 2, clique em "Exchange authorization code" e copie o seu <Text style={{fontWeight: '700'}}>Refresh Token</Text> permanente!
                    </Text>

                    <View style={styles.inputWrap}>
                      <Text style={styles.inputSubLabel}>Google Client ID:</Text>
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

                    <View style={styles.inputWrap}>
                      <Text style={styles.inputSubLabel}>Google Client Secret:</Text>
                      <TextInput
                        value={clientSecret}
                        onChangeText={setClientSecret}
                        placeholder="GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx"
                        placeholderTextColor={colors.textMuted}
                        style={styles.input}
                        autoCapitalize="none"
                        autoCorrect={false}
                        secureTextEntry
                      />
                    </View>

                    <View style={styles.inputWrap}>
                      <Text style={styles.inputSubLabel}>Google Refresh Token:</Text>
                      <TextInput
                        value={refreshToken}
                        onChangeText={setRefreshToken}
                        placeholder="1//0xxxxxxxxxxxxxxxxxxxxxx..."
                        placeholderTextColor={colors.textMuted}
                        style={styles.input}
                        autoCapitalize="none"
                        autoCorrect={false}
                        secureTextEntry
                      />
                    </View>

                    <TouchableOpacity
                      style={[styles.btnPrimary, { backgroundColor: colors.success }, savingPermanent && { opacity: 0.6 }]}
                      onPress={handleSavePermanentConfig}
                      disabled={savingPermanent}
                    >
                      {savingPermanent ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.btnPrimaryText}>Gravar e Ativar Permanente</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {activeTab === 'session' && (
              <View style={{ gap: spacing.md }}>
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
              </View>
            )}

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
                    {syncResult.errors.slice(0, 8).map((err, idx) => (
                      <Text key={idx} style={styles.errorItem}>• {err}</Text>
                    ))}
                    {syncResult.errors.length > 8 && (
                      <Text style={[styles.errorItem, { fontStyle: 'italic' }]}>... e mais {syncResult.errors.length - 8} alertas.</Text>
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

const getStyles = (colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  title: { fontSize: font.h1, fontWeight: '700', color: colors.text, letterSpacing: -0.5, marginBottom: spacing.lg },
  userCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg },
  avatarWrap: { position: 'relative', marginBottom: spacing.sm },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.bg, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 38 },
  avatarText: { color: colors.primary, fontSize: 32, fontWeight: '700' },
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

  // Estilos do Modal Google Drive Import
  syncModalSafe: { flex: 1, backgroundColor: colors.bg },
  syncModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  syncHeaderBtn: { minWidth: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  syncModalTitle: { fontSize: font.h3, fontWeight: '700', color: colors.text, flex: 1, textAlign: 'center' },
  syncModalSub: { fontSize: font.caption, color: colors.textSecondary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, textAlign: 'center', lineHeight: 18 },
  syncModalScroll: { padding: spacing.md, paddingBottom: spacing.xl },
  cardInfo: { flexDirection: 'row', gap: 10, backgroundColor: '#EDF2FF', borderLeftWidth: 4, borderLeftColor: colors.primary, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
  infoTitle: { fontSize: font.body, fontWeight: '700', color: colors.text, marginBottom: 4 },
  infoText: { fontSize: font.caption, color: colors.textSecondary, lineHeight: 18 },
  sectionImport: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
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

  // Estilos da Sincronização Permanente
  tabSelector: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: radius.md, padding: 4, marginBottom: spacing.lg, borderColor: colors.border, borderWidth: 1 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: radius.sm },
  tabBtnActive: { backgroundColor: colors.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
  tabBtnText: { fontSize: font.body, color: colors.textSecondary, fontWeight: '600' },
  tabBtnTextActive: { color: colors.primary, fontWeight: '700' },
  permanentConfiguredCard: { backgroundColor: '#E6F0EA', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.success, padding: spacing.lg, alignItems: 'center' },
  permanentConfiguredTitle: { fontSize: font.h3, fontWeight: '700', color: '#1B5E20', marginBottom: 6, textAlign: 'center' },
  permanentConfiguredSub: { fontSize: font.caption, color: '#2E7D32', textAlign: 'center', lineHeight: 18 },
});
