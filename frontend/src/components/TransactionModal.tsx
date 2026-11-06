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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { Category, Transaction } from '../db/queries';
import { formatCentsForInput, parseBRLToCents } from '../utils/formatCurrency';
import { getTodayDateString } from '../utils/dates';

interface TransactionModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    amount: number;
    type: 'receita' | 'despesa';
    categoryId: number | null;
    date: string;
    description: string;
  }) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
  transactionToEdit?: Transaction | null;
  categories: Category[];
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  visible,
  onClose,
  onSave,
  onDelete,
  transactionToEdit,
  categories,
}) => {
  const [type, setType] = useState<'receita' | 'despesa'>('despesa');
  const [amountCents, setAmountCents] = useState<number>(0);
  const [description, setDescription] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [date, setDate] = useState<string>(getTodayDateString());
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (transactionToEdit) {
      setType(transactionToEdit.type);
      setAmountCents(transactionToEdit.amount);
      setDescription(transactionToEdit.description);
      setSelectedCategoryId(transactionToEdit.category_id);
      setDate(transactionToEdit.date);
    } else {
      setType('despesa');
      setAmountCents(0);
      setDescription('');
      setSelectedCategoryId(categories.length > 0 ? categories[0].id : null);
      setDate(getTodayDateString());
    }
  }, [transactionToEdit, visible, categories]);

  const handleAmountChange = (text: string) => {
    const parsed = parseBRLToCents(text);
    setAmountCents(parsed);
  };

  const handleSave = async () => {
    if (amountCents <= 0) {
      Alert.alert('Valor inválido', 'Por favor, informe um valor maior que zero.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Descrição obrigatória', 'Por favor, informe a descrição da transação.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        amount: amountCents,
        type,
        categoryId: selectedCategoryId,
        date: date.trim(),
        description: description.trim(),
      });
      onClose();
    } catch (e: any) {
      Alert.alert('Erro ao salvar', e.message || 'Ocorreu um erro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!transactionToEdit || !onDelete) return;

    Alert.alert(
      'Confirmar exclusão',
      `Deseja realmente excluir a transação "${transactionToEdit.description}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSubmitting(true);
              await onDelete(transactionToEdit.id);
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {transactionToEdit ? 'Editar Transação' : 'Nova Transação'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Toggle Tipo: Despesa / Receita */}
            <View style={styles.typeToggle}>
              <TouchableOpacity
                style={[styles.typeButton, type === 'despesa' && styles.typeButtonExpenseActive]}
                onPress={() => setType('despesa')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="arrow-up-circle-outline"
                  size={18}
                  color={type === 'despesa' ? '#FFF' : Colors.textMuted}
                />
                <Text
                  style={[styles.typeButtonText, type === 'despesa' && styles.typeTextActive]}
                >
                  Despesa
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeButton, type === 'receita' && styles.typeButtonIncomeActive]}
                onPress={() => setType('receita')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="arrow-down-circle-outline"
                  size={18}
                  color={type === 'receita' ? '#FFF' : Colors.textMuted}
                />
                <Text
                  style={[styles.typeButtonText, type === 'receita' && styles.typeTextActive]}
                >
                  Receita
                </Text>
              </TouchableOpacity>
            </View>

            {/* Input Valor Formatado */}
            <View style={styles.amountInputContainer}>
              <Text style={styles.amountLabel}>Valor</Text>
              <TextInput
                style={[
                  styles.amountInput,
                  { color: type === 'receita' ? Colors.income : Colors.expense },
                ]}
                keyboardType="numeric"
                value={formatCentsForInput(amountCents)}
                onChangeText={handleAmountChange}
                placeholder="R$ 0,00"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            {/* Descrição */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Descrição</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ex: Almoço, Salário, Uber..."
                placeholderTextColor={Colors.textMuted}
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {/* Seletor de Categoria */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Categoria</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                {categories.map((cat) => {
                  const isSelected = selectedCategoryId === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.catChip,
                        isSelected && { borderColor: cat.color, backgroundColor: `${cat.color}25` },
                      ]}
                      onPress={() => setSelectedCategoryId(cat.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.catIconWrap, { backgroundColor: `${cat.color}30` }]}>
                        <Ionicons name={cat.icon as any} size={16} color={cat.color} />
                      </View>
                      <Text
                        style={[
                          styles.catChipText,
                          isSelected && { color: Colors.text, fontWeight: '700' },
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Data (AAAA-MM-DD) */}
            <View style={styles.inputGroup}>
              <View style={styles.dateHeader}>
                <Text style={styles.inputLabel}>Data (AAAA-MM-DD)</Text>
                <TouchableOpacity onPress={() => setDate(getTodayDateString())}>
                  <Text style={styles.todayButtonText}>Hoje</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={Colors.textMuted}
                value={date}
                onChangeText={setDate}
              />
            </View>

            {/* Botões de Ação */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.saveButton, isSubmitting && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                <Text style={styles.saveButtonText}>
                  {isSubmitting ? 'Salvando...' : transactionToEdit ? 'Atualizar' : 'Adicionar'}
                </Text>
              </TouchableOpacity>

              {transactionToEdit && onDelete && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDelete}
                  disabled={isSubmitting}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={18} color={Colors.expense} />
                  <Text style={styles.deleteButtonText}>Excluir Transação</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceLight,
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  typeButtonExpenseActive: {
    backgroundColor: Colors.expense,
  },
  typeButtonIncomeActive: {
    backgroundColor: Colors.income,
  },
  typeButtonText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  typeTextActive: {
    color: '#FFF',
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
  catScroll: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 6,
  },
  catIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catChipText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  todayButtonText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
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
