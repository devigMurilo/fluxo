import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';
import { WeeklyExpense } from '../db/queries';
import { centsToBRL } from '../utils/formatCurrency';

interface WeeklyBarChartProps {
  data: WeeklyExpense[];
}

export const WeeklyBarChart: React.FC<WeeklyBarChartProps> = ({ data }) => {
  const maxAmount = Math.max(...data.map((d) => d.amount), 1);
  const totalAmount = data.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.cardTitle}>Gastos por Semana</Text>
        <Text style={styles.headerSubtitle}>Total: {centsToBRL(totalAmount)}</Text>
      </View>

      <View style={styles.barsContainer}>
        {data.map((item, index) => {
          const heightPercent = totalAmount > 0 ? Math.max((item.amount / maxAmount) * 100, 4) : 4;

          return (
            <View key={index} style={styles.barColumn}>
              <Text style={styles.barAmountText} numberOfLines={1}>
                {item.amount > 0 ? (item.amount / 100).toFixed(0) : ''}
              </Text>

              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${heightPercent}%`,
                      backgroundColor: item.amount > 0 ? Colors.primary : Colors.surfaceLight,
                    },
                  ]}
                />
              </View>

              <Text style={styles.barLabel}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 140,
    paddingTop: 16,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barAmountText: {
    color: Colors.textMuted,
    fontSize: 10,
    marginBottom: 6,
    fontWeight: '600',
  },
  barTrack: {
    width: 24,
    height: 90,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 8,
  },
  barLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },
});
