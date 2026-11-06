import axios from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Seleciona a URL base padrão (Túnel público ativo para celular físico e internet)
export const DEFAULT_API_URL = 'https://fluffy-games-clean.loca.lt';

const TOKEN_KEY = 'fluxo_access_token';
const REFRESH_KEY = 'fluxo_refresh_token';
const API_URL_KEY = 'fluxo_custom_api_url';

export async function getStorageItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null;
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch (e) {
    console.warn(`Error getting ${key} from SecureStore`, e);
    return null;
  }
}

export async function setStorageItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (e) {
    console.warn(`Error setting ${key} in SecureStore`, e);
  }
}

export async function removeStorageItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (e) {
    console.warn(`Error deleting ${key} in SecureStore`, e);
  }
}

export const api = axios.create({
  baseURL: DEFAULT_API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'bypass-tunnel-reminder': 'true',
  },
});

// Atualiza a URL base se o usuário tiver customizado (ex: IP da rede local)
export async function setupApiBaseUrl(): Promise<string> {
  const customUrl = await getStorageItem(API_URL_KEY);
  if (customUrl) {
    api.defaults.baseURL = customUrl;
    return customUrl;
  }
  api.defaults.baseURL = DEFAULT_API_URL;
  return DEFAULT_API_URL;
}

export async function saveCustomApiUrl(url: string): Promise<void> {
  await setStorageItem(API_URL_KEY, url);
  api.defaults.baseURL = url;
}

// Request Interceptor: adiciona Bearer Token
api.interceptors.request.use(
  async (config) => {
    const token = await getStorageItem(TOKEN_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: renova access token com refresh token se receber 401
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Se o erro for 401 e não for rota de login/register/refresh
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/api/auth/login/') &&
      !originalRequest.url?.includes('/api/auth/register/') &&
      !originalRequest.url?.includes('/api/auth/refresh/')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = await getStorageItem(REFRESH_KEY);
      if (!refreshToken) {
        isRefreshing = false;
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${api.defaults.baseURL}/api/auth/refresh/`, {
          refresh: refreshToken,
        });

        const newAccessToken = data.access;
        await setStorageItem(TOKEN_KEY, newAccessToken);
        if (data.refresh) {
          await setStorageItem(REFRESH_KEY, data.refresh);
        }

        api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        processQueue(null, newAccessToken);
        isRefreshing = false;

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        isRefreshing = false;
        await removeStorageItem(TOKEN_KEY);
        await removeStorageItem(REFRESH_KEY);
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);
