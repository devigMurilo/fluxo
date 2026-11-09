import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/theme';
import { api, saveCustomApiUrl, DEFAULT_API_URL } from '../../services/api';

export default function LoginScreen() {
  const router = useRouter();
  const {
    login,
    biometricsSupported,
    biometricsEnrolled,
    biometricsEnabled,
    biometryType,
    biometryLabel,
    savedBiometricUser,
    loginWithBiometrics,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  // Preenche o e-mail automaticamente se houver usuário cadastrado na biometria
  useEffect(() => {
    if (savedBiometricUser?.email && !email) {
      setEmail(savedBiometricUser.email);
    }
  }, [savedBiometricUser]);

  // Modal para ajuste de IP do servidor em celular físico
  const [showApiModal, setShowApiModal] = useState(false);
  const [customUrl, setCustomUrl] = useState(api.defaults.baseURL || DEFAULT_API_URL);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Campos incompletos', 'Informe o seu e-mail e sua senha.');
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
      // O RootLayout redirecionará automaticamente para /(app)
    } catch (error: any) {
      const msg =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Não foi possível conectar ao servidor. Verifique suas credenciais ou a URL da API.';
      Alert.alert('Erro ao entrar', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (biometricLoading || loading) return;
    try {
      setBiometricLoading(true);
      const res = await loginWithBiometrics();
      if (!res.success && res.error) {
        // Se o usuário cancelou voluntariamente, não precisa emitir pop-up estridente
        if (!res.error.toLowerCase().includes('cancel')) {
          Alert.alert('Acesso Biométrico', res.error);
        }
      }
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Falha ao autenticar com biometria.');
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleSaveApiUrl = async () => {
    if (!customUrl.trim()) return;
    await saveCustomApiUrl(customUrl.trim());
    setShowApiModal(false);
    Alert.alert('Sucesso', `URL da API atualizada para: ${customUrl.trim()}`);
  };

  const showBiometricsButton =
    biometricsSupported && biometricsEnrolled && biometricsEnabled && savedBiometricUser;

  const isFaceId = biometryType === 'FACE_ID';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <Ionicons name="wallet-outline" size={38} color={Colors.primary} />
          </View>
          <Text style={styles.brandTitle}>Fluxo</Text>
          <Text style={styles.brandSubtitle}>Suas finanças pessoais com clareza e controle</Text>
        </View>

        {/* Card de Acesso Rápido por Biometria / Face ID */}
        {showBiometricsButton && (
          <View style={styles.biometricContainer}>
            <TouchableOpacity
              style={styles.biometricCard}
              onPress={handleBiometricLogin}
              disabled={biometricLoading || loading}
              activeOpacity={0.82}
            >
              <View style={styles.biometricIconBadge}>
                {biometricLoading ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Ionicons
                    name={isFaceId ? 'scan-outline' : 'finger-print-outline'}
                    size={28}
                    color={Colors.primary}
                  />
                )}
              </View>
              <View style={styles.biometricTextWrap}>
                <Text style={styles.biometricTitle}>Entrar com {biometryLabel}</Text>
                <Text style={styles.biometricSub} numberOfLines={1}>
                  Continuar como {savedBiometricUser.name || savedBiometricUser.email}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou acesse com sua senha</Text>
              <View style={styles.dividerLine} />
            </View>
          </View>
        )}

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Entrar na sua conta</Text>

          {/* E-mail */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-mail</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="seu.email@exemplo.com"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          {/* Senha */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Senha</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Sua senha secreta"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Botão Entrar */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading || biometricLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>{loading ? 'Entrando...' : 'Entrar no Fluxo'}</Text>
          </TouchableOpacity>

          {/* Link Cadastro */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Não tem uma conta?</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/cadastro')}>
              <Text style={styles.linkText}>Cadastre-se</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Configuração de Servidor API */}
        <TouchableOpacity style={styles.configServerButton} onPress={() => setShowApiModal(true)}>
          <Ionicons name="server-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.configServerText}>Configurar endereço do Servidor API</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de Configuração de API */}
      <Modal visible={showApiModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.apiModalContent}>
            <Text style={styles.apiModalTitle}>Configurar API Backend</Text>
            <Text style={styles.apiModalDesc}>
              Se estiver testando em um celular físico, informe o IP do computador na rede local (ex: http://192.168.1.50:8000).
            </Text>
            <TextInput
              style={styles.apiModalInput}
              value={customUrl}
              onChangeText={setCustomUrl}
              placeholder="http://192.168.x.x:8000"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
            />
            <View style={styles.apiModalActions}>
              <TouchableOpacity
                style={styles.apiModalCancel}
                onPress={() => setShowApiModal(false)}
              >
                <Text style={styles.apiModalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.apiModalSave} onPress={handleSaveApiUrl}>
                <Text style={styles.apiModalSaveText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: `${Colors.primary}40`,
  },
  brandTitle: {
    color: Colors.text,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 260,
  },
  biometricContainer: {
    marginBottom: 20,
  },
  biometricCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: `${Colors.primary}60`,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  biometricIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${Colors.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  biometricTextWrap: {
    flex: 1,
  },
  biometricTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  biometricSub: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    color: Colors.textMuted,
    fontSize: 12,
    paddingHorizontal: 12,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  eyeIcon: {
    padding: 8,
  },
  input: {
    flex: 1,
    color: Colors.text,
    paddingVertical: 14,
    fontSize: 15,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 6,
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  linkText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  configServerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 6,
  },
  configServerText: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  apiModalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  apiModalTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  apiModalDesc: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  apiModalInput: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 18,
  },
  apiModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  apiModalCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  apiModalCancelText: {
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  apiModalSave: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  apiModalSaveText: {
    color: '#FFF',
    fontWeight: '700',
  },
});
