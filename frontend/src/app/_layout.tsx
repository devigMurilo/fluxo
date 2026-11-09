import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Slot, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { FinanceProvider } from '../context/FinanceContext';
import { Colors } from '../constants/theme';
import { AppLockOverlay } from '../components/AppLockOverlay';

function NavigationGate() {
  const { user, isLoading, isAppLocked } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Sem usuário logado e tentando acessar rota protegida
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup && !isAppLocked) {
      // Usuário autenticado tentando acessar login/cadastro
      router.replace('/(app)');
    }
  }, [user, isLoading, isAppLocked, segments, router]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Slot />
      {user && isAppLocked && <AppLockOverlay />}
    </View>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <FinanceProvider>
        <StatusBar style="light" />
        <NavigationGate />
      </FinanceProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
