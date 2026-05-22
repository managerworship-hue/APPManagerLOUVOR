import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Share, Platform, Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import { colors, radius, font, spacing } from '@/src/theme';

export default function ConvidarScreen() {
  const router = useRouter();
  const { ministry } = useAuth();
  const [copied, setCopied] = useState(false);

  const code = ministry?.invite_code || '------';
  const message = `Junte-se ao ministério ${ministry?.name} no LouvorApp!\n\nCódigo de convite: ${code}\n\nBaixe o app e cadastre-se usando este código.`;

  const copy = async () => {
    try {
      await Clipboard.setStringAsync(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
      const Linking = require('react-native').Linking;
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
          <Text style={styles.heroTitle}>Convide sua equipe</Text>
          <Text style={styles.heroSub}>
            Compartilhe o código abaixo para que novos músicos entrem no ministério.
          </Text>
        </View>

        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>CÓDIGO DE CONVITE</Text>
          <Text style={styles.codeValue} testID="invite-code-value">{code}</Text>
          <TouchableOpacity
            testID="copy-code-button"
            style={[styles.copyBtn, copied && { backgroundColor: colors.success }]}
            onPress={copy}
            activeOpacity={0.85}
          >
            <Ionicons
              name={copied ? 'checkmark' : 'copy-outline'}
              size={16}
              color="#fff"
            />
            <Text style={styles.copyText}>{copied ? 'Copiado!' : 'Copiar código'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.shareLabel}>COMPARTILHAR VIA</Text>

        <TouchableOpacity testID="share-whatsapp-button" style={styles.shareBtn} onPress={shareWhats}>
          <View style={[styles.shareIcon, { backgroundColor: '#25D366' }]}>
            <Ionicons name="logo-whatsapp" size={18} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.shareTitle}>WhatsApp</Text>
            <Text style={styles.shareSub}>Envie pelo aplicativo</Text>
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
            Novos membros entram com permissão de visualização. O líder pode liberar permissões na tela de Membros.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: font.h3, fontWeight: '700', color: colors.text },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  hero: { alignItems: 'center', marginBottom: spacing.lg, marginTop: spacing.md },
  heroIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#F2EBDB', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  heroTitle: { fontSize: font.h2, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  heroSub: { fontSize: font.body, color: colors.textSecondary, textAlign: 'center', marginTop: 6, paddingHorizontal: 20 },
  codeCard: { backgroundColor: colors.primary, borderRadius: radius.xl, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.lg },
  codeLabel: { fontSize: font.small, color: colors.gold, fontWeight: '700', letterSpacing: 2 },
  codeValue: { fontSize: 40, color: '#fff', fontWeight: '700', letterSpacing: 8, marginVertical: spacing.md },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.gold, paddingHorizontal: 20, paddingVertical: 12, borderRadius: radius.full },
  copyText: { color: '#fff', fontWeight: '700' },
  shareLabel: { fontSize: font.small, fontWeight: '700', color: colors.textSecondary, letterSpacing: 1, marginBottom: spacing.sm },
  shareBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm, marginBottom: spacing.sm },
  shareIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  shareTitle: { fontSize: font.body, fontWeight: '600', color: colors.text },
  shareSub: { fontSize: font.caption, color: colors.textSecondary, marginTop: 2 },
  info: { flexDirection: 'row', gap: 8, backgroundColor: colors.surfaceAlt, padding: spacing.md, borderRadius: radius.md, marginTop: spacing.md },
  infoText: { flex: 1, fontSize: font.caption, color: colors.textSecondary, lineHeight: 18 },
});
