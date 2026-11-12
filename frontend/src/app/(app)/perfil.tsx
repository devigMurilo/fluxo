import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/theme';
import { playHaptic } from '../../utils/haptics';

export default function PerfilScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    user,
    logout,
    biometricsSupported,
    biometricsEnrolled,
    biometricsEnabled,
    biometryType,
    biometryLabel,
    toggleBiometrics,
  } = useAuth();

  const [biometricLoading, setBiometricLoading] = useState(false);

  const handleToggleBiometrics = async (value: boolean) => {
    if (biometricLoading) return;
    playHaptic.medium();
    setBiometricLoading(true);
    try {
      if (value) {
        const res = await toggleBiometrics(true);
        if (res.success) {
          playHaptic.success();
          Alert.alert(
            'Biometria ativada! 🛡️',
            `Agora você pode entrar e desbloquear o Fluxo usando seu ${biometryLabel}.`
          );
        } else {
          if (!res.error?.toLowerCase().includes('cancel')) {
            playHaptic.error();
            Alert.alert('Não foi possível ativar', res.error || 'A autenticação falhou.');
          }
        }
      } else {
        playHaptic.warning();
        Alert.alert(
          'Desativar Biometria',
          `Deseja realmente desativar o acesso por ${biometryLabel}?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Desativar',
              style: 'destructive',
              onPress: async () => {
                await toggleBiometrics(false);
                playHaptic.light();
                Alert.alert('Desativada', 'O acesso biométrico foi desativado.');
              },
            },
          ]
        );
      }
    } catch (err: any) {
      playHaptic.error();
      Alert.alert('Erro', err?.message || 'Falha ao alterar configuração de biometria.');
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleLogout = () => {
    playHaptic.warning();
    Alert.alert('Sair da Conta', 'Deseja realmente encerrar sua sessão no Fluxo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await logout();
          // RootLayout cuidará da transição para /(auth)/login
        },
      },
    ]);
  };

  const isFaceId = biometryType === 'FACE_ID';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
    >
      {/* Avatar e Dados do Usuário */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarWrap}>
          <Text style={styles.avatarInitials}>
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'FL'}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.name || 'Usuário Fluxo'}</Text>
        <Text style={styles.userEmail}>{user?.email || 'email@exemplo.com'}</Text>

        <View style={styles.userIdBadge}>
          <Ionicons name="shield-checkmark-outline" size={12} color={Colors.primary} />
          <Text style={styles.userIdText}>ID da Conta: #{user?.id || 1}</Text>
        </View>
      </View>

      {/* Atalho Categorias & Extrato Bancário */}
      <View style={styles.card}>
        <Text style={styles.cardSectionTitle}>Personalização & Bancos</Text>

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => router.push('/importar-extrato')}
          activeOpacity={0.7}
        >
          <View style={styles.menuRowLeft}>
            <View style={[styles.menuIconCircle, { backgroundColor: '#8A05BE25' }]}>
              <Ionicons name="cloud-upload-outline" size={18} color="#A855F7" />
            </View>
            <View>
              <Text style={styles.menuRowTitle}>Importar Extrato Bancário</Text>
              <Text style={styles.menuRowSub}>Nubank, Banco Inter e outros (OFX / CSV)</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity>

        <View style={{ height: 1, backgroundColor: Colors.border, marginVertical: 8 }} />

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => router.push('/categorias')}
          activeOpacity={0.7}
        >
          <View style={styles.menuRowLeft}>
            <View style={[styles.menuIconCircle, { backgroundColor: `${Colors.purple}20` }]}>
              <Ionicons name="pricetags-outline" size={18} color={Colors.purple} />
            </View>
            <View>
              <Text style={styles.menuRowTitle}>Gerenciar Categorias</Text>
              <Text style={styles.menuRowSub}>Crie cores e ícones personalizados</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity>

        <View style={{ height: 1, backgroundColor: Colors.border, marginVertical: 8 }} />

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => router.push('/(app)/faturas')}
          activeOpacity={0.7}
        >
          <View style={styles.menuRowLeft}>
            <View style={[styles.menuIconCircle, { backgroundColor: Colors.warningBg }]}>
              <Ionicons name="receipt-outline" size={18} color={Colors.warning} />
            </View>
            <View>
              <Text style={styles.menuRowTitle}>Faturas & Vencimentos</Text>
              <Text style={styles.menuRowSub}>Controle faturas de cartão e alertas</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity>

        <View style={{ height: 1, backgroundColor: Colors.border, marginVertical: 8 }} />

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => router.push('/(app)/investimentos')}
          activeOpacity={0.7}
        >
          <View style={styles.menuRowLeft}>
            <View style={[styles.menuIconCircle, { backgroundColor: `${Colors.cyan}20` }]}>
              <Ionicons name="trending-up-outline" size={18} color={Colors.cyan} />
            </View>
            <View>
              <Text style={styles.menuRowTitle}>Investimentos & BCB</Text>
              <Text style={styles.menuRowSub}>Simulador CDI/Selic e patrimônio</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Segurança & Biometria / Face ID */}
      <View style={styles.card}>
        <Text style={styles.cardSectionTitle}>Segurança & Acesso</Text>
        <Text style={styles.cardDesc}>
          Bloqueie o aplicativo e entre com mais rapidez e privacidade.
        </Text>

        <View style={styles.biometricRow}>
          <View style={styles.menuRowLeft}>
            <View style={[styles.menuIconCircle, { backgroundColor: `${Colors.primary}20` }]}>
              {biometricLoading ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons
                  name={isFaceId ? 'scan-outline' : 'finger-print-outline'}
                  size={20}
                  color={Colors.primary}
                />
              )}
            </View>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.menuRowTitle}>Login com {biometryLabel}</Text>
              <Text style={styles.menuRowSub}>
                {!biometricsSupported
                  ? 'Aparelho não possui sensor biométrico'
                  : !biometricsEnrolled
                  ? 'Nenhuma biometria cadastrada no celular'
                  : biometricsEnabled
                  ? `Ativado para login e desbloqueio`
                  : `Toque no interruptor para ativar`}
              </Text>
            </View>
          </View>

          <Switch
            value={biometricsEnabled}
            onValueChange={handleToggleBiometrics}
            disabled={!biometricsSupported || !biometricsEnrolled || biometricLoading}
            trackColor={{ false: Colors.border, true: `${Colors.primary}80` }}
            thumbColor={biometricsEnabled ? Colors.primary : Colors.textMuted}
          />
        </View>
      </View>

      {/* Status do Armazenamento */}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <View style={[styles.menuIconCircle, { backgroundColor: `${Colors.primary}20`, marginRight: 10 }]}>
            <Ionicons name="phone-portrait-outline" size={20} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardSectionTitle}>Modo Autônomo & Seguro</Text>
            <Text style={{ fontSize: 12, color: Colors.primary, fontWeight: '600' }}>
              100% Offline (Sem Servidor Externo)
            </Text>
          </View>
        </View>
        <Text style={styles.cardDesc}>
          Seus dados, transações, faturas e hábitos ficam salvos e criptografados diretamente na memória do seu celular (SQLite). Você não precisa de internet nem de servidor ativo para usar o app.
        </Text>
      </View>

      {/* Informações do MVP */}
      <View style={styles.card}>
        <Text style={styles.cardSectionTitle}>Sobre o Aplicativo</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>Versão</Text>
          <Text style={styles.infoVal}>1.2.0 (Offline Autônomo)</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>Armazenamento</Text>
          <Text style={styles.infoVal}>SQLite Local (Isolado)</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>Segurança</Text>
          <Text style={styles.infoVal}>
            {biometricsEnabled ? `${biometryLabel} + SHA-256` : 'SHA-256 + SecureStore'}
          </Text>
        </View>
      </View>

      {/* Botão Sair */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={20} color={Colors.expense} />
        <Text style={styles.logoutText}>Sair da Conta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 60,
  },
  profileHeader: {
    alignItems: 'center',
    marginVertical: 16,
  },
  avatarWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.primaryMuted,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarInitials: {
    color: Colors.primary,
    fontSize: 26,
    fontWeight: '800',
  },
  userName: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  userEmail: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  userIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  userIdText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  cardSectionTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDesc: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 16,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  biometricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  menuRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuRowTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  menuRowSub: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  input: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 13,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  apiActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: Colors.primaryMuted,
    gap: 6,
    flex: 1,
  },
  testBtnText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  saveBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    flex: 1,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceLight,
  },
  infoKey: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  infoVal: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.expenseBg,
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginTop: 6,
    marginBottom: 20,
  },
  logoutText: {
    color: Colors.expense,
    fontSize: 15,
    fontWeight: '700',
  },
});
