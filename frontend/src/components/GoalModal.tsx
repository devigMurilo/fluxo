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
import { getTodayDateString } from '../utils/dates';

interface GoalModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    id?: number;
    title: string;
    period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'once';
    target_type: 'counter' | 'value' | 'boolean';
    target_value: number;
    unit: string;
    category_id?: number | null;
    color: string;
    icon: string;
    is_recurring?: boolean | number;
    deadline?: string | null;
    points_reward?: number;
    points_penalty?: number;
  }) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
  initialGoal?: GoalWithProgress | null;
  categories: Category[];
}

const HABIT_SUGGESTIONS = [
  { title: 'Treinar 5x na semana', period: 'weekly', target: 5, unit: 'vezes', icon: 'fitness-outline', color: '#10B981', is_recurring: true },
  { title: 'Beber 2.5L de água', period: 'daily', target: 2500, unit: 'ml', icon: 'water-outline', color: '#06B6D4', is_recurring: true },
  { title: 'Ler 12 livros no ano', period: 'yearly', target: 12, unit: 'livros', icon: 'book-outline', color: '#8B5CF6', is_recurring: true },
  { title: 'Estudar 1h por dia', period: 'daily', target: 60, unit: 'minutos', icon: 'school-outline', color: '#3B82F6', is_recurring: true },
];

const ONE_OFF_SUGGESTIONS = [
  { title: 'Emagrecer 8 quilos', period: 'once', target: 8, unit: 'kg', icon: 'fitness-outline', color: '#EC4899', is_recurring: false, days: 60, reward: 150, penalty: 75 },
  { title: 'Economizar R$ 5.000', period: 'once', target: 5000, unit: 'R$', icon: 'wallet-outline', color: '#10B981', is_recurring: false, days: 90, reward: 200, penalty: 100 },
  { title: 'Correr maratona de 15km', period: 'once', target: 15, unit: 'km', icon: 'bicycle-outline', color: '#F59E0B', is_recurring: false, days: 45, reward: 120, penalty: 60 },
  { title: 'Ler livro de 400 páginas', period: 'once', target: 400, unit: 'páginas', icon: 'book-outline', color: '#8B5CF6', is_recurring: false, days: 30, reward: 100, penalty: 50 },
];

const COMMON_UNITS = ['vezes', 'kg', 'dias', 'km', 'litros', 'ml', 'páginas', 'livros', 'horas', 'minutos', 'R$'];

