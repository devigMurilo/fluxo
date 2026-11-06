import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { centsToBRL } from '../utils/formatCurrency';

interface SummaryCardProps {
  balance: number;
  totalIncome: number;
  totalExpense: number;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  balance,
  totalIncome,
  totalExpense,
}) => {
  const isPositive = balance >= 0;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>Saldo do Mês</Text>
        <View
          style={[
            styles.badge,
            { backgroundColor: isPositive ? Colors.incomeBg : Colors.expenseBg },
          ]}
        >
          <Ionicons
            name={isPositive ? 'trending-up' : 'trending-down'}
            size={14}
            color={isPositive ? Colors.income : Colors.expense}
          />
          <Text
            style={[
              styles.badgeText,
              { color: isPositive ? Colors.income : Colors.expense },
            ]}
          >
            {isPositive ? 'Positivo' : 'Negativo'}
          </Text>
        </View>
      </View>

      <Text
        style={[
          styles.balanceValue,
          { color: isPositive ? Colors.income : Colors.expense },
        ]}
      >
        {centsToBRL(balance)}
      </Text>

      <View style={styles.divider} />

      <View style={styles.row}>
        {/* Receitas */}
        <View style={styles.column}>
          <View style={styles.subHeader}>
            <View style={[styles.iconCircle, { backgroundColor: Colors.incomeBg }]}>
              <Ionicons name="arrow-down-outline" size={14} color={Colors.income} />
            </View>
            <Text style={styles.subLabel}>Receitas</Text>
          </View>
          <Text style={styles.incomeValue}>+{centsToBRL(totalIncome)}</Text>
        </View>

        <View style={styles.verticalDivider} />

        {/* Despesas */}
        <View style={styles.column}>
          <View style={styles.subHeader}>
            <View style={[styles.iconCircle, { backgroundColor: Colors.expenseBg }]}>
              <Ionicons name="arrow-up-outline" size={14} color={Colors.expense} />
            </View>
            <Text style={styles.subLabel}>Despesas</Text>
          </View>
          <Text style={styles.expenseValue}>-{centsToBRL(totalExpense)}</Text>
        </View>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginVertical: 4,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  column: {
    flex: 1,
  },
  verticalDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border,
    marginHorizontal: 12,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  iconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  incomeValue: {
    color: Colors.income,
    fontSize: 16,
    fontWeight: '600',
  },
  expenseValue: {
    color: Colors.expense,
    fontSize: 16,
    fontWeight: '600',
  },
});
