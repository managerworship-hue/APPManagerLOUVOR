import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import { api, API_BASE } from '@/src/api/client';
import { useTheme } from '@/src/context/ThemeContext';
import { radius, font, spacing } from '@/src/theme';

const ENDPOINTS = [
  {
    method: 'GET',
    path: '/api/external/ministry',
    desc: 'Retorna dados básicos do ministério.',
  },
  {
    method: 'GET',
    path: '/api/external/songs',
    desc: 'Lista completa de músicas com tom e BPM.',
  },
  {
    method: 'GET',
    path: '/api/external/scales?upcoming=true&limit=50',
    desc: 'Lista de escalas com setlist hidratado (música, BPM, links).',
  },
  {
    method: 'GET',
    path: '/api/external/scales/{id}',
    desc: 'Detalhe de uma escala específica com letras.',
  },
];

const JESUSMEAJUDA_STEPS = [
  'Abre a app JesusMeAjuda no browser.',
  'No painel esquerdo, clica em "Worship Manager" no fundo.',
  'Clica em "Configurar ligação".',
  'Cola o URL do servidor (Base URL abaixo) e a tua API Key.',
  'Clica em "Ligar" — as escalas aparecem automaticamente.',
  'Clica em "Carregar" numa escala para usar o setlist no metrónomo.',
];


