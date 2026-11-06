import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { formatMonthHeader, offsetMonthKey } from '../utils/dates';

interface MonthSelectorProps {
  currentMonthKey: string;
  onChangeMonth: (newMonthKey: string) => void;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({
  currentMonthKey,
  onChangeMonth,
}) => {
  const handlePrev = () => {
    onChangeMonth(offsetMonthKey(currentMonthKey, -1));
  };

  const handleNext = () => {
    onChangeMonth(offsetMonthKey(currentMonthKey, 1));
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handlePrev} style={styles.arrowButton} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={20} color={Colors.text} />
      </TouchableOpacity>

      <View style={styles.titleContainer}>
        <Ionicons name="calendar-outline" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
        <Text style={styles.titleText}>{formatMonthHeader(currentMonthKey)}</Text>
      </View>

      <TouchableOpacity onPress={handleNext} style={styles.arrowButton} activeOpacity={0.7}>
        <Ionicons name="chevron-forward" size={20} color={Colors.text} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginVertical: 10,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
