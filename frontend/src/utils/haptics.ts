import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Utilitário central de feedback tátil (Haptic Feedback).
 * Proporciona resposta física sutil aos toques, elevando a percepção de qualidade do app.
 * Seguro para Web (ignora sem quebrar).
 */
export const playHaptic = {
  /** Toque muito leve em abas, seletores de mês, filtros ou checkboxes */
  selection: () => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {});
    }
  },

  /** Toque leve para botões secundários, navegação rápida */
  light: () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  },

  /** Toque médio para botões primários, incrementar hábitos, abrir modais */
  medium: () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
  },

  /** Toque firme para ações importantes */
  heavy: () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    }
  },

  /** Vibração comemorativa de sucesso (conclusão de meta, desafio batido, evento cumprido) */
  success: () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  },

  /** Vibração de aviso (exclusão, cancelamento, perda de pontos) */
  warning: () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
  },

  /** Vibração de erro (falha de validação ou conexão) */
  error: () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  },
};
