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
import { Colors, AvailableColors } from '../constants/theme';
import { Category, EventItem } from '../db/queries';
import { scheduleEventNotification, cancelNotification } from '../services/notifications';

interface EventModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    id?: number;
    title: string;
    description?: string | null;
    date: string;
    time?: string | null;
    end_time?: string | null;
    category_id?: number | null;
    color?: string | null;
    notification_id?: string | null;
  }) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
  initialEvent?: EventItem | null;
  defaultDate: string; // 'AAAA-MM-DD'
  categories: Category[];
}

const REMINDER_OPTIONS = [
  { label: 'Sem lembrete', minutes: -1 },
  { label: 'Na hora', minutes: 0 },
  { label: '15 min antes', minutes: 15 },
  { label: '30 min antes', minutes: 30 },
  { label: '1 hora antes', minutes: 60 },
];

export const EventModal: React.FC<EventModalProps> = ({
  visible,
  onClose,
  onSave,
  onDelete,
  initialEvent,
  defaultDate,
  categories,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [isAllDay, setIsAllDay] = useState(false);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [color, setColor] = useState(Colors.info);
  const [reminderMinutes, setReminderMinutes] = useState(15);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialEvent) {
      setTitle(initialEvent.title);
      setDescription(initialEvent.description || '');
      setDate(initialEvent.date);
      setTime(initialEvent.time || '');
      setEndTime(initialEvent.end_time || '');
      setIsAllDay(!initialEvent.time);
      setCategoryId(initialEvent.category_id || null);
      setColor(initialEvent.color || Colors.info);
      setReminderMinutes(initialEvent.notification_id ? 15 : -1);
    } else {
      setTitle('');
      setDescription('');
      setDate(defaultDate);
      setTime('09:00');
      setEndTime('10:00');
      setIsAllDay(false);
      setCategoryId(null);
      setColor(Colors.info);
      setReminderMinutes(15);
    }
  }, [initialEvent, defaultDate, visible]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Atenção', 'Informe o título do compromisso.');
      return;
    }

    try {
      setLoading(true);

      let notificationId: string | null = initialEvent?.notification_id || null;

      // Se havia notificação anterior e mudou, cancela
      if (initialEvent?.notification_id) {
        await cancelNotification(initialEvent.notification_id);
        notificationId = null;
      }

      // Agenda nova notificação se habilitada
      if (reminderMinutes >= 0 && !isAllDay) {
        const scheduledId = await scheduleEventNotification(
          title.trim(),
          date,
          time,
          reminderMinutes
        );
        if (scheduledId) {
          notificationId = scheduledId;
        }
      }

      await onSave({
        id: initialEvent ? initialEvent.id : undefined,
        title: title.trim(),
        description: description.trim() || null,
        date,
        time: isAllDay ? null : time.trim(),
        end_time: isAllDay ? null : endTime.trim() || null,
        category_id: categoryId,
        color,
        notification_id: notificationId,
      });

      onClose();
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Falha ao salvar evento');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!initialEvent || !onDelete) return;
    Alert.alert('Excluir Compromisso', `Deseja excluir "${initialEvent.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            if (initialEvent.notification_id) {
              await cancelNotification(initialEvent.notification_id);
            }
            await onDelete(initialEvent.id);
            onClose();
          } catch (e: any) {
            Alert.alert('Erro', e.message || 'Falha ao excluir evento');
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
              {initialEvent ? 'Editar Compromisso' : 'Novo Compromisso'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Título */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Título / Compromisso *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Consulta com Dentista, Reunião, Treino..."
                placeholderTextColor={Colors.textMuted}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Data e Dia Todo */}
            <View style={styles.section}>
              <View style={styles.rowBetween}>
                <Text style={styles.sectionLabel}>Data (AAAA-MM-DD)</Text>
                <TouchableOpacity
                  style={styles.toggleRow}
                  onPress={() => setIsAllDay(!isAllDay)}
                >
                  <Ionicons
                    name={isAllDay ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={isAllDay ? Colors.primary : Colors.textMuted}
                  />
                  <Text style={[styles.toggleText, isAllDay && { color: Colors.primary }]}>
                    Dia todo
                  </Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={Colors.textMuted}
                value={date}
                onChangeText={setDate}
              />
            </View>

            {/* Horários (se não for dia todo) */}
            {!isAllDay && (
              <View style={styles.section}>
                <View style={styles.timeRow}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.sectionLabel}>Início (HH:mm)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="09:00"
                      placeholderTextColor={Colors.textMuted}
                      value={time}
                      onChangeText={setTime}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionLabel}>Fim (Opcional)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="10:00"
                      placeholderTextColor={Colors.textMuted}
                      value={endTime}
                      onChangeText={setEndTime}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Lembrete / Alerta */}
            {!isAllDay && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Lembrete / Notificação</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reminderRow}>
                  {REMINDER_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.minutes}
                      style={[
                        styles.reminderChip,
                        reminderMinutes === opt.minutes && styles.reminderChipActive,
                      ]}
                      onPress={() => setReminderMinutes(opt.minutes)}
                    >
                      <Ionicons
                        name={opt.minutes >= 0 ? 'notifications-outline' : 'notifications-off-outline'}
                        size={14}
                        color={reminderMinutes === opt.minutes ? '#FFF' : Colors.textSecondary}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.reminderChipText,
                          reminderMinutes === opt.minutes && styles.reminderChipTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Categoria */}
            {categories.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Categoria (Opcional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
                  <TouchableOpacity
                    style={[styles.catChip, categoryId === null && styles.catChipActive]}
                    onPress={() => setCategoryId(null)}
                  >
                    <Text style={[styles.catChipText, categoryId === null && styles.catChipTextActive]}>
                      Geral
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

            {/* Cor de Destaque */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Cor na Agenda</Text>
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

            {/* Descrição / Notas */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Notas / Local (Opcional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Ex: Levar exames recentes, Sala 402..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={3}
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {/* Botão Excluir */}
            {initialEvent && (
              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={18} color={Colors.expense} style={{ marginRight: 6 }} />
                <Text style={styles.deleteButtonText}>Excluir Compromisso</Text>
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
                {loading ? 'Salvando...' : initialEvent ? 'Salvar Alterações' : 'Adicionar Compromisso'}
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
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  toggleText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  timeRow: {
    flexDirection: 'row',
  },
  reminderRow: {
    gap: 8,
  },
  reminderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reminderChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  reminderChipText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  reminderChipTextActive: {
    color: '#FFF',
  },
  catRow: {
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
  catChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted,
  },
  catChipText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  catChipTextActive: {
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
