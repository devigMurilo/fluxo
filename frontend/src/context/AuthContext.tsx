import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  loginService,
  registerService,
  getMeService,
  getSavedUser,
  clearAuthData,
} from '../services/auth';
import { initDatabase } from '../db/database';
import { seedDefaultCategoriesIfEmpty } from '../db/queries';
import { setupApiBaseUrl } from '../services/api';
import {
  getBiometricCapabilities,
  isBiometricsEnabled,
  getBiometricSavedUser,
  enableBiometrics,
  disableBiometrics,
  authenticateWithBiometrics,
  authenticateAndLoginWithBiometrics,
  BiometryType,
} from '../services/biometrics';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAppLocked: boolean;
  biometricsSupported: boolean;
  biometricsEnrolled: boolean;
  biometricsEnabled: boolean;
  biometryType: BiometryType;
  biometryLabel: string;
  savedBiometricUser: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, confirm: string) => Promise<void>;
  logout: () => Promise<void>;
  reloadUser: () => Promise<void>;
  toggleBiometrics: (enable: boolean) => Promise<{ success: boolean; error?: string }>;
  loginWithBiometrics: () => Promise<{ success: boolean; error?: string }>;
  unlockWithBiometrics: () => Promise<boolean>;
  refreshBiometricsState: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAppLocked, setIsAppLocked] = useState(false);

  // Estados de Biometria
  const [biometricsSupported, setBiometricsSupported] = useState(false);
  const [biometricsEnrolled, setBiometricsEnrolled] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [biometryType, setBiometryType] = useState<BiometryType>('NONE');
  const [biometryLabel, setBiometryLabel] = useState('Biometria');
  const [savedBiometricUser, setSavedBiometricUser] = useState<User | null>(null);

  const refreshBiometricsState = async () => {
    try {
      const caps = await getBiometricCapabilities();
      setBiometricsSupported(caps.hasHardware);
      setBiometricsEnrolled(caps.isEnrolled);
      setBiometryType(caps.biometryType);
      setBiometryLabel(caps.label);

      const enabled = await isBiometricsEnabled();
      setBiometricsEnabled(enabled);

      const saved = await getBiometricSavedUser();
      setSavedBiometricUser(saved ? saved.user : null);
    } catch (e) {
      console.warn('Erro ao atualizar estado da biometria:', e);
    }
  };

  useEffect(() => {
    async function loadInitialSession() {
      try {
        await setupApiBaseUrl();
        await initDatabase();

        const caps = await getBiometricCapabilities();
        setBiometricsSupported(caps.hasHardware);
        setBiometricsEnrolled(caps.isEnrolled);
        setBiometryType(caps.biometryType);
        setBiometryLabel(caps.label);

        const bioEnabled = await isBiometricsEnabled();
        setBiometricsEnabled(bioEnabled);

        const savedBio = await getBiometricSavedUser();
        setSavedBiometricUser(savedBio ? savedBio.user : null);

        // Tenta recuperar usuário salvo localmente
        const savedUser = await getSavedUser();
        if (savedUser) {
          setUser(savedUser);
          await seedDefaultCategoriesIfEmpty(savedUser.id);

          // Se a biometria estiver ativa e o aparelho suportar, bloqueia o app ao abrir
          if (bioEnabled && caps.hasHardware && caps.isEnrolled) {
            setIsAppLocked(true);
          }

          // Opcionalmente atualiza dados com a API
          try {
            const fresh = await getMeService();
            setUser(fresh);
          } catch {
            console.log('App iniciado em modo offline com usuário salvo');
          }
        }
      } catch (err) {
        console.warn('Erro ao restaurar sessão inicial:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadInitialSession();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const resp = await loginService(email, password);
      setUser(resp.user);
      setIsAppLocked(false);
      await seedDefaultCategoriesIfEmpty(resp.user.id);
      await refreshBiometricsState();
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, confirm: string) => {
    setIsLoading(true);
    try {
      const resp = await registerService(name, email, password, confirm);
      setUser(resp.user);
      setIsAppLocked(false);
      await seedDefaultCategoriesIfEmpty(resp.user.id);
      await refreshBiometricsState();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await clearAuthData();
      setUser(null);
      setIsAppLocked(false);
      await refreshBiometricsState();
    } finally {
      setIsLoading(false);
    }
  };

  const reloadUser = async () => {
    try {
      const fresh = await getMeService();
      setUser(fresh);
    } catch (e) {
      console.warn('Não foi possível atualizar dados do usuário:', e);
    }
  };

  const unlockWithBiometrics = async (): Promise<boolean> => {
    try {
      const res = await authenticateWithBiometrics(
        `Desbloqueie o Fluxo com seu ${biometryLabel}`
      );
      if (res.success) {
        setIsAppLocked(false);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const loginWithBiometrics = async (): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const res = await authenticateAndLoginWithBiometrics();
      if (res.success && res.user) {
        setUser(res.user);
        setIsAppLocked(false);
        await seedDefaultCategoriesIfEmpty(res.user.id);
        await refreshBiometricsState();
        return { success: true };
      }
      return { success: false, error: res.error || 'Falha ao autenticar com biometria.' };
    } finally {
      setIsLoading(false);
    }
  };

  const toggleBiometrics = async (
    enable: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    if (enable) {
      if (!user) {
        return { success: false, error: 'É necessário estar autenticado para ativar a biometria.' };
      }
      const res = await enableBiometrics(user);
      if (res.success) {
        setBiometricsEnabled(true);
        setSavedBiometricUser(user);
      }
      return res;
    } else {
      await disableBiometrics();
      setBiometricsEnabled(false);
      setSavedBiometricUser(null);
      return { success: true };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isAppLocked,
        biometricsSupported,
        biometricsEnrolled,
        biometricsEnabled,
        biometryType,
        biometryLabel,
        savedBiometricUser,
        login,
        register,
        logout,
        reloadUser,
        toggleBiometrics,
        loginWithBiometrics,
        unlockWithBiometrics,
        refreshBiometricsState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