export default function ApiDocs() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const router = useRouter();
  const { ministry, isLeader, refresh } = useAuth();
  const [revealed, setRevealed] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const key = ministry?.api_key || '';

  const copy = async (text: string, isApiKey = false) => {
    try {
      await Clipboard.setStringAsync(text);
      if (isApiKey) {
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
      }
    } catch {}
  };

  const rotate = () => {
    Alert.alert(
      'Gerar nova API Key?',
      'A chave atual será invalidada. Você precisará atualizar todos os apps externos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Gerar nova', style: 'destructive', onPress: async () => {
          setRotating(true);
          try {
            await api('/ministry/api-key/rotate', { method: 'POST' });
            await refresh();
          } catch (e: any) {
            Alert.alert('Erro', e.message);
          } finally {
            setRotating(false);
          }
        } },
      ]
    );
  };

  const masked = key ? `${key.slice(0, 8)}${'•'.repeat(20)}${key.slice(-4)}` : '';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity testID="back-button" onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Integração API</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.intro}>
          <View style={styles.introIcon}>
            <Ionicons name="code-slash" size={24} color={colors.success} />
          </View>
          <Text style={styles.introTitle}>Conecte seu app PWA</Text>
          <Text style={styles.introText}>
            Use a API externa para projetar letras, exibir metrônomo ou criar dashboards no seu app PWA externo. Autentique requisições com o header <Text style={styles.code}>X-API-Key</Text>.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>SUA API KEY</Text>
        {isLeader ? (
          <View style={styles.keyCard}>
            <Text style={styles.keyText} numberOfLines={1}>
              {revealed ? key : masked}
            </Text>
            <View style={styles.keyActions}>
              <TouchableOpacity
                testID="reveal-key-button"
                style={styles.smallBtn}
                onPress={() => setRevealed(!revealed)}
              >
                <Ionicons name={revealed ? 'eye-off-outline' : 'eye-outline'} size={16} color={colors.text} />
                <Text style={styles.smallBtnText}>{revealed ? 'Ocultar' : 'Revelar'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="copy-key-button"
                style={[styles.smallBtn, copiedKey && { backgroundColor: colors.success, borderColor: colors.success }]}
                onPress={() => copy(key, true)}
              >
                <Ionicons name={copiedKey ? 'checkmark' : 'copy-outline'} size={16} color={copiedKey ? '#fff' : colors.text} />
                <Text style={[styles.smallBtnText, copiedKey && { color: '#fff' }]}>{copiedKey ? 'Copiado' : 'Copiar'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="rotate-key-button"
                style={[styles.smallBtn, { borderColor: '#F2D5D5' }]}
                onPress={rotate}
                disabled={rotating}
              >
                {rotating ? <ActivityIndicator size="small" color={colors.error} /> : (
                  <>
                    <Ionicons name="refresh-outline" size={16} color={colors.error} />
                    <Text style={[styles.smallBtnText, { color: colors.error }]}>Rotacionar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.keyCard}>
            <Text style={styles.muted}>Apenas o líder pode visualizar a API Key.</Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>BASE URL</Text>
        <TouchableOpacity style={styles.urlCard} onPress={() => copy(API_BASE)}>
          <Text style={styles.urlText} numberOfLines={1}>{API_BASE}</Text>
          <Ionicons name="copy-outline" size={14} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* ── JesusMeAjuda integration card ── */}
        <Text style={styles.sectionLabel}>INTEGRAÇÃO COM JESUSMEAJUDA</Text>
        <View style={styles.jmaCard}>
          <View style={styles.jmaHeader}>
            <View style={styles.jmaIconWrap}>
              <Ionicons name="musical-notes" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.jmaTitle}>Setlist Metrónomo</Text>
              <Text style={styles.jmaSubtitle}>Carrega escalas diretamente na app de metrónomo</Text>
            </View>
          </View>

          <View style={styles.jmaSteps}>
            {JESUSMEAJUDA_STEPS.map((step, i) => (
              <View key={i} style={styles.jmaStep}>
                <View style={styles.jmaStepNum}>
                  <Text style={styles.jmaStepNumText}>{i + 1}</Text>
                </View>
                <Text style={styles.jmaStepText}>{step}</Text>
              </View>
            ))}
          </View>

          <View style={styles.jmaCopyRow}>
            <TouchableOpacity style={styles.jmaCopyBtn} onPress={() => copy(API_BASE)}>
              <Ionicons name="link-outline" size={14} color={colors.primary} />
              <Text style={styles.jmaCopyBtnText}>Copiar URL</Text>
            </TouchableOpacity>
            {isLeader && key ? (
              <TouchableOpacity style={styles.jmaCopyBtn} onPress={() => copy(key, true)}>
                <Ionicons name={copiedKey ? 'checkmark' : 'key-outline'} size={14} color={copiedKey ? colors.success : colors.primary} />
                <Text style={[styles.jmaCopyBtnText, copiedKey && { color: colors.success }]}>
                  {copiedKey ? 'API Key copiada!' : 'Copiar API Key'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <Text style={styles.sectionLabel}>ENDPOINTS DISPONÍVEIS</Text>
        {ENDPOINTS.map((e) => (
          <View key={e.path} style={styles.endpoint}>
            <View style={styles.endpointHeader}>
              <View style={styles.methodPill}>
                <Text style={styles.methodText}>{e.method}</Text>
              </View>
              <Text style={styles.endpointPath} numberOfLines={1}>{e.path}</Text>
              <TouchableOpacity
                testID={`copy-endpoint-${e.path}`}
                onPress={() => copy(`${API_BASE.replace('/api', '')}${e.path}`)}
              >
                <Ionicons name="copy-outline" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.endpointDesc}>{e.desc}</Text>
          </View>
        ))}

        <Text style={styles.sectionLabel}>EXEMPLO (cURL)</Text>
        <View style={styles.codeBlock}>
          <Text style={styles.codeBlockText} selectable>
            {`curl -H "X-API-Key: ${isLeader && key ? key.slice(0, 12) + '...' : 'lvr_xxxxx...'}" \\\n  "${API_BASE}/external/scales?upcoming=true"`}
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
  intro: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg },
  introIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: '#E6F0EA', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  introTitle: { fontSize: font.h3, fontWeight: '700', color: colors.text },
  introText: { fontSize: font.caption, color: colors.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  code: { fontFamily: Platform_select(), backgroundColor: colors.surfaceAlt, color: colors.primary, fontWeight: '600' },
  sectionLabel: { fontSize: font.small, fontWeight: '700', color: colors.textSecondary, letterSpacing: 1, marginBottom: spacing.sm, marginTop: spacing.sm },
  keyCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md },
  keyText: { fontFamily: Platform_select(), fontSize: 13, color: colors.text, marginBottom: spacing.sm },
  keyActions: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  smallBtnText: { fontSize: font.caption, color: colors.text, fontWeight: '600' },
  muted: { color: colors.textMuted, fontSize: font.caption },
  urlCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md, gap: 8 },
  urlText: { flex: 1, fontFamily: Platform_select(), fontSize: 12, color: colors.text },
  endpoint: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm },
  endpointHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  methodPill: { backgroundColor: colors.success, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  methodText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  endpointPath: { flex: 1, fontFamily: Platform_select(), fontSize: 12, color: colors.text, fontWeight: '600' },
  endpointDesc: { fontSize: font.caption, color: colors.textSecondary, lineHeight: 18 },
  codeBlock: { backgroundColor: '#0F141E', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
  codeBlockText: { fontFamily: Platform_select(), fontSize: 12, color: '#E8E8E6', lineHeight: 20 },
  // JesusMeAjuda card
  jmaCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md },
  jmaHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  jmaIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#E6E9F0', alignItems: 'center', justifyContent: 'center' },
  jmaTitle: { fontSize: font.body, fontWeight: '700', color: colors.text },
  jmaSubtitle: { fontSize: font.caption, color: colors.textSecondary, marginTop: 2 },
  jmaSteps: { gap: 8, marginBottom: spacing.md },
  jmaStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  jmaStepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  jmaStepNumText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  jmaStepText: { flex: 1, fontSize: font.caption, color: colors.textSecondary, lineHeight: 20 },
  jmaCopyRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.xs },
  jmaCopyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.sm, backgroundColor: '#E6E9F0', borderWidth: 1, borderColor: colors.border },
  jmaCopyBtnText: { fontSize: font.caption, color: colors.primary, fontWeight: '700' },
});

function Platform_select(): string {
  // monospace font cross-platform
  const { Platform } = require('react-native');
  return Platform.OS === 'ios' ? 'Menlo' : 'monospace';
}
