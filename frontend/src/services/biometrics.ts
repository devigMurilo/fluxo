import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import axios from 'axios';
import { getStorageItem, setStorageItem, removeStorageItem, api } from './api';
import { User, saveAuthData } from './auth';

export type BiometryType = 'FACE_ID' | 'FINGERPRINT' | 'IRIS' | 'BIOMETRICS' | 'NONE';

export interface BiometricCapabilities {
  hasHardware: boolean;
  isEnrolled: boolean;
  biometryType: BiometryType;
  label: string;
}

export const BIOMETRICS_ENABLED_KEY = 'fluxo_biometrics_enabled';
export const BIOMETRIC_SAVED_USER_KEY = 'fluxo_biometric_saved_user';
export const BIOMETRIC_REFRESH_KEY = 'fluxo_biometric_refresh_token';
const REFRESH_KEY = 'fluxo_refresh_token';
const TOKEN_KEY = 'fluxo_access_token';

/**
 * Consulta as capacidades de hardware e biometrias cadastradas no dispositivo
 */
export async function getBiometricCapabilities(): Promise<BiometricCapabilities> {
  if (Platform.OS === 'web') {
    return {
      hasHardware: false,
      isEnrolled: false,
      biometryType: 'NONE',
      label: 'Biometria',
    };
  }

  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

    let biometryType: BiometryType = 'NONE';
    let label = 'Biometria';

    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometryType = 'FACE_ID';
      label = Platform.OS === 'ios' ? 'Face ID' : 'Reconhecimento Facial';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometryType = 'FINGERPRINT';
      label = Platform.OS === 'ios' ? 'Touch ID' : 'Impressão Digital';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      biometryType = 'IRIS';
      label = 'Reconhecimento de Íris';
    } else if (hasHardware) {
      biometryType = 'BIOMETRICS';
      label = 'Biometria';
    }

    return {
      hasHardware,
      isEnrolled,
      biometryType,
      label,
    };
  } catch (error) {
    console.warn('Erro ao verificar suporte a biometria:', error);
    return {
      hasHardware: false,
      isEnrolled: false,
      biometryType: 'NONE',
      label: 'Biometria',
    };
  }
}

/**
 * Verifica se a opção de biometria está habilitada pelo usuário
 */
