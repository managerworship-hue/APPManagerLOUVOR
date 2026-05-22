import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import { colors, radius, font, spacing } from '@/src/theme';

type Mode = 'create' | 'join';

export default function RegisterScreen() {
  const router = useRouter();
  const { signup } = useAuth();
  const [mode, setMode] = useState<Mode>('create');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ministryName, setMinistryName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name || !email || !password) {
      Alert.alert('Atenção', 'Preencha todos os campos obrigatórios.');
      return;
    }
    if (mode === 'create' && !ministryName) {
      Alert.alert('Atenção', 'Informe o nome do ministério.');
      return;
    }
    if (mode === 'join' && !inviteCode) {
      Alert.alert('Atenção', 'Informe o código de convite.');
      return;
    }
    setLoading(true);
    try {
      await signup({
        name: name.trim(),
        email: email.trim(),
        password,
        ministry_name: mode === 'create' ? ministryName.trim() : undefined,
        invite_code: mode === 'join' ? inviteCode.trim().toUpperCase() : undefined,
      });
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Falha ao cadastrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Link href="/login" asChild>
            <TouchableOpacity testID="back-to-login" style={styles.back}>
              <Ionicons name="chevron-back" size={22} color={colors.text} />
              <Text style={styles.backText}>Voltar</Text>
            </TouchableOpacity>
          </Link>

          <View style={styles.card}>
            <Text style={styles.title}>Criar conta</Text>
            <Text style={styles.subtitle}>Comece a organizar seu ministério</Text>

            <View style={styles.tabs}>
              <TouchableOpacity
                testID="mode-create-ministry"
                style={[styles.tab, mode === 'create' && styles.tabActive]}
                onPress={() => setMode('create')}
              >
                <Text style={[styles.tabText, mode === 'create' && styles.tabTextActive]}>
                  Novo Ministério
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="mode-join-ministry"
                style={[styles.tab, mode === 'join' && styles.tabActive]}
                onPress={() => setMode('join')}
              >
                <Text style={[styles.tabText, mode === 'join' && styles.tabTextActive]}>
                  Tenho um convite
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>SEU NOME</Text>
              <TextInput
                testID="register-name-input"
                value={name}
                onChangeText={setName}
                placeholder="Nome completo"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>EMAIL</Text>
              <TextInput
                testID="register-email-input"
                value={email}
                onChangeText={setEmail}
                placeholder="seu@email.com"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>SENHA</Text>
              <TextInput
                testID="register-password-input"
                value={password}
                onChangeText={setPassword}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                style={styles.input}
              />
            </View>

            {mode === 'create' ? (
              <View style={styles.field}>
                <Text style={styles.label}>NOME DO MINISTÉRIO</Text>
                <TextInput
                  testID="register-ministry-name-input"
                  value={ministryName}
                  onChangeText={setMinistryName}
                  placeholder="Ex: Ministério de Louvor"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
              </View>
            ) : (
              <View style={styles.field}>
                <Text style={styles.label}>CÓDIGO DE CONVITE</Text>
                <TextInput
                  testID="register-invite-code-input"
                  value={inviteCode}
                  onChangeText={(v) => setInviteCode(v.toUpperCase())}
                  placeholder="ABC123"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  maxLength={6}
                  style={[styles.input, { letterSpacing: 6, fontWeight: '700' }]}
                />
              </View>
            )}

            <TouchableOpacity
              testID="register-submit-button"
              style={[styles.button, loading && { opacity: 0.6 }]}
              onPress={submit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {mode === 'create' ? 'Criar ministério' : 'Entrar no ministério'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, padding: spacing.lg, paddingTop: spacing.md },
  back: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, alignSelf: 'flex-start' },
  backText: { color: colors.text, fontSize: font.body, fontWeight: '500' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: font.h2, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  subtitle: { fontSize: font.caption, color: colors.textSecondary, marginTop: 4, marginBottom: spacing.lg },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.lg,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.sm },
  tabActive: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabText: { fontSize: font.caption, color: colors.textSecondary, fontWeight: '500' },
  tabTextActive: { color: colors.text, fontWeight: '700' },
  field: { marginBottom: spacing.md },
  label: { fontSize: font.small, fontWeight: '700', color: colors.textSecondary, letterSpacing: 1, marginBottom: 6 },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: font.body,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonText: { color: '#fff', fontSize: font.body, fontWeight: '600', letterSpacing: 0.3 },
});
