import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, AvailableIcons, AvailableColors } from '../constants/theme';
import { Category, GoalWithProgress } from '../db/queries';

interface GoalModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    id?: number;
    title: string;
    period: 'daily' | 'weekly' | 'monthly' | 'yearly';
    target_type: 'counter' | 'value' | 'boolean';
    target_value: number;
    unit: string;
    category_id?: number | null;
    color: string;
    icon: string;
  }) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
  initialGoal?: GoalWithProgress | null;
  categories: Category[];
}

const SUGGESTIONS = [
  { title: 'Treinar 5x na semana', period: 'weekly', target: 5, unit: 'vezes', icon: 'fitness-outline', color: '#10B981' },
  { title: 'Beber 2.5L de água', period: 'daily', target: 2500, unit: 'ml', icon: 'water-outline', color: '#06B6D4' },
  { title: 'Ler 12 livros no ano', period: 'yearly', target: 12, unit: 'livros', icon: 'book-outline', color: '#8B5CF6' },
  { title: 'Estudar 1h por dia', period: 'daily', target: 60, unit: 'minutos', icon: 'school-outline', color: '#3B82F6' },
  { title: 'Economizar R$ 1.000', period: 'monthly', target: 1000, unit: 'R$', icon: 'wallet-outline', color: '#F59E0B' },
  { title: 'Correr 15km na semana', period: 'weekly', target: 15, unit: 'km', icon: 'bicycle-outline', color: '#EC4899' },
];

const COMMON_UNITS = ['vezes', 'dias', 'km', 'litros', 'ml', 'páginas', 'livros', 'horas', 'minutos', 'R$'];