export async function isBiometricsEnabled(): Promise<boolean> {
  try {
    const val = await getStorageItem(BIOMETRICS_ENABLED_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

/**
 * Recupera os dados do usuário cadastrado para acesso biométrico
 */
export async function getBiometricSavedUser(): Promise<{ user: User; refreshToken: string } | null> {
  try {
    const userStr = await getStorageItem(BIOMETRIC_SAVED_USER_KEY);
    const refreshToken = await getStorageItem(BIOMETRIC_REFRESH_KEY);

    if (!userStr || !refreshToken) return null;

    const user: User = JSON.parse(userStr);
    return { user, refreshToken };
  } catch {
    return null;
  }
}

/**
 * Dispara o diálogo nativo do sistema para autenticação biométrica (Face ID, Touch ID ou Fingerprint)
 */
export async function authenticateWithBiometrics(
  reason: string = 'Acesse sua conta Fluxo com segurança'
): Promise<{ success: boolean; error?: string }> {
  if (Platform.OS === 'web') {
    return { success: false, error: 'Biometria indisponível no navegador web.' };
  }

  try {
    const caps = await getBiometricCapabilities();
    if (!caps.hasHardware) {
      return { success: false, error: 'Este aparelho não possui leitor biométrico.' };
    }
    if (!caps.isEnrolled) {
      return {
        success: false,
        error: 'Nenhuma biometria ou Face ID cadastrado no aparelho.',
      };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: 'Cancelar',
      fallbackLabel: 'Usar Senha',
      disableDeviceFallback: false,
    });

    if (result.success) {
      return { success: true };
    }

    let errorMsg = 'Autenticação biométrica cancelada ou não reconhecida.';
    if (result.error === 'user_cancel' || result.error === 'system_cancel' || result.error === 'app_cancel') {
      errorMsg = 'Autenticação cancelada.';
    } else if (result.error === 'lockout') {
      errorMsg = 'Muitas tentativas incorretas. O leitor biométrico foi bloqueado temporariamente.';
    }

    return { success: false, error: errorMsg };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Falha ao autenticar com biometria.',
    };
  }
}

/**
 * Ativa a biometria para a sessão atual, validando a digital/Face ID do usuário primeiro
 */
export async function enableBiometrics(
  user: User,
  promptLabel?: string
): Promise<{ success: boolean; error?: string }> {
  const caps = await getBiometricCapabilities();

  if (!caps.hasHardware) {
    return { success: false, error: 'Seu dispositivo não possui suporte a biometria.' };
  }
  if (!caps.isEnrolled) {
    return {
      success: false,
      error: `Nenhuma biometria cadastrada. Ative o ${caps.label} nas configurações do seu celular.`,
    };
  }

  // Solicita confirmação biométrica imediata
  const auth = await authenticateWithBiometrics(
    promptLabel || `Confirme sua biometria para ativar o ${caps.label} no Fluxo`
  );

  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  // Obtém o refresh token da sessão atual
  const currentRefresh = await getStorageItem(REFRESH_KEY);
  if (!currentRefresh) {
    return {
      success: false,
      error: 'Não foi possível encontrar a sessão atual para vincular à biometria.',
    };
  }

  await setStorageItem(BIOMETRICS_ENABLED_KEY, 'true');
  await setStorageItem(BIOMETRIC_SAVED_USER_KEY, JSON.stringify(user));
  await setStorageItem(BIOMETRIC_REFRESH_KEY, currentRefresh);

  return { success: true };
}

/**
 * Desativa o login por biometria e remove credenciais salvas
 */
export async function disableBiometrics(): Promise<void> {
  await removeStorageItem(BIOMETRICS_ENABLED_KEY);
  await removeStorageItem(BIOMETRIC_SAVED_USER_KEY);
  await removeStorageItem(BIOMETRIC_REFRESH_KEY);
}

/**
 * Autentica com biometria e restaura a sessão do usuário (renovando tokens se online)
 */
export async function authenticateAndLoginWithBiometrics(): Promise<{
  success: boolean;
  user?: User;
  error?: string;
  expired?: boolean;
}> {
  const isEnabled = await isBiometricsEnabled();
  if (!isEnabled) {
    return { success: false, error: 'O login por biometria não está ativado.' };
  }

  const savedSession = await getBiometricSavedUser();
  if (!savedSession) {
    return {
      success: false,
      error: 'Nenhum usuário configurado para acesso biométrico. Faça login com sua senha.',
    };
  }

  const caps = await getBiometricCapabilities();
  const authResult = await authenticateWithBiometrics(`Acesse sua conta Fluxo com ${caps.label}`);

  if (!authResult.success) {
    return { success: false, error: authResult.error };
  }

  // Tenta renovar o token com o backend para obter uma sessão nova
  try {
    const { data } = await axios.post(
      `${api.defaults.baseURL}/api/auth/refresh/`,
      { refresh: savedSession.refreshToken },
      { timeout: 8000 }
    );

    const newAccessToken = data.access;
    const newRefreshToken = data.refresh || savedSession.refreshToken;

    // Salva a nova sessão ativa
    await saveAuthData(newAccessToken, newRefreshToken, savedSession.user);

    // Atualiza o refresh token salvo para a biometria
    await setStorageItem(BIOMETRIC_REFRESH_KEY, newRefreshToken);

    return {
      success: true,
      user: savedSession.user,
    };
  } catch (error: any) {
    // Se o backend retornou 401 ou 400 (refresh token inválido ou expirado)
    if (error.response?.status === 401 || error.response?.status === 400) {
      await disableBiometrics();
      return {
        success: false,
        expired: true,
        error: 'Sua sessão biométrica expirou por segurança. Entre com seu e-mail e senha.',
      };
    }

    // Se houve erro de conexão (offline), mas a autenticação biométrica foi confirmada com sucesso:
    // Permite o login off-line com os dados locais do SQLite!
    const localToken = (await getStorageItem(TOKEN_KEY)) || 'offline-biometric-token';
    await saveAuthData(localToken, savedSession.refreshToken, savedSession.user);

    return {
      success: true,
      user: savedSession.user,
    };
  }
}
