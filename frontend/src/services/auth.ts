import { api, getStorageItem, setStorageItem, removeStorageItem } from './api';

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

export async function loginService(email: string, password: string): Promise<AuthResponse> {
  const response = await api.post<any>('/api/auth/login/', {
    email: email.trim().toLowerCase(),
    password,
  });

  const access = response.data.tokens?.access || response.data.access;
  const refresh = response.data.tokens?.refresh || response.data.refresh;
  const user = response.data.user;

  await saveAuthData(access, refresh, user);
  return {
    user,
    tokens: { access, refresh },
  };
}

export async function registerService(
  name: string,
  email: string,
  password: string,
  passwordConfirm: string
): Promise<AuthResponse> {
  const response = await api.post<any>('/api/auth/register/', {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password,
    password_confirm: passwordConfirm,
  });

  const access = response.data.tokens?.access || response.data.access;
  const refresh = response.data.tokens?.refresh || response.data.refresh;
  const user = response.data.user;

  await saveAuthData(access, refresh, user);
  return {
    user,
    tokens: { access, refresh },
    message: response.data.message,
  };
}

export async function getMeService(): Promise<User> {
  const response = await api.get<User>('/api/auth/me/');
  return response.data;
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
