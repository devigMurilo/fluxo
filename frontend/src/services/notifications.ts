import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configuração padrão de comportamento da notificação quando recebida com app aberto
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Solicita permissão para notificações locais.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('faturas', {
        name: 'Lembretes de Faturas',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
      });
    }

    return finalStatus === 'granted';
  } catch (error) {
    console.warn('Erro ao solicitar permissão de notificações:', error);
    return false;
  }
}

/**
 * Agenda notificação local X dias antes do vencimento da fatura (padrão: 2 dias antes).
 * @param billName Nome da fatura (ex: "Cartão Nubank")
 * @param amountCents Valor em centavos
 * @param dueDay Dia do mês (1 a 31)
 * @param advanceDays Dias de antecedência (padrão: 2)
 */
export async function scheduleBillNotification(
  billName: string,
  amountCents: number,
  dueDay: number,
  advanceDays: number = 2
): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('Permissão de notificação não concedida.');
      return null;
    }

    const now = new Date();
    let targetYear = now.getFullYear();
    let targetMonth = now.getMonth();

    // Se a data de vencimento menos a antecedência já passou hoje, agenda para o próximo mês
    let triggerDate = new Date(targetYear, targetMonth, dueDay - advanceDays, 9, 0, 0); // 09:00 da manhã
    if (triggerDate.getTime() <= now.getTime()) {
      targetMonth += 1;
      triggerDate = new Date(targetYear, targetMonth, dueDay - advanceDays, 9, 0, 0);
    }

    const formattedAmount = (amountCents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `⏰ Lembrete de Fatura: ${billName}`,
        body: `Sua fatura de ${formattedAmount} vence em ${advanceDays} dias (dia ${dueDay}). Não esqueça de pagar!`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: 'faturas',
      },
    });

    return notificationId;
  } catch (error) {
    console.warn('Erro ao agendar notificação:', error);
    return null;
  }
}

/**
 * Cancela notificação agendada.
 */
export async function cancelNotification(notificationId?: string | null): Promise<void> {
  if (!notificationId || Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.warn('Erro ao cancelar notificação:', error);
  }
}
