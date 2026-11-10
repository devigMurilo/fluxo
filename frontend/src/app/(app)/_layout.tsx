import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';
import { playHaptic } from '../../utils/haptics';

export default function AppLayout() {
  const insets = useSafeAreaInsets();
  // Garante margem inferior espaçosa e confortável para o indicador de gestos do Android/iOS
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 26 : 14);
  const tabHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenListeners={{
        tabPress: () => {
          playHaptic.selection();
        },
      }}
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        },
        headerTitleStyle: {
          color: Colors.text,
          fontSize: 18,
          fontWeight: '700',
        },
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: bottomPadding,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          headerTitle: 'Fluxo Life OS',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendario"
        options={{
          title: 'Agenda',
          headerTitle: 'Agenda & Calendário',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="metas"
        options={{
          title: 'Metas',
          headerTitle: 'Metas & Hábitos',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trophy-outline" size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="transacoes"
        options={{
          title: 'Finanças',
          headerTitle: 'Minhas Finanças',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          headerTitle: 'Meu Perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="categorias"
        options={{
          href: null,
          title: 'Categorias',
          headerTitle: 'Minhas Categorias',
        }}
      />
      <Tabs.Screen
        name="faturas"
        options={{
          href: null,
          title: 'Faturas',
          headerTitle: 'Faturas & Lembretes',
        }}
      />
      <Tabs.Screen
        name="investimentos"
        options={{
          href: null,
          title: 'Investimentos',
          headerTitle: 'Investimentos & Simulações',
        }}
      />
    </Tabs>
  );
}
