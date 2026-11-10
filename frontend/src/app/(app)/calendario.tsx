import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import {
  EventItem,
  getEventsForMonth,
  getEventsForDay,
  createEvent,
  updateEvent,
  deleteEvent,
  toggleEventCompleted,
} from '../../db/queries';
import { getTodayDateString, formatDateBR, getDayLabel } from '../../utils/dates';
import { CalendarMonthView } from '../../components/CalendarMonthView';
import { EventModal } from '../../components/EventModal';
import { playHaptic } from '../../utils/haptics';

export default function CalendarioScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { categories } = useFinance();

  const today = getTodayDateString();
  const [selectedDate, setSelectedDate] = useState<string>(today);

  const [currentYear, setCurrentYear] = useState<number>(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(() => new Date().getMonth());

  const [monthEvents, setMonthEvents] = useState<EventItem[]>([]);
  const [dayEvents, setDayEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);

  const loadData = useCallback(async () => {
    const userId = user?.id || 1;
    try {
      const yearMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
      const [mEvents, dEvents] = await Promise.all([
        getEventsForMonth(userId, yearMonth),
        getEventsForDay(userId, selectedDate),
      ]);
      setMonthEvents(mEvents);
      setDayEvents(dEvents);
    } catch (e) {
      console.warn('Erro ao carregar dados do calendário:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, currentYear, currentMonth, selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleChangeMonth = (delta: number) => {
    playHaptic.selection();
    let newMonth = currentMonth + delta;
    let newYear = currentYear;

    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }

    setCurrentYear(newYear);
    setCurrentMonth(newMonth);
  };

  const handleGoToToday = () => {
    playHaptic.light();
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDate(today);
  };

  const handleToggleCompleted = async (ev: EventItem) => {
    const newStatus = !ev.is_completed;
    if (newStatus) {
      playHaptic.success();
    } else {
      playHaptic.selection();
    }
    // Otimista
    setDayEvents((prev) =>
      prev.map((e) => (e.id === ev.id ? { ...e, is_completed: newStatus } : e))
    );

    const userId = user?.id || 1;
    await toggleEventCompleted(userId, ev.id, newStatus);
    loadData();
  };

  const handleSaveEvent = async (data: any) => {
    const userId = user?.id || 1;
    playHaptic.success();
    if (data.id) {
      await updateEvent(userId, data.id, data);
    } else {
      await createEvent(userId, data);
    }
    loadData();
  };

  const handleDeleteEvent = async (id: number) => {
    const userId = user?.id || 1;
    playHaptic.warning();
    await deleteEvent(userId, id);
    loadData();
  };

  const dayLabel = getDayLabel(selectedDate);
  const formattedDate = formatDateBR(selectedDate);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Agenda & Calendário</Text>
          <Text style={styles.subtitle}>Gerencie compromissos e planeje seus dias</Text>
        </View>

        <TouchableOpacity
          style={styles.addButtonHeader}
          onPress={() => {
            playHaptic.medium();
            setEditingEvent(null);
            setModalVisible(true);
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Visual Calendar */}
        <CalendarMonthView
          currentYear={currentYear}
          currentMonth={currentMonth}
          selectedDate={selectedDate}
          events={monthEvents}
          onSelectDate={(d) => {
            playHaptic.selection();
            setSelectedDate(d);
          }}
          onChangeMonth={handleChangeMonth}
          onGoToToday={handleGoToToday}
        />

        {/* Selected Date Timeline Header */}
        <View style={styles.timelineHeader}>
          <View>
            <View style={styles.timelineDateRow}>
              <Text style={styles.timelineDateText}>{formattedDate}</Text>
              {dayLabel ? (
                <View style={[styles.dayLabelBadge, selectedDate === today && styles.dayLabelBadgeToday]}>
                  <Text
                    style={[
                      styles.dayLabelText,
                      selectedDate === today && styles.dayLabelTextToday,
                    ]}
                  >
                    {dayLabel}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.timelineSubText}>
              {dayEvents.length === 1
                ? '1 compromisso agendado'
                : `${dayEvents.length} compromissos agendados`}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.quickAddBtn}
            onPress={() => {
              setEditingEvent(null);
              setModalVisible(true);
            }}
          >
            <Ionicons name="add" size={16} color={Colors.primary} />
            <Text style={styles.quickAddText}>Novo</Text>
          </TouchableOpacity>
        </View>

        {/* Timeline Events List */}
        {loading ? (
          <View style={styles.loadingArea}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        ) : dayEvents.length > 0 ? (
          <View style={styles.eventsList}>
            {dayEvents.map((ev) => {
              const isCompleted = Boolean(ev.is_completed);
              const eventColor = ev.color || Colors.primary;

              return (
                <TouchableOpacity
                  key={ev.id}
                  style={[
                    styles.eventCard,
                    isCompleted && styles.eventCardCompleted,
                  ]}
                  onPress={() => {
                    setEditingEvent(ev);
                    setModalVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  {/* Left Color Bar */}
                  <View style={[styles.eventColorBar, { backgroundColor: eventColor }]} />

                  {/* Checkbox for Completion */}
                  <TouchableOpacity
                    style={styles.checkboxTouch}
                    onPress={() => handleToggleCompleted(ev)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                      color={isCompleted ? Colors.primary : Colors.textMuted}
                    />
                  </TouchableOpacity>

                  {/* Event Details */}
                  <View style={styles.eventInfo}>
                    <View style={styles.eventTimeRow}>
                      <Text style={[styles.eventTime, isCompleted && styles.textCompleted]}>
                        {ev.time ? (ev.end_time ? `${ev.time} - ${ev.end_time}` : ev.time) : 'Dia todo'}
                      </Text>

                      {ev.category_name && (
                        <View style={styles.eventCategoryTag}>
                          <Text style={styles.eventCategoryTagText}>{ev.category_name}</Text>
                        </View>
                      )}
                    </View>

                    <Text
                      style={[styles.eventTitle, isCompleted && styles.textCompleted]}
                      numberOfLines={2}
                    >
                      {ev.title}
                    </Text>

                    {ev.description ? (
                      <Text style={styles.eventDescription} numberOfLines={2}>
                        {ev.description}
                      </Text>
                    ) : null}
                  </View>

                  {/* Notification Icon if scheduled */}
                  {ev.notification_id ? (
                    <View style={styles.notificationBadge}>
                      <Ionicons name="notifications" size={14} color={Colors.warning} />
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyDayContainer}>
            <View style={styles.emptyDayIcon}>
              <Ionicons name="calendar-outline" size={32} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyDayTitle}>Dia livre!</Text>
            <Text style={styles.emptyDayText}>
              Nenhum evento agendado para {formattedDate}.
            </Text>
            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={() => {
                setEditingEvent(null);
                setModalVisible(true);
              }}
            >
              <Ionicons name="add-circle-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.emptyAddBtnText}>Agendar Compromisso</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modal */}
      <EventModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        initialEvent={editingEvent}
        defaultDate={selectedDate}
        categories={categories}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  addButtonHeader: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  scroll: {
    flex: 1,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 22,
    marginBottom: 12,
  },
  timelineDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timelineDateText: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  dayLabelBadge: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dayLabelBadgeToday: {
    backgroundColor: Colors.primaryMuted,
  },
  dayLabelText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  dayLabelTextToday: {
    color: Colors.primary,
  },
  timelineSubText: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  quickAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  quickAddText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  loadingArea: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  eventsList: {
    paddingHorizontal: 20,
    gap: 10,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    position: 'relative',
  },
  eventCardCompleted: {
    opacity: 0.6,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  eventColorBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  checkboxTouch: {
    marginRight: 12,
    marginLeft: 4,
  },
  eventInfo: {
    flex: 1,
  },
  eventTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  eventTime: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  eventCategoryTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  eventCategoryTagText: {
    color: Colors.textMuted,
    fontSize: 10,
  },
  eventTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  eventDescription: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  textCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  notificationBadge: {
    marginLeft: 8,
  },
  emptyDayContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyDayIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyDayTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptyDayText: {
    color: Colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyAddBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
