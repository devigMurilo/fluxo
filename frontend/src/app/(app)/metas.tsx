import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
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
  GoalWithProgress,
  getGoalsWithProgress,
  createGoal,
  updateGoal,
  deleteGoal,
  incrementGoalProgress,
} from '../../db/queries';
import { GoalCard } from '../../components/GoalCard';
import { GoalModal } from '../../components/GoalModal';

type PeriodFilter = 'all' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export default function MetasScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { categories } = useFinance();

  const [filter, setFilter] = useState<PeriodFilter>('all');
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalWithProgress | null>(null);

  const loadGoals = useCallback(async () => {
    const userId = user?.id || 1;
    try {
      const periodParam = filter === 'all' ? undefined : filter;
      const data = await getGoalsWithProgress(userId, periodParam);
      setGoals(data);
    } catch (e) {
      console.warn('Erro ao carregar metas:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, filter]);

  useEffect(() => {
    setLoading(true);
    loadGoals();
  }, [loadGoals]);

  const onRefresh = () => {
    setRefreshing(true);
    loadGoals();
  };

  const handleIncrement = async (goal: GoalWithProgress, delta: number) => {
    try {
      // Atualização otimista na UI
      setGoals((prev) =>
        prev.map((g) => {
          if (g.id !== goal.id) return g;
          const newVal = Math.max(0, g.current_value + delta);
          return {
            ...g,
            current_value: newVal,
            completed: newVal >= g.target_value,
          };
        })
      );

      await incrementGoalProgress(goal.id, goal.period_key, delta, goal.target_value);
    } catch (e) {
      console.warn('Erro ao atualizar progresso:', e);
      loadGoals();
    }
  };

  const handleSaveGoal = async (data: any) => {
    const userId = user?.id || 1;
    if (data.id) {
      await updateGoal(userId, data.id, data);
    } else {
      await createGoal(userId, data);
    }
    loadGoals();
  };

  const handleDeleteGoal = async (id: number) => {
    const userId = user?.id || 1;
    await deleteGoal(userId, id);
    loadGoals();
  };

  // Estatísticas
  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => g.completed).length;
  const progressPercent = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Metas & Hábitos</Text>
          <Text style={styles.subtitle}>Construa consistência e organize sua rotina</Text>
        </View>

        <TouchableOpacity
          style={styles.addButtonHeader}
          onPress={() => {
            setEditingGoal(null);
            setModalVisible(true);
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Stats Card */}
      {totalGoals > 0 && (
        <View style={styles.statsCard}>
          <View style={styles.statsLeft}>
            <Text style={styles.statsLabel}>Progresso Geral do Ciclo</Text>
            <Text style={styles.statsValue}>
              {completedGoals} de {totalGoals} concluídas
            </Text>
          </View>

          <View style={styles.statsRingContainer}>
            <View style={styles.statsRing}>
              <Text style={styles.statsRingText}>{progressPercent}%</Text>
            </View>
          </View>
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.filterTabsContainer}>
        {[
          { id: 'all', label: 'Todas' },
          { id: 'daily', label: 'Diárias' },
          { id: 'weekly', label: 'Semanais' },
          { id: 'monthly', label: 'Mensais' },
          { id: 'yearly', label: 'Anuais' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.filterTab, filter === tab.id && styles.filterTabActive]}
            onPress={() => setFilter(tab.id as PeriodFilter)}
          >
            <Text style={[styles.filterTabText, filter === tab.id && styles.filterTabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List of Goals */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={goals}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          renderItem={({ item }) => (
            <GoalCard
              goal={item}
              onIncrement={handleIncrement}
              onEdit={(g) => {
                setEditingGoal(g);
                setModalVisible(true);
              }}
              onDelete={(g) => handleDeleteGoal(g.id)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="trophy-outline" size={40} color={Colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Nenhuma meta cadastrada</Text>
              <Text style={styles.emptyText}>
                {filter === 'all'
                  ? 'Defina objetivos para o seu dia, semana ou ano. Comece com hábitos simples como treinar ou ler!'
                  : `Você não tem metas com frequência ${filter} no momento.`}
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => {
                  setEditingGoal(null);
                  setModalVisible(true);
                }}
              >
                <Ionicons name="add-circle-outline" size={20} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.emptyButtonText}>Criar Nova Meta</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Modal */}
      <GoalModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveGoal}
        onDelete={handleDeleteGoal}
        initialGoal={editingGoal}
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
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statsLeft: {
    flex: 1,
  },
  statsLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsValue: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  statsRingContainer: {
    marginLeft: 14,
  },
  statsRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primaryMuted,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRingText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  filterTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 14,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterTabText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
