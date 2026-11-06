import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { formatCentsForInput, parseBRLToCents } from '../utils/formatCurrency';
import { getTodayDateString } from '../utils/dates';

interface InvestmentModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    type: string;
    amount: number;
    startDate: string;
  }) => Promise<void>;
}

const INVESTMENT_TYPES = [
  'Tesouro Direto',
  'CDB',
  'LCI / LCA',
  'Fundos de Investimento',
  'Ações',
  'FIIs',
  'Outros',
];

export const InvestmentModal: React.FC<InvestmentModalProps> = ({
  visible,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState<string>('');
  const [type, setType] = useState<string>(INVESTMENT_TYPES[0]);
  const [amountCents, setAmountCents] = useState<number>(0);
  const [startDate, setStartDate] = useState<string>(getTodayDateString());
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Nome obrigatório', 'Por favor, informe o nome do ativo.');
      return;
    }
    if (amountCents <= 0) {
      Alert.alert('Valor inválido', 'Por favor, informe o valor investido.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        name: name.trim(),
        type,
        amount: amountCents,
        startDate: startDate.trim(),
      });
      setName('');
      setAmountCents(0);
      setStartDate(getTodayDateString());
      onClose();
    } catch (e: any) {
      Alert.alert('Erro ao salvar', e.message || 'Ocorreu um erro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Adicionar Ativo à Carteira</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Input Valor Formatado */}
            <View style={styles.amountInputContainer}>
              <Text style={styles.amountLabel}>Valor Aplicado</Text>
              <TextInput
                style={styles.amountInput}
                keyboardType="numeric"
                value={formatCentsForInput(amountCents)}
                onChangeText={(t) => setAmountCents(parseBRLToCents(t))}
                placeholder="R$ 0,00"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            {/* Nome do Ativo */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nome do Ativo</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ex: Tesouro Selic 2029, CDB Inter 110%..."
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Tipo de Ativo */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tipo de Ativo</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                {INVESTMENT_TYPES.map((t) => {
                  const isSelected = type === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.typeChip,
                        isSelected && { borderColor: Colors.primary, backgroundColor: `${Colors.primary}25` },
                      ]}
                      onPress={() => setType(t)}
                    >
                      <Text
                        style={[
                          styles.typeChipText,
                          isSelected && { color: Colors.primary, fontWeight: '700' },
                        ]}
                      >
                        {t}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Data de Aplicação */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Data da Aplicação (AAAA-MM-DD)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={Colors.textMuted}
                value={startDate}
                onChangeText={setStartDate}
              />
            </View>

            {/* Botão Salvar */}
            <TouchableOpacity
              style={[styles.saveButton, isSubmitting && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <Text style={styles.saveButtonText}>
                {isSubmitting ? 'Salvando...' : 'Salvar na Carteira'}
              </Text>
            </TouchableOpacity>
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
    color: Colors.primary,
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
  typeScroll: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.surfaceLight,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  typeChipText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
