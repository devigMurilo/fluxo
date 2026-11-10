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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, AvailableColors, AvailableIcons } from '../constants/theme';
import { Category } from '../db/queries';
import { playHaptic } from '../utils/haptics';

interface CategoryModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: { name: string; color: string; icon: string }) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
  categoryToEdit?: Category | null;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  visible,
  onClose,
  onSave,
  onDelete,
  categoryToEdit,
}) => {
  const [name, setName] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>(AvailableColors[0]);
  const [selectedIcon, setSelectedIcon] = useState<string>(AvailableIcons[0]);
  const [iconSearch, setIconSearch] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    setIconSearch('');
    if (categoryToEdit) {
      setName(categoryToEdit.name);
      setSelectedColor(categoryToEdit.color);
      setSelectedIcon(categoryToEdit.icon);
    } else {
      setName('');
      setSelectedColor(AvailableColors[0]);
      setSelectedIcon(AvailableIcons[0]);
    }
  }, [categoryToEdit, visible]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Nome obrigatório', 'Por favor, informe o nome da categoria.');
      return;
    }

    try {
      setIsSubmitting(true);
      playHaptic.success();
      await onSave({
        name: name.trim(),
        color: selectedColor,
        icon: selectedIcon,
      });
      onClose();
    } catch (e: any) {
      Alert.alert('Erro ao salvar', e.message || 'Ocorreu um erro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!categoryToEdit || !onDelete) return;
    playHaptic.warning();

    Alert.alert(
      'Confirmar exclusão',
      `Deseja remover a categoria "${categoryToEdit.name}"? As transações vinculadas a ela ficarão como "Outros".`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSubmitting(true);
              playHaptic.warning();
              await onDelete(categoryToEdit.id);
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

  const filteredIcons = iconSearch.trim()
    ? AvailableIcons.filter((ic) => ic.toLowerCase().includes(iconSearch.toLowerCase().trim()))
    : AvailableIcons;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {categoryToEdit ? 'Editar Categoria' : 'Nova Categoria'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Preview do Ícone */}
            <View style={styles.previewContainer}>
              <View style={[styles.previewCircle, { backgroundColor: selectedColor }]}>
                <Ionicons name={selectedIcon as any} size={32} color="#FFF" />
              </View>
              <Text style={styles.previewText}>{name || 'Nome da Categoria'}</Text>
            </View>

            {/* Input Nome */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nome da Categoria</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ex: Viagens, Assinaturas..."
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Paleta de Cores */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Escolha uma Cor</Text>
              <View style={styles.colorsGrid}>
                {AvailableColors.map((color) => {
                  const isSelected = selectedColor === color;
                  return (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        isSelected && styles.colorOptionSelected,
                      ]}
                      onPress={() => {
                        playHaptic.selection();
                        setSelectedColor(color);
                      }}
                      activeOpacity={0.8}
                    >
                      {isSelected && <Ionicons name="checkmark" size={18} color="#FFF" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Seleção de Ícone */}
            <View style={styles.inputGroup}>
              <View style={styles.iconHeaderRow}>
                <Text style={styles.inputLabel}>Escolha um Ícone</Text>
                <Text style={styles.iconCountBadge}>
                  {filteredIcons.length} disponíveis
                </Text>
              </View>

              {/* Barra de Busca de Ícones */}
              <View style={styles.iconSearchWrap}>
                <Ionicons name="search-outline" size={16} color={Colors.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.iconSearchInput}
                  placeholder="Buscar ícone (ex: carro, café, gym, dinheiro)..."
                  placeholderTextColor={Colors.textMuted}
                  value={iconSearch}
                  onChangeText={setIconSearch}
                  autoCapitalize="none"
                />
                {iconSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setIconSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.iconsGrid}>
                {filteredIcons.map((icon) => {
                  const isSelected = selectedIcon === icon;
                  return (
                    <TouchableOpacity
                      key={icon}
                      style={[
                        styles.iconOption,
                        isSelected && { borderColor: selectedColor, backgroundColor: `${selectedColor}20` },
                      ]}
                      onPress={() => {
                        playHaptic.selection();
                        setSelectedIcon(icon);
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={icon as any}
                        size={22}
                        color={isSelected ? selectedColor : Colors.textSecondary}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
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
                  {isSubmitting ? 'Salvando...' : categoryToEdit ? 'Atualizar' : 'Salvar'}
                </Text>
              </TouchableOpacity>

              {categoryToEdit && onDelete && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDelete}
                  disabled={isSubmitting}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={18} color={Colors.expense} />
                  <Text style={styles.deleteButtonText}>Excluir Categoria</Text>
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
  previewContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  previewCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    elevation: 3,
  },
  previewText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
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
  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#FFF',
    transform: [{ scale: 1.1 }],
  },
  iconHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  iconCountBadge: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  iconSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
    marginTop: 4,
  },
  iconSearchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 13,
    padding: 0,
  },
  iconsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
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