export const GoalModal: React.FC<GoalModalProps> = ({
  visible,
  onClose,
  onSave,
  onDelete,
  initialGoal,
  categories,
}) => {
  const [isRecurring, setIsRecurring] = useState(true);
  const [title, setTitle] = useState('');
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'once'>('weekly');
  const [targetValue, setTargetValue] = useState('5');
  const [unit, setUnit] = useState('vezes');
  const [deadline, setDeadline] = useState('');
  const [pointsReward, setPointsReward] = useState('100');
  const [pointsPenalty, setPointsPenalty] = useState('50');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [color, setColor] = useState(Colors.primary);
  const [icon, setIcon] = useState('fitness-outline');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialGoal) {
      const rec = initialGoal.is_recurring !== undefined ? Boolean(initialGoal.is_recurring) : initialGoal.period !== 'once';
      setIsRecurring(rec);
      setTitle(initialGoal.title);
      setPeriod(initialGoal.period);
      setTargetValue(String(initialGoal.target_value));
      setUnit(initialGoal.unit);
      setDeadline(initialGoal.deadline || '');
      setPointsReward(String(initialGoal.points_reward || 100));
      setPointsPenalty(String(initialGoal.points_penalty || 50));
      setCategoryId(initialGoal.category_id || null);
      setColor(initialGoal.color || Colors.primary);
      setIcon(initialGoal.icon || 'trophy-outline');
    } else {
      setIsRecurring(true);
      setTitle('');
      setPeriod('weekly');
      setTargetValue('5');
      setUnit('vezes');

      // Prazo padrão de 30 dias para desafios
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 30);
      const dy = defaultDate.getFullYear();
      const dm = String(defaultDate.getMonth() + 1).padStart(2, '0');
      const dd = String(defaultDate.getDate()).padStart(2, '0');
      setDeadline(`${dy}-${dm}-${dd}`);

      setPointsReward('100');
      setPointsPenalty('50');
      setCategoryId(null);
      setColor(Colors.primary);
      setIcon('fitness-outline');
    }
  }, [initialGoal, visible]);

  const handleApplySuggestion = (s: any) => {
    setIsRecurring(s.is_recurring);
    setTitle(s.title);
    setPeriod(s.period);
    setTargetValue(String(s.target));
    setUnit(s.unit);
    setIcon(s.icon);
    setColor(s.color);

    if (!s.is_recurring && s.days) {
      const d = new Date();
      d.setDate(d.getDate() + s.days);
      const dy = d.getFullYear();
      const dm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setDeadline(`${dy}-${dm}-${dd}`);
      setPointsReward(String(s.reward || 100));
      setPointsPenalty(String(s.penalty || 50));
    }
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

    if (!isRecurring) {
      if (!deadline.trim() || deadline.length !== 10) {
        Alert.alert('Atenção', 'Informe uma data limite válida no formato AAAA-MM-DD para o desafio.');
        return;
      }
    }

    try {
      setLoading(true);
      await onSave({
        id: initialGoal ? initialGoal.id : undefined,
        title: title.trim(),
        period: isRecurring ? (period === 'once' ? 'weekly' : period) : 'once',
        target_type: 'counter',
        target_value: numericTarget,
        unit: unit.trim() || 'vezes',
        category_id: categoryId,
        color,
        icon,
        is_recurring: isRecurring ? 1 : 0,
        deadline: !isRecurring ? deadline.trim() : null,
        points_reward: parseInt(pointsReward, 10) || 100,
        points_penalty: parseInt(pointsPenalty, 10) || 50,
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
              {initialGoal ? 'Editar Meta' : 'Nova Meta / Desafio'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Seletor de Tipo: Hábito Recorrente vs Meta Única */}
            <View style={styles.typeSelectorRow}>
              <TouchableOpacity
                style={[styles.typeOptionBtn, isRecurring && styles.typeOptionBtnActive]}
                onPress={() => {
                  setIsRecurring(true);
                  if (period === 'once') setPeriod('weekly');
                }}
              >
                <Ionicons
                  name="repeat-outline"
                  size={16}
                  color={isRecurring ? '#FFF' : Colors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.typeOptionText, isRecurring && styles.typeOptionTextActive]}>
                  Hábito Recorrente
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeOptionBtn, !isRecurring && styles.typeOptionBtnActive]}
                onPress={() => {
                  setIsRecurring(false);
                  setPeriod('once');
                }}
              >
                <Ionicons
                  name="trophy-outline"
                  size={16}
                  color={!isRecurring ? '#FFF' : Colors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.typeOptionText, !isRecurring && styles.typeOptionTextActive]}>
                  Desafio com Prazo
                </Text>
              </TouchableOpacity>
            </View>

            {/* Sugestões Rápidas (Apenas ao criar) */}
            {!initialGoal && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>
                  {isRecurring ? 'Sugestões de Hábitos' : 'Sugestões de Desafios'}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsScroll}>
                  {(isRecurring ? HABIT_SUGGESTIONS : ONE_OFF_SUGGESTIONS).map((s, idx) => (
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
                placeholder={isRecurring ? "Ex: Treinar, Beber água, Meditar..." : "Ex: Emagrecer 8 quilos, Juntar R$ 5.000..."}
                placeholderTextColor={Colors.textMuted}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Se for Recorrente: Frequência de Ciclo */}
            {isRecurring ? (
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
            ) : (
              /* Se for Meta Única: Prazo e Gamificação de Pontos */
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Data Limite / Prazo (AAAA-MM-DD) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 2026-12-31"
                  placeholderTextColor={Colors.textMuted}
                  value={deadline}
                  onChangeText={setDeadline}
                />

                <View style={[styles.targetRow, { marginTop: 12 }]}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.sectionLabel}>Recompensa (Pontos)</Text>
                    <View style={styles.pointsInputWrap}>
                      <Ionicons name="star" size={16} color={Colors.warning} style={{ marginRight: 6 }} />
                      <TextInput
                        style={styles.pointsInput}
                        placeholder="100"
                        placeholderTextColor={Colors.textMuted}
                        keyboardType="numeric"
                        value={pointsReward}
                        onChangeText={setPointsReward}
                      />
                    </View>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionLabel}>Penalidade (se expirar)</Text>
                    <View style={styles.pointsInputWrap}>
                      <Ionicons name="alert-circle" size={16} color={Colors.expense} style={{ marginRight: 6 }} />
                      <TextInput
                        style={styles.pointsInput}
                        placeholder="50"
                        placeholderTextColor={Colors.textMuted}
                        keyboardType="numeric"
                        value={pointsPenalty}
                        onChangeText={setPointsPenalty}
                      />
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Alvo e Unidade */}
            <View style={styles.section}>
              <View style={styles.targetRow}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.sectionLabel}>Quantidade Alvo *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 5 ou 8"
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
                    placeholder="kg, vezes, km..."
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
                {AvailableIcons.map((ic) => (
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
    maxHeight: '92%',
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
  typeSelectorRow: {
    flexDirection: 'row',
    marginTop: 16,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  typeOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  typeOptionBtnActive: {
    backgroundColor: Colors.primary,
  },
  typeOptionText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  typeOptionTextActive: {
    color: '#FFF',
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
  pointsInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pointsInput: {
    flex: 1,
    color: Colors.text,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '700',
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
