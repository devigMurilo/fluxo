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

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, confirm: string) => Promise<void>;
  logout: () => Promise<void>;
  reloadUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadInitialSession() {
      try {
        await setupApiBaseUrl();
        await initDatabase();

        // Tenta recuperar usuário salvo localmente
        const savedUser = await getSavedUser();
        if (savedUser) {
          setUser(savedUser);
          await seedDefaultCategoriesIfEmpty(savedUser.id);

          // Opcionalmente atualiza dados com a API
          try {
            const fresh = await getMeService();
            setUser(fresh);
          } catch (e) {
            // Se offline, mantém o usuário salvo localmente para permitir uso das funcionalidades locais
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
      await seedDefaultCategoriesIfEmpty(resp.user.id);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, confirm: string) => {
    setIsLoading(true);
    try {
      const resp = await registerService(name, email, password, confirm);
      setUser(resp.user);
      await seedDefaultCategoriesIfEmpty(resp.user.id);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await clearAuthData();
      setUser(null);
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

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        reloadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
