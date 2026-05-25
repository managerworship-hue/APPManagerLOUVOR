import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Share, Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { radius, font, spacing } from '@/src/theme';

// URL pública da app — ajusta se o domínio mudar
const APP_URL = 'https://appmanager-louvor.onrender.com';

export default function ConvidarScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const router = useRouter();
  const { ministry } = useAuth();
  const [copied, setCopied] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);

  const code = ministry?.invite_code || '------';

  const message =
    `🎵 Junte-se ao ministério *${ministry?.name}* no LouvorApp!\n\n` +
    `📱 Acesse a app: ${APP_URL}\n\n` +
    `🔑 Código de convite: *${code}*\n\n` +
    `Cadastre-se na app e insira o código acima para entrar no ministério.`;

  const copyCode = async () => {
    try {
      await Clipboard.setStringAsync(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const copyFull = async () => {
    try {
      await Clipboard.setStringAsync(message);
      setCopiedFull(true);
      setTimeout(() => setCopiedFull(false), 2000);
    } catch {}
  };

  const shareGeneric = async () => {
    try {
      await Share.share({ message });
    } catch {}
  };

  const shareWhats = async () => {
    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
    try {
      const { Linking } = require('react-native');
      const can = await Linking.canOpenURL(url);
      if (can) Linking.openURL(url);
      else shareGeneric();
    } catch { shareGeneric(); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity testID="back-button" onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Convidar</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="people" size={28} color={colors.gold} />
          </View>
          <Text style={styles.heroTitle}>Convide a sua equipa</Text>
          <Text style={styles.heroSub}>
            Partilhe o link e o código para que novos músicos entrem no ministério.
          </Text>
        </View>

        {/* Card com código */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>CÓDIGO DE CONVITE</Text>
          <Text style={styles.codeValue} testID="invite-code-value">{code}</Text>
          <TouchableOpacity
            testID="copy-code-button"
            style={[styles.copyBtn, copied && { backgroundColor: colors.success }]}
            onPress={copyCode}
            activeOpacity={0.85}
          >
            <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color="#fff" />
            <Text style={styles.copyText}>{copied ? 'Copiado!' : 'Copiar código'}</Text>
          </TouchableOpacity>
        </View>

        {/* URL da app */}
        <View style={styles.urlCard}>
          <View style={styles.urlRow}>
            <Ionicons name="link-outline" size={18} color={colors.primary} />
            <Text style={styles.urlText} numberOfLines={1}>{APP_URL}</Text>
          </View>
          <Text style={styles.urlCaption}>
            Os membros devem aceder a este endereço, criar conta e inserir o código acima.
          </Text>
        </View>

        {/* Copiar mensagem completa */}
        <TouchableOpacity
          style={[styles.copyFullBtn, copiedFull && { borderColor: colors.success }]}
          onPress={copyFull}
          activeOpacity={0.85}
        >
          <Ionicons
            name={copiedFull ? 'checkmark-circle' : 'clipboard-outline'}
            size={18}
            color={copiedFull ? colors.success : colors.primary}
          />
          <Text style={[styles.copyFullText, copiedFull && { color: colors.success }]}>
            {copiedFull ? 'Mensagem copiada!' : 'Copiar mensagem completa'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.shareLabel}>PARTILHAR VIA</Text>

        <TouchableOpacity testID="share-whatsapp-button" style={styles.shareBtn} onPress={shareWhats}>
          <View style={[styles.shareIcon, { backgroundColor: '#25D366' }]}>
            <Ionicons name="logo-whatsapp" size={18} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.shareTitle}>WhatsApp</Text>
            <Text style={styles.shareSub}>Enviar pelo WhatsApp</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity testID="share-system-button" style={styles.shareBtn} onPress={shareGeneric}>
          <View style={[styles.shareIcon, { backgroundColor: colors.primary }]}>
            <Ionicons name="share-outline" size={18} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.shareTitle}>Outras opções</Text>
            <Text style={styles.shareSub}>SMS, email, redes sociais</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.info}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.infoText}>
            Novos membros entram com permissão de visualização. O líder pode gerir permissões na tela de Membros.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: font.h3, fontWeight: '700', color: colors.text },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  hero: { alignItems: 'center', marginBottom: spacing.lg, marginTop: spacing.md },
  heroIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#F2EBDB', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  heroTitle: { fontSize: font.h2, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  heroSub: { fontSize: font.body, color: colors.textSecondary, textAlign: 'center', marginTop: 6, paddingHorizontal: 20 },
  codeCard: { backgroundColor: colors.primary, borderRadius: radius.xl, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.md },
  codeLabel: { fontSize: font.small, color: colors.gold, fontWeight: '700', letterSpacing: 2 },
  codeValue: { fontSize: 40, color: '#fff', fontWeight: '700', letterSpacing: 8, marginVertical: spacing.md },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.gold, paddingHorizontal: 20, paddingVertical: 12, borderRadius: radius.full },
  copyText: { color: '#fff', fontWeight: '700' },
  urlCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md },
  urlRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  urlText: { fontSize: font.body, color: colors.primary, fontWeight: '600', flex: 1 },
  urlCaption: { fontSize: font.caption, color: colors.textSecondary, lineHeight: 18 },
  copyFullBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, marginBottom: spacing.lg, backgroundColor: '#F7F9FF' },
  copyFullText: { fontSize: font.body, color: colors.primary, fontWeight: '600' },
  shareLabel: { fontSize: font.small, fontWeight: '700', color: colors.textSecondary, letterSpacing: 1, marginBottom: spacing.sm },
  shareBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm, marginBottom: spacing.sm },
  shareIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  shareTitle: { fontSize: font.body, fontWeight: '600', color: colors.text },
  shareSub: { fontSize: font.caption, color: colors.textSecondary, marginTop: 2 },
  info: { flexDirection: 'row', gap: 8, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, marginTop: spacing.md, borderWidth: 1, borderColor: colors.border },
  infoText: { flex: 1, fontSize: font.caption, color: colors.textSecondary, lineHeight: 18 },
});
