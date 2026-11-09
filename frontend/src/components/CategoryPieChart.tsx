import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { G, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { CategoryExpense } from '../db/queries';
import { centsToBRL } from '../utils/formatCurrency';

interface CategoryPieChartProps {
  data: CategoryExpense[];
  totalExpense: number;
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({
  data,
  totalExpense,
}) => {
  const router = useRouter();

  if (data.length === 0 || totalExpense === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="pie-chart-outline" size={36} color={Colors.textMuted} />
        <Text style={styles.emptyText}>Nenhuma despesa registrada neste mês</Text>
        <TouchableOpacity
          onPress={() => router.push('/categorias')}
          style={styles.emptyManageBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="pricetags-outline" size={14} color={Colors.primary} />
          <Text style={styles.emptyManageText}>Personalizar Categorias</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Configuração para desenho de Rosca SVG
  const size = 160;
  const strokeWidth = 22;
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitle}>Despesas por Categoria</Text>
        <TouchableOpacity
          onPress={() => router.push('/categorias')}
          style={styles.manageLink}
          activeOpacity={0.7}
        >
          <Text style={styles.manageLinkText}>Gerenciar</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.chartWrapper}>
        <View style={styles.svgContainer}>
          <Svg width={size} height={size}>
            <G rotation="-90" origin={`${center}, ${center}`}>
              {/* Background ring */}
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke={Colors.surfaceLight}
                strokeWidth={strokeWidth}
                fill="none"
              />

              {/* Segments */}
              {data.map((item, idx) => {
                const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
                const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
                accumulatedPercent += item.percentage;

                return (
                  <Circle
                    key={idx}
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke={item.color || Colors.primary}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    fill="none"
                    strokeLinecap="round"
                  />
                );
              })}
            </G>
          </Svg>

          {/* Centro da Rosca */}
          <View style={styles.centerLabel}>
            <Text style={styles.centerTitle}>Total</Text>
            <Text style={styles.centerAmount} numberOfLines={1}>
              {centsToBRL(totalExpense)}
            </Text>
          </View>
        </View>
      </View>

      {/* Lista de Categorias com porcentagem e valor */}
      <View style={styles.list}>
        {data.map((item, index) => (
          <View key={index} style={styles.listItem}>
            <View style={styles.leftCol}>
              <View style={[styles.colorDot, { backgroundColor: item.color }]} />
              <Text style={styles.categoryName} numberOfLines={1}>
                {item.name}
              </Text>
            </View>

            <View style={styles.rightCol}>
              <Text style={styles.amountText}>{centsToBRL(item.amount)}</Text>
              <View style={styles.percentBadge}>
                <Text style={styles.percentText}>{item.percentage}%</Text>
              </View>
            </View>
          </View>
        ))}
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
  cardTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  manageLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  manageLinkText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyManageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.primary}18`,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
  },
  emptyManageText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  svgContainer: {
    position: 'relative',
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
  },
  centerTitle: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  centerAmount: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  list: {
    marginTop: 16,
    gap: 12,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryName: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  rightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  percentBadge: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    minWidth: 36,
    alignItems: 'center',
  },
  percentText: {
    color: Colors.text,
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
});
