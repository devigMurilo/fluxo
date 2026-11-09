import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export const AppLockOverlay: React.FC = () => {
  const {
    user,
    biometryLabel,
    biometryType,
    unlockWithBiometrics,
    logout,
  } = useAuth();

  const [authenticating, setAuthenticating] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  const handleUnlock = async () => {
    if (authenticating) return;
    setAuthenticating(true);
    try {
      await unlockWithBiometrics();
    } finally {
      setAuthenticating(false);
    }
  };

  useEffect(() => {
    // Animação suave de pulso no ícone de biometria
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Auto-prompt no carregamento inicial
    const timer = setTimeout(() => {
      handleUnlock();
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  const isFaceId = biometryType === 'FACE_ID';

  return (
    <View style={styles.overlay}>
      <View style={styles.content}>
        {/* Logo e Título */}
        <View style={styles.logoWrap}>
          <Ionicons name="wallet-outline" size={32} color={Colors.primary} />
        </View>
        <Text style={styles.brandTitle}>Fluxo</Text>

        {/* Informações do Usuário */}
        <View style={styles.avatarWrap}>
          <Text style={styles.avatarInitials}>
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'FL'}
          </Text>
        </View>
        <Text style={styles.userName}>Olá, {user?.name || 'Usuário'}</Text>
        <Text style={styles.lockSubtitle}>
          O aplicativo está bloqueado para proteger seus dados financeiros.
        </Text>

        {/* Botão de Biometria */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }], marginVertical: 32 }}>
          <TouchableOpacity
            style={styles.biometricBtn}
            onPress={handleUnlock}
            disabled={authenticating}
            activeOpacity={0.8}
          >
            {authenticating ? (
              <ActivityIndicator size="large" color={Colors.primary} />
            ) : (
              <Ionicons
                name={isFaceId ? 'scan-outline' : 'finger-print-outline'}
                size={54}
                color={Colors.primary}
              />
            )}
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          style={styles.unlockActionBtn}
          onPress={handleUnlock}
          disabled={authenticating}
        >
          <Text style={styles.unlockActionText}>
            {authenticating ? 'Verificando...' : `Toque para desbloquear com ${biometryLabel}`}
          </Text>
        </TouchableOpacity>

        {/* Opção secundária: Trocar de conta ou usar senha */}
        <TouchableOpacity style={styles.switchAccountBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={16} color={Colors.textMuted} />
          <Text style={styles.switchAccountText}>Entrar com senha ou trocar de conta</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.background,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  logoWrap: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: `${Colors.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${Colors.primary}25`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarInitials: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.primary,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  lockSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  biometricBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surfaceCard,
    borderWidth: 2,
    borderColor: `${Colors.primary}50`,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  unlockActionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: `${Colors.primary}15`,
    marginBottom: 24,
  },
  unlockActionText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  switchAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
  },
  switchAccountText: {
    color: Colors.textMuted,
    fontSize: 13,
  },
});
