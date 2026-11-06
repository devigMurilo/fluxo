import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { centsToBRL } from '../utils/formatCurrency';

export const InvestmentSimulator: React.FC = () => {
  const [initialAmountStr, setInitialAmountStr] = useState<string>('1000');
  const [monthlyAmountStr, setMonthlyAmountStr] = useState<string>('500');
  const [annualRateStr, setAnnualRateStr] = useState<string>('11.25');
  const [monthsStr, setMonthsStr] = useState<string>('36'); // 3 anos

  const simulation = useMemo(() => {
    const P0 = Math.max(parseFloat(initialAmountStr) || 0, 0);
    const PMT = Math.max(parseFloat(monthlyAmountStr) || 0, 0);
    const annualRate = Math.max(parseFloat(annualRateStr) || 0, 0) / 100;
    const n = Math.max(parseInt(monthsStr, 10) || 1, 1);

    // Taxa mensal equivalente: (1 + r_a)^(1/12) - 1
    const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;

    let totalInvested = P0 + PMT * n;
    let futureValue = 0;

    if (monthlyRate > 0) {
      const compoundFactor = Math.pow(1 + monthlyRate, n);
      futureValue = P0 * compoundFactor + (PMT * (compoundFactor - 1)) / monthlyRate;
    } else {
      futureValue = totalInvested;
    }

    const totalInterest = Math.max(futureValue - totalInvested, 0);

    // Marcos de crescimento (25%, 50%, 75%, 100% do tempo)
    const points = [0.25, 0.5, 0.75, 1.0].map((fraction) => {
      const stepN = Math.max(Math.round(n * fraction), 1);
      const stepInvested = P0 + PMT * stepN;
      let stepFV = stepInvested;
      if (monthlyRate > 0) {
        const factor = Math.pow(1 + monthlyRate, stepN);
        stepFV = P0 * factor + (PMT * (factor - 1)) / monthlyRate;
      }
      return {
        stepLabel: `${stepN}m`,
        invested: Math.round(stepInvested * 100),
        total: Math.round(stepFV * 100),
      };
    });

    return {
      totalInvestedCents: Math.round(totalInvested * 100),
      totalInterestCents: Math.round(totalInterest * 100),
      futureValueCents: Math.round(futureValue * 100),
      points,
      months: n,
    };
  }, [initialAmountStr, monthlyAmountStr, annualRateStr, monthsStr]);

  const maxTotal = simulation.points[simulation.points.length - 1].total;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="calculator-outline" size={20} color={Colors.primary} />
        <Text style={styles.title}>Simulador de Juros Compostos</Text>
      </View>

      {/* Grid de Inputs */}
      <View style={styles.inputGrid}>
        <View style={styles.inputBox}>
          <Text style={styles.inputLabel}>Aporte Inicial (R$)</Text>
          <TextInput
            style={styles.textInput}
            keyboardType="numeric"
            value={initialAmountStr}
            onChangeText={setInitialAmountStr}
          />
        </View>

        <View style={styles.inputBox}>
          <Text style={styles.inputLabel}>Aporte Mensal (R$)</Text>
          <TextInput
            style={styles.textInput}
            keyboardType="numeric"
            value={monthlyAmountStr}
            onChangeText={setMonthlyAmountStr}
          />
        </View>

        <View style={styles.inputBox}>
          <Text style={styles.inputLabel}>Taxa Anual (%)</Text>
          <TextInput
            style={styles.textInput}
            keyboardType="numeric"
            value={annualRateStr}
            onChangeText={setAnnualRateStr}
          />
        </View>

        <View style={styles.inputBox}>
          <Text style={styles.inputLabel}>Prazo (Meses)</Text>
          <TextInput
            style={styles.textInput}
            keyboardType="numeric"
            value={monthsStr}
            onChangeText={setMonthsStr}
          />
        </View>
      </View>

      {/* Atalhos de prazo */}
      <View style={styles.quickPeriods}>
        {[12, 24, 36, 60, 120].map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.periodChip, monthsStr === String(m) && styles.periodChipActive]}
            onPress={() => setMonthsStr(String(m))}
          >
            <Text
              style={[
                styles.periodChipText,
                monthsStr === String(m) && styles.periodChipTextActive,
              ]}
            >
              {m < 12 ? `${m}m` : `${m / 12} ano${m > 12 ? 's' : ''}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Resultado Principal */}
      <View style={styles.resultBox}>
        <Text style={styles.resultLabel}>Valor Total Acumulado ({simulation.months} meses)</Text>
        <Text style={styles.resultValue}>{centsToBRL(simulation.futureValueCents)}</Text>

        <View style={styles.breakdownRow}>
          <View style={styles.breakdownCol}>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: Colors.info }]} />
              <Text style={styles.breakdownTitle}>Total Investido</Text>
            </View>
            <Text style={styles.breakdownAmt}>
              {centsToBRL(simulation.totalInvestedCents)}
            </Text>
          </View>

          <View style={styles.breakdownCol}>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: Colors.income }]} />
              <Text style={styles.breakdownTitle}>Total em Juros</Text>
            </View>
            <Text style={[styles.breakdownAmt, { color: Colors.income }]}>
              +{centsToBRL(simulation.totalInterestCents)}
            </Text>
          </View>
        </View>
      </View>

      {/* Gráfico de Evolução de Patrimônio */}
      <View style={styles.chartSection}>
        <Text style={styles.chartTitle}>Evolução no Tempo</Text>
        <View style={styles.barsContainer}>
          {simulation.points.map((pt, idx) => {
            const heightPercent = maxTotal > 0 ? (pt.total / maxTotal) * 100 : 10;
            const investedPercent = maxTotal > 0 ? (pt.invested / maxTotal) * 100 : 10;

            return (
              <View key={idx} style={styles.chartCol}>
                <View style={styles.track}>
                  {/* Total com juros */}
                  <View
                    style={[
                      styles.fillTotal,
                      { height: `${heightPercent}%`, backgroundColor: Colors.income },
                    ]}
                  />
                  {/* Parcela investida pelo usuário */}
                  <View
                    style={[
                      styles.fillInvested,
                      { height: `${investedPercent}%`, backgroundColor: Colors.info },
                    ]}
                  />
                </View>
                <Text style={styles.colLabel}>{pt.stepLabel}</Text>
              </View>
            );
          })}
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
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  inputGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  inputBox: {
    flex: 1,
    minWidth: '45%',
  },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickPeriods: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  periodChip: {
    flex: 1,
    paddingVertical: 6,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  periodChipActive: {
    backgroundColor: `${Colors.primary}20`,
    borderColor: Colors.primary,
  },
  periodChipText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  periodChipTextActive: {
    color: Colors.primary,
  },
  resultBox: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  resultLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  resultValue: {
    color: Colors.primary,
    fontSize: 26,
    fontWeight: '800',
    marginVertical: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  breakdownCol: {
    flex: 1,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownTitle: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  breakdownAmt: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  chartSection: {
    marginTop: 6,
  },
  chartTitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 100,
  },
  chartCol: {
    alignItems: 'center',
    flex: 1,
  },
  track: {
    width: 32,
    height: 75,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'flex-end',
  },
  fillTotal: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    borderRadius: 6,
  },
  fillInvested: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    borderRadius: 6,
  },
  colLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 6,
  },
});
