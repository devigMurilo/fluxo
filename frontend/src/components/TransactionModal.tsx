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
import { Colors, AvailableColors, AvailableIcons } from '../constants/theme';
import { Category, Transaction, addCategory } from '../db/queries';
import { formatCentsForInput, parseBRLToCents } from '../utils/formatCurrency';
import { getTodayDateString } from '../utils/dates';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';

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
  const [showCreateCategory, setShowCreateCategory] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatColor, setNewCatColor] = useState<string>(AvailableColors[0]);
  const [newCatIcon, setNewCatIcon] = useState<string>(AvailableIcons[0]);

  const { user } = useAuth();
  const { reloadCategories, triggerRefresh } = useFinance();

  const handleSaveInlineCategory = async () => {
    if (!user) return;
    if (!newCatName.trim()) {
      Alert.alert('Nome obrigatório', 'Informe o nome da categoria.');
      return;
    }
    try {
      const newId = await addCategory(
        user.id,
        newCatName.trim(),
        newCatColor,
        newCatIcon
      );
      await reloadCategories();
      triggerRefresh();
      setSelectedCategoryId(newId);
      setNewCatName('');
      setShowCreateCategory(false);
    } catch (e: any) {
      Alert.alert('Erro ao criar categoria', e.message || 'Falha ao salvar categoria.');
    }
  };

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
              <View style={styles.catHeaderRow}>
                <Text style={styles.inputLabel}>Categoria</Text>
                <TouchableOpacity
                  onPress={() => setShowCreateCategory(!showCreateCategory)}
                  style={styles.addCategoryLink}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showCreateCategory ? 'close-circle-outline' : 'add-circle-outline'}
                    size={16}
                    color={Colors.primary}
                  />
                  <Text style={styles.addCategoryLinkText}>
                    {showCreateCategory ? 'Fechar' : 'Nova'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Formulário Inline para Nova Categoria (sem modal aninhado) */}
              {showCreateCategory && (
                <View style={styles.inlineCatBox}>
                  <Text style={styles.inlineCatTitle}>Criar Categoria Rápida</Text>

                  <View style={styles.inlinePreviewRow}>
                    <View style={[styles.inlineIconPreview, { backgroundColor: newCatColor }]}>
                      <Ionicons name={newCatIcon as any} size={20} color="#FFF" />
                    </View>
                    <TextInput
                      style={styles.inlineNameInput}
                      placeholder="Nome da categoria (ex: Farmácia)"
                      placeholderTextColor={Colors.textMuted}
                      value={newCatName}
                      onChangeText={setNewCatName}
                    />
                  </View>

                  <Text style={styles.inlineSubText}>Cor</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.inlineScroll}>
                    {AvailableColors.map((c) => (
                      <TouchableOpacity
                        key={c}
                        style={[
                          styles.inlineColorDot,
                          { backgroundColor: c },
                          newCatColor === c && styles.inlineColorSelected,
                        ]}
                        onPress={() => setNewCatColor(c)}
                      />
                    ))}
                  </ScrollView>

                  <Text style={styles.inlineSubText}>Ícone</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.inlineScroll}>
                    {AvailableIcons.map((ic) => (
                      <TouchableOpacity
                        key={ic}
                        style={[
                          styles.inlineIconItem,
                          newCatIcon === ic && {
                            borderColor: newCatColor,
                            backgroundColor: `${newCatColor}20`,
                          },
                        ]}
                        onPress={() => setNewCatIcon(ic)}
                      >
                        <Ionicons
                          name={ic as any}
                          size={18}
                          color={newCatIcon === ic ? newCatColor : Colors.textMuted}
                        />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <View style={styles.inlineActions}>
                    <TouchableOpacity
                      style={styles.inlineCancelBtn}
                      onPress={() => setShowCreateCategory(false)}
                    >
                      <Text style={styles.inlineCancelText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.inlineSaveBtn}
                      onPress={handleSaveInlineCategory}
                    >
                      <Text style={styles.inlineSaveText}>Salvar e Selecionar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                {/* Botão rápido para adicionar nova categoria */}
                <TouchableOpacity
                  style={styles.addCatChip}
                  onPress={() => setShowCreateCategory(!showCreateCategory)}
                  activeOpacity={0.7}
                >
                  <View style={styles.addCatIconWrap}>
                    <Ionicons name="add" size={16} color={Colors.primary} />
                  </View>
                  <Text style={styles.addCatChipText}>Criar Nova</Text>
                </TouchableOpacity>

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
  catHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addCategoryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  addCategoryLinkText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  inlineCatBox: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: `${Colors.primary}40`,
  },
  inlineCatTitle: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  inlinePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  inlineIconPreview: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineNameInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inlineSubText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
    marginBottom: 4,
  },
  inlineScroll: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  inlineColorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  inlineColorSelected: {
    borderWidth: 2,
    borderColor: '#FFF',
    transform: [{ scale: 1.15 }],
  },
  inlineIconItem: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inlineActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  inlineCancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  inlineCancelText: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  inlineSaveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  inlineSaveText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  catScroll: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  addCatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.primary}18`,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: `${Colors.primary}60`,
    borderStyle: 'dashed',
    gap: 6,
  },
  addCatIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: `${Colors.primary}25`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCatChipText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
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
