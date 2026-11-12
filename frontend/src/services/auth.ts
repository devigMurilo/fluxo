import * as Crypto from 'expo-crypto';
import { getStorageItem, setStorageItem, removeStorageItem } from './api';
import {
  createLocalUser,
  findLocalUserByEmail,
  findLocalUserById,
} from '../db/queries';

export interface User {
  id: number;
  email: string;
  name: string;
}

export interface AuthResponse {
  user: User;
  tokens: {
    access: string;
    refresh: string;
  };
  message?: string;
}

const TOKEN_KEY = 'fluxo_access_token';
const REFRESH_KEY = 'fluxo_refresh_token';
const USER_KEY = 'fluxo_user_data';

export async function hashPassword(password: string): Promise<string> {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `fluxo_salt_${password}`
  );
}

export async function loginService(email: string, password: string): Promise<AuthResponse> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    throw new Error('Informe o seu e-mail e sua senha.');
  }

  const localUser = await findLocalUserByEmail(normalizedEmail);
  if (!localUser) {
    throw new Error('Usuário não encontrado. Crie uma conta para começar!');
  }

  const hashedInput = await hashPassword(password);
  if (localUser.password_hash !== hashedInput) {
    throw new Error('Senha incorreta. Verifique os dados digitados.');
  }

  const user: User = {
    id: localUser.id,
    name: localUser.name,
    email: localUser.email,
  };

  const access = 'local_offline_access_token';
  const refresh = 'local_offline_refresh_token';

  await saveAuthData(access, refresh, user);
  return {
    user,
    tokens: { access, refresh },
    message: 'Login realizado com sucesso!',
  };
}

export async function registerService(
  name: string,
  email: string,
  password: string,
  passwordConfirm: string
): Promise<AuthResponse> {
  const trimmedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (!trimmedName) {
    throw new Error('Por favor, informe seu nome completo.');
  }
  if (!normalizedEmail) {
    throw new Error('Por favor, informe um endereço de e-mail válido.');
  }
  if (!password || password.length < 6) {
    throw new Error('A senha deve conter no mínimo 6 caracteres.');
  }
  if (password !== passwordConfirm) {
    throw new Error('A confirmação de senha deve ser idêntica à senha.');
  }

  const existing = await findLocalUserByEmail(normalizedEmail);
  if (existing) {
    throw new Error('Este e-mail já está cadastrado no aparelho. Faça login.');
  }

  const passwordHash = await hashPassword(password);
  const createdUser = await createLocalUser(trimmedName, normalizedEmail, passwordHash);

  const user: User = {
    id: createdUser.id,
    name: createdUser.name,
    email: createdUser.email,
  };

  const access = 'local_offline_access_token';
  const refresh = 'local_offline_refresh_token';

  await saveAuthData(access, refresh, user);
  return {
    user,
    tokens: { access, refresh },
    message: 'Conta criada com sucesso!',
  };
}

export async function getMeService(): Promise<User> {
  const saved = await getSavedUser();
  if (!saved) {
    throw new Error('Nenhum usuário logado.');
  }

  const found = await findLocalUserById(saved.id);
  if (found) {
    await setStorageItem(USER_KEY, JSON.stringify(found));
    return found;
  }
  return saved;
}

export async function saveAuthData(accessToken: string, refreshToken: string, user: User): Promise<void> {
  await setStorageItem(TOKEN_KEY, accessToken);
  await setStorageItem(REFRESH_KEY, refreshToken);
  await setStorageItem(USER_KEY, JSON.stringify(user));
}

export async function getSavedUser(): Promise<User | null> {
  const userJson = await getStorageItem(USER_KEY);
  if (!userJson) return null;
  try {
    return JSON.parse(userJson) as User;
  } catch {
    return null;
  }
}

export async function clearAuthData(): Promise<void> {
  await removeStorageItem(TOKEN_KEY);
  await removeStorageItem(REFRESH_KEY);
  await removeStorageItem(USER_KEY);
}
