import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { Bill } from '../db/queries';
import { formatCentsForInput, parseBRLToCents } from '../utils/formatCurrency';

interface BillModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    amount: number;
    dueDay: number;
    enableNotification: boolean;
  }) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
  billToEdit?: Bill | null;
}

export const BillModal: React.FC<BillModalProps> = ({
  visible,
  onClose,
  onSave,
  onDelete,
  billToEdit,
}) => {
  const [name, setName] = useState<string>('');
  const [amountCents, setAmountCents] = useState<number>(0);
  const [dueDay, setDueDay] = useState<string>('10');
  const [enableNotification, setEnableNotification] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (billToEdit) {
      setName(billToEdit.name);
      setAmountCents(billToEdit.amount);
      setDueDay(String(billToEdit.due_day));
      setEnableNotification(!!billToEdit.notification_id);
    } else {
      setName('');
      setAmountCents(0);
      setDueDay('10');
      setEnableNotification(true);
    }
  }, [billToEdit, visible]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Nome obrigatório', 'Por favor, informe o nome da fatura/conta.');
      return;
    }
    if (amountCents <= 0) {
      Alert.alert('Valor inválido', 'Por favor, informe o valor da fatura.');
      return;
    }
    const dayNum = parseInt(dueDay, 10);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      Alert.alert('Dia de vencimento inválido', 'O dia deve estar entre 1 e 31.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        name: name.trim(),
        amount: amountCents,
        dueDay: dayNum,
        enableNotification,
      });
      onClose();
    } catch (e: any) {
      Alert.alert('Erro ao salvar', e.message || 'Ocorreu um erro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!billToEdit || !onDelete) return;

    Alert.alert(
      'Confirmar exclusão',
      `Deseja realmente remover a fatura "${billToEdit.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSubmitting(true);
              await onDelete(billToEdit.id);
              onClose();
            } catch (e: any) {
              Alert.alert('Erro ao excluir', e.message || 'Ocorreu um erro.');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {billToEdit ? 'Editar Fatura' : 'Nova Fatura / Conta'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Input Valor Formatado */}
            <View style={styles.amountInputContainer}>
              <Text style={styles.amountLabel}>Valor da Fatura</Text>
              <TextInput
                style={styles.amountInput}
                keyboardType="numeric"
                value={formatCentsForInput(amountCents)}
                onChangeText={(t) => setAmountCents(parseBRLToCents(t))}
                placeholder="R$ 0,00"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            {/* Nome da Fatura */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nome ou Descrição</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ex: Cartão Nubank, Aluguel, Internet..."
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Dia de Vencimento */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Dia do Vencimento (1 a 31)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ex: 10"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
                value={dueDay}
                onChangeText={setDueDay}
                maxLength={2}
              />
            </View>

            {/* Notificação / Lembrete */}
            <View style={styles.notificationRow}>
              <View style={styles.notifTextWrap}>
                <View style={styles.notifHeader}>
                  <Ionicons name="notifications-outline" size={18} color={Colors.primary} />
                  <Text style={styles.notifTitle}>Lembrete Automático</Text>
                </View>
                <Text style={styles.notifSubtitle}>
                  Receber notificação 2 dias antes do vencimento
                </Text>
              </View>
              <Switch
                value={enableNotification}
                onValueChange={setEnableNotification}
                trackColor={{ false: Colors.surfaceLight, true: Colors.primary }}
                thumbColor="#FFF"
              />
            </View>

            {/* Ações */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.saveButton, isSubmitting && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                <Text style={styles.saveButtonText}>
                  {isSubmitting ? 'Salvando...' : billToEdit ? 'Atualizar Fatura' : 'Cadastrar Fatura'}
                </Text>
              </TouchableOpacity>

              {billToEdit && onDelete && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDelete}
                  disabled={isSubmitting}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={18} color={Colors.expense} />
                  <Text style={styles.deleteButtonText}>Excluir Fatura</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  amountInputContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  amountLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 4,
  },
  amountInput: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.warning,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: Colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceLight,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  notifTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  notifTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  notifSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  actionButtons: {
    marginTop: 10,
    marginBottom: 20,
    gap: 12,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.expenseBg,
    borderRadius: 14,
    paddingVertical: 12,
    gap: 6,
  },
  deleteButtonText: {
    color: Colors.expense,
    fontSize: 15,
    fontWeight: '600',
  },
});
