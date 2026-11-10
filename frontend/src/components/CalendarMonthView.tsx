import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { MONTH_NAMES, getTodayDateString } from '../utils/dates';
import { EventItem } from '../db/queries';

interface CalendarMonthViewProps {
  currentYear: number;
  currentMonth: number; // 0 a 11
  selectedDate: string; // 'AAAA-MM-DD'
  events: EventItem[];
  onSelectDate: (dateStr: string) => void;
  onChangeMonth: (delta: number) => void;
  onGoToToday: () => void;
}

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export const CalendarMonthView: React.FC<CalendarMonthViewProps> = ({
  currentYear,
  currentMonth,
  selectedDate,
  events,
  onSelectDate,
  onChangeMonth,
  onGoToToday,
}) => {
  const today = getTodayDateString();

  // Quantidade de dias no mês
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  // Dia da semana do 1º dia (0 = Domingo, 1 = Segunda, etc.)
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  // Dias vazios antes do 1º dia
  const blankDays = Array.from({ length: firstDayIndex }, (_, i) => i);
  // Array de dias 1 a N
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Mapeia eventos por data para renderizar os marcadores
  const eventsByDate = events.reduce((acc, ev) => {
    if (!acc[ev.date]) acc[ev.date] = [];
    acc[ev.date].push(ev);
    return acc;
  }, {} as Record<string, EventItem[]>);

  const monthName = MONTH_NAMES[currentMonth];

  return (
    <View style={styles.container}>
      {/* Month Navigator Header */}
      <View style={styles.header}>
        <View style={styles.monthTitleArea}>
          <Text style={styles.monthTitle}>
            {monthName} <Text style={styles.yearText}>{currentYear}</Text>
          </Text>
        </View>

        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.todayBtn} onPress={onGoToToday}>
            <Text style={styles.todayBtnText}>Hoje</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => onChangeMonth(-1)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={20} color={Colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => onChangeMonth(1)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-forward" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Weekdays Row */}
      <View style={styles.weekdaysRow}>
        {WEEKDAYS.map((day, idx) => (
          <View key={idx} style={styles.weekdayCell}>
            <Text style={[styles.weekdayText, (idx === 0 || idx === 6) && styles.weekendText]}>
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* Days Grid */}
      <View style={styles.grid}>
        {blankDays.map((_, idx) => (
          <View key={`blank-${idx}`} style={styles.dayCell} />
        ))}

        {daysArray.map((day) => {
          const mStr = String(currentMonth + 1).padStart(2, '0');
          const dStr = String(day).padStart(2, '0');
          const dateStr = `${currentYear}-${mStr}-${dStr}`;

          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === today;
          const dayEvents = eventsByDate[dateStr] || [];

          return (
            <TouchableOpacity
              key={`day-${day}`}
              style={[
                styles.dayCell,
                isSelected && styles.dayCellSelected,
                isToday && !isSelected && styles.dayCellToday,
              ]}
              onPress={() => onSelectDate(dateStr)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayText,
                  isSelected && styles.dayTextSelected,
                  isToday && !isSelected && styles.dayTextToday,
                ]}
              >
                {day}
              </Text>

              {/* Event Dots */}
              <View style={styles.dotsRow}>
                {dayEvents.slice(0, 3).map((ev, evIdx) => (
                  <View
                    key={evIdx}
                    style={[
                      styles.dot,
                      { backgroundColor: ev.color || Colors.primary },
                      isSelected && { backgroundColor: '#FFF' },
                    ]}
                  />
                ))}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  monthTitleArea: {
    flex: 1,
  },
  monthTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  yearText: {
    color: Colors.textMuted,
    fontWeight: '400',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  todayBtnText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekdaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    paddingBottom: 6,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  weekendText: {
    color: Colors.warning,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%', // 7 colunas
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginVertical: 2,
    position: 'relative',
  },
  dayCellSelected: {
    backgroundColor: Colors.primary,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  dayText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  dayTextSelected: {
    color: '#FFF',
    fontWeight: '800',
  },
  dayTextToday: {
    color: Colors.primary,
    fontWeight: '700',
  },
  dotsRow: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 4,
    gap: 3,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
