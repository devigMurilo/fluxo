import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { GoalWithProgress } from '../db/queries';
import { formatPeriodLabel } from '../utils/dates';

interface GoalCardProps {
  goal: GoalWithProgress;
  onIncrement: (goal: GoalWithProgress, delta: number) => void;
  onEdit: (goal: GoalWithProgress) => void;
  onDelete: (goal: GoalWithProgress) => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  onIncrement,
  onEdit,
  onDelete,
}) => {
  const percent = Math.min(
    100,
    Math.round((goal.current_value / Math.max(1, goal.target_value)) * 100)
  );
  const isCompleted = goal.current_value >= goal.target_value;

  return (
    <View style={[styles.card, isCompleted && styles.cardCompleted]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, { backgroundColor: `${goal.color}25` }]}>
            <Ionicons name={(goal.icon || 'trophy-outline') as any} size={22} color={goal.color} />
          </View>
          <View style={styles.titleArea}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={1}>
                {goal.title}
              </Text>
              {isCompleted && (
                <View style={styles.completedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
                  <Text style={styles.completedBadgeText}>Meta batida!</Text>
                </View>
              )}
            </View>
            <View style={styles.tagsRow}>
              <View style={styles.periodTag}>
                <Text style={styles.periodTagText}>{formatPeriodLabel(goal.period)}</Text>
              </View>
              {goal.category_name && (
                <View style={styles.categoryTag}>
                  <Text style={styles.categoryTagText}>{goal.category_name}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => onEdit(goal)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="ellipsis-vertical" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Progress & Values */}
      <View style={styles.progressSection}>
        <View style={styles.progressInfoRow}>
          <Text style={styles.progressValue}>
            <Text style={[styles.progressCurrent, { color: goal.color }]}>
              {goal.current_value}
            </Text>
            <Text style={styles.progressTarget}> / {goal.target_value} {goal.unit}</Text>
          </Text>
          <Text style={[styles.percentText, isCompleted && { color: Colors.primary, fontWeight: '700' }]}>
            {percent}%
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${percent}%`,
                backgroundColor: isCompleted ? Colors.primary : goal.color,
              },
            ]}
          />
        </View>
      </View>

      {/* Quick Action Footer */}
      <View style={styles.footer}>
        <Text style={styles.hintText}>
          {isCompleted
            ? '🎉 Parabéns! Meta concluída neste período.'
            : `Faltam ${Math.max(0, goal.target_value - goal.current_value)} ${goal.unit} para completar.`}
        </Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, goal.current_value <= 0 && styles.actionBtnDisabled]}
            disabled={goal.current_value <= 0}
            onPress={() => onIncrement(goal, -1)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="remove" size={16} color={goal.current_value <= 0 ? Colors.textMuted : Colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtnAdd, { backgroundColor: isCompleted ? Colors.primaryMuted : `${goal.color}20` }]}
            onPress={() => onIncrement(goal, 1)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="add" size={18} color={isCompleted ? Colors.primary : goal.color} />
            <Text style={[styles.actionBtnAddText, { color: isCompleted ? Colors.primary : goal.color }]}>
              +1
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardCompleted: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleArea: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  title: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  completedBadgeText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  periodTag: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  periodTagText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  categoryTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryTagText: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  menuButton: {
    padding: 4,
  },
  progressSection: {
    marginTop: 14,
  },
  progressInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  progressValue: {
    fontSize: 14,
  },
  progressCurrent: {
    fontSize: 18,
    fontWeight: '800',
  },
  progressTarget: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  percentText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  hintText: {
    color: Colors.textMuted,
    fontSize: 11,
    flex: 1,
    marginRight: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnDisabled: {
    opacity: 0.3,
  },
  actionBtnAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 8,
    gap: 2,
  },
  actionBtnAddText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
