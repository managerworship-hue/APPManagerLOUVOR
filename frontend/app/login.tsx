import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Image,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { radius, font, spacing } from '@/src/theme';

// Ícone: na web usa URL pública; no nativo usa require local
const APP_ICON =
  Platform.OS === 'web'
    ? { uri: '/icons/icon.png' }
    : require('../assets/images/icon.png');

export default function LoginScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !password) {
      if (Platform.OS === 'web') { window.alert('Preencha email e senha.'); }
      else { Alert.alert('Atenção', 'Preencha email e senha.'); }
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (e: any) {
      if (Platform.OS === 'web') { window.alert('Erro: ' + (e.message || 'Falha ao entrar')); }
      else { Alert.alert('Erro', e.message || 'Falha ao entrar'); }
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
          <View style={styles.brand}>
            <View style={styles.brandMark}>
              <Image source={APP_ICON} style={styles.brandIcon} resizeMode="cover" />
            </View>
            <Text style={styles.brandTitle}>Worship Manager</Text>
            <Text style={styles.brandSubtitle}>Gestão de ministério de louvor</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Entrar</Text>
            <Text style={styles.subtitle}>Acesse sua conta para continuar</Text>

            <View style={styles.field}>
              <Text style={styles.label}>EMAIL</Text>
              <TextInput
                testID="login-email-input"
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
              <View style={styles.inputWrap}>
                <TextInput
                  testID="login-password-input"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPwd}
                  style={[styles.input, { paddingRight: 44 }]}
                />
                <TouchableOpacity
                  testID="toggle-password-visibility"
                  style={styles.eye}
                  onPress={() => setShowPwd(!showPwd)}
                >
                  <Ionicons
                    name={showPwd ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              testID="login-submit-button"
              style={[styles.button, loading && { opacity: 0.6 }]}
              onPress={submit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Entrar</Text>}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OU</Text>
              <View style={styles.dividerLine} />
            </View>

            <Link href="/register" asChild>
              <TouchableOpacity testID="go-to-register-button" style={styles.buttonGhost} activeOpacity={0.85}>
                <Text style={styles.buttonGhostText}>Criar nova conta</Text>
              </TouchableOpacity>
            </Link>
          </View>

          <Text style={styles.footer}>Construído com fé para o seu ministério.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  brand: { alignItems: 'center', marginBottom: spacing.xl },
  brandMark: {
    width: 80, height: 80, borderRadius: 20,
    overflow: 'hidden',
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  brandIcon: { width: 80, height: 80 },
  brandTitle: { fontSize: 28, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
  brandSubtitle: { fontSize: font.caption, color: colors.textSecondary, marginTop: 4 },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  title: { fontSize: font.h2, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  subtitle: { fontSize: font.caption, color: colors.textSecondary, marginTop: 4, marginBottom: spacing.lg },
  field: { marginBottom: spacing.md },
  label: { fontSize: font.small, fontWeight: '700', color: colors.textSecondary, letterSpacing: 1, marginBottom: 6 },
  inputWrap: { position: 'relative' },
  input: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 14, fontSize: font.body, color: colors.text },
  eye: { position: 'absolute', right: 12, top: 14 },
  button: { backgroundColor: colors.primary, borderRadius: radius.full, paddingVertical: 16, alignItems: 'center', marginTop: spacing.sm },
  buttonText: { color: '#fff', fontSize: font.body, fontWeight: '600', letterSpacing: 0.3 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: font.small, color: colors.textMuted, marginHorizontal: spacing.sm, letterSpacing: 1 },
  buttonGhost: { backgroundColor: 'transparent', borderRadius: radius.full, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  buttonGhostText: { color: colors.text, fontSize: font.body, fontWeight: '600' },
  footer: { textAlign: 'center', color: colors.textMuted, fontSize: font.small, marginTop: spacing.lg },
});