export const GoalModal: React.FC<GoalModalProps> = ({
  visible,
  onClose,
  onSave,
  onDelete,
  initialGoal,
  categories,
}) => {
  const [title, setTitle] = useState('');
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('weekly');
  const [targetValue, setTargetValue] = useState('5');
  const [unit, setUnit] = useState('vezes');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [color, setColor] = useState(Colors.primary);
  const [icon, setIcon] = useState('fitness-outline');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialGoal) {
      setTitle(initialGoal.title);
      setPeriod(initialGoal.period);
      setTargetValue(String(initialGoal.target_value));
      setUnit(initialGoal.unit);
      setCategoryId(initialGoal.category_id || null);
      setColor(initialGoal.color || Colors.primary);
      setIcon(initialGoal.icon || 'trophy-outline');
    } else {
      setTitle('');
      setPeriod('weekly');
      setTargetValue('5');
      setUnit('vezes');
      setCategoryId(null);
      setColor(Colors.primary);
      setIcon('fitness-outline');
    }
  }, [initialGoal, visible]);

  const handleApplySuggestion = (s: typeof SUGGESTIONS[0]) => {
    setTitle(s.title);
    setPeriod(s.period as any);
    setTargetValue(String(s.target));
    setUnit(s.unit);
    setIcon(s.icon);
    setColor(s.color);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Atenção', 'Informe o título ou objetivo da meta.');
      return;
    }

    const numericTarget = parseFloat(targetValue.replace(',', '.'));
    if (isNaN(numericTarget) || numericTarget <= 0) {
      Alert.alert('Atenção', 'Informe um valor alvo válido maior que zero.');
      return;
    }

    try {
      setLoading(true);
      await onSave({
        id: initialGoal ? initialGoal.id : undefined,
        title: title.trim(),
        period,
        target_type: 'counter',
        target_value: numericTarget,
        unit: unit.trim() || 'vezes',
        category_id: categoryId,
        color,
        icon,
      });
      onClose();
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Falha ao salvar meta');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!initialGoal || !onDelete) return;
    Alert.alert('Excluir Meta', `Deseja realmente excluir "${initialGoal.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            await onDelete(initialGoal.id);
            onClose();
          } catch (e: any) {
            Alert.alert('Erro', e.message || 'Falha ao excluir meta');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {initialGoal ? 'Editar Meta' : 'Nova Meta / Hábito'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Sugestões Rápidas (Apenas ao criar) */}
            {!initialGoal && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Sugestões Rápidas</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsScroll}>
                  {SUGGESTIONS.map((s, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.suggestionChip, { borderColor: `${s.color}60` }]}
                      onPress={() => handleApplySuggestion(s)}
                    >
                      <Ionicons name={s.icon as any} size={14} color={s.color} style={{ marginRight: 6 }} />
                      <Text style={styles.suggestionText}>{s.title}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Título da Meta */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Objetivo / Título *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Treinar na academia, Beber água..."
                placeholderTextColor={Colors.textMuted}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Frequência / Periodicidade */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Frequência de Ciclo *</Text>
              <View style={styles.periodRow}>
                {[
                  { id: 'daily', label: 'Diária' },
                  { id: 'weekly', label: 'Semanal' },
                  { id: 'monthly', label: 'Mensal' },
                  { id: 'yearly', label: 'Anual' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.periodBtn,
                      period === item.id && { backgroundColor: color, borderColor: color },
                    ]}
                    onPress={() => setPeriod(item.id as any)}
                  >
                    <Text
                      style={[
                        styles.periodBtnText,
                        period === item.id && { color: '#FFF', fontWeight: '700' },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Alvo e Unidade */}
            <View style={styles.section}>
              <View style={styles.targetRow}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.sectionLabel}>Quantidade Alvo *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 5"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                    value={targetValue}
                    onChangeText={setTargetValue}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionLabel}>Unidade de Medida</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="vezes, km, litros..."
                    placeholderTextColor={Colors.textMuted}
                    value={unit}
                    onChangeText={setUnit}
                  />
                </View>
              </View>

              {/* Unidades Comuns */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.unitsRow}>
                {COMMON_UNITS.map((u) => (
                  <TouchableOpacity
                    key={u}
                    style={[styles.unitChip, unit === u && { borderColor: color, backgroundColor: `${color}20` }]}
                    onPress={() => setUnit(u)}
                  >
                    <Text style={[styles.unitChipText, unit === u && { color, fontWeight: '700' }]}>
                      {u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Categoria */}
            {categories.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Categoria (Opcional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
                  <TouchableOpacity
                    style={[styles.catChip, categoryId === null && styles.catChipSelected]}
                    onPress={() => setCategoryId(null)}
                  >
                    <Text style={[styles.catChipText, categoryId === null && styles.catChipTextSelected]}>
                      Sem categoria
                    </Text>
                  </TouchableOpacity>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.catChip,
                        categoryId === cat.id && { borderColor: cat.color, backgroundColor: `${cat.color}25` },
                      ]}
                      onPress={() => {
                        setCategoryId(cat.id);
                        setColor(cat.color);
                      }}
                    >
                      <Ionicons name={(cat.icon || 'pricetag') as any} size={14} color={cat.color} style={{ marginRight: 6 }} />
                      <Text style={[styles.catChipText, categoryId === cat.id && { color: cat.color, fontWeight: '700' }]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Cores */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Cor Visual</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorRow}>
                {AvailableColors.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.colorCircle, { backgroundColor: c }, color === c && styles.colorCircleSelected]}
                    onPress={() => setColor(c)}
                  />
                ))}
              </ScrollView>
            </View>

            {/* Ícones */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Ícone</Text>
              <View style={styles.iconGrid}>
                {AvailableIcons.slice(0, 18).map((ic) => (
                  <TouchableOpacity
                    key={ic}
                    style={[
                      styles.iconBtn,
                      icon === ic && { backgroundColor: `${color}25`, borderColor: color },
                    ]}
                    onPress={() => setIcon(ic)}
                  >
                    <Ionicons name={ic as any} size={20} color={icon === ic ? color : Colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Botão Excluir */}
            {initialGoal && (
              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={18} color={Colors.expense} style={{ marginRight: 6 }} />
                <Text style={styles.deleteButtonText}>Excluir Meta</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Footer Save Button */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: color }, loading && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Salvando...' : initialGoal ? 'Salvar Alterações' : 'Criar Meta'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  scroll: {
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 18,
  },
  sectionLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  suggestionsScroll: {
    gap: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  suggestionText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '500',
  },
  input: {
    backgroundColor: Colors.surfaceLight,
    color: Colors.text,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  periodBtnText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  targetRow: {
    flexDirection: 'row',
  },
  unitsRow: {
    gap: 6,
    marginTop: 10,
  },
  unitChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  unitChipText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  categoriesRow: {
    gap: 8,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted,
  },
  catChipText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  catChipTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  colorRow: {
    gap: 10,
    paddingVertical: 4,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: '#FFF',
    transform: [{ scale: 1.15 }],
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.expenseBg,
  },
  deleteButtonText: {
    color: Colors.expense,
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
