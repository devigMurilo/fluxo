import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
  ScrollView,
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
  getUserScore,
  getScoreLogs,
  UserScore,
  ScoreLog,
} from '../../db/queries';
import { formatDateBR } from '../../utils/dates';
import { GoalCard } from '../../components/GoalCard';
import { GoalModal } from '../../components/GoalModal';
import { playHaptic } from '../../utils/haptics';

type PeriodFilter = 'all' | 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export default function MetasScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { categories } = useFinance();

  const [filter, setFilter] = useState<PeriodFilter>('all');
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [score, setScore] = useState<UserScore>({
    totalPoints: 100,
    level: 1,
    levelTitle: 'Aspirante',
    nextLevelPoints: 200,
    progressPercent: 50,
  });
  const [scoreLogs, setScoreLogs] = useState<ScoreLog[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalWithProgress | null>(null);

  const loadData = useCallback(async () => {
    const userId = user?.id || 1;
    try {
      const periodParam = filter === 'all' ? undefined : filter;
      const [goalsData, scoreData, logsData] = await Promise.all([
        getGoalsWithProgress(userId, periodParam),
        getUserScore(userId),
        getScoreLogs(userId, 15),
      ]);
      setGoals(goalsData);
      setScore(scoreData);
      setScoreLogs(logsData);
    } catch (e) {
      console.warn('Erro ao carregar metas e pontuação:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, filter]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleIncrement = async (goal: GoalWithProgress, delta: number) => {
    const userId = user?.id || 1;
    try {
      const newVal = Math.max(0, goal.current_value + delta);
      if (newVal >= goal.target_value && goal.current_value < goal.target_value) {
        playHaptic.success();
      } else {
        playHaptic.light();
      }

      // Atualização otimista na UI
      setGoals((prev) =>
        prev.map((g) => {
          if (g.id !== goal.id) return g;
          return {
            ...g,
            current_value: newVal,
            completed: newVal >= g.target_value,
          };
        })
      );

      const res = await incrementGoalProgress(userId, goal, delta);

      if (res.pointsAwarded && res.pointsAwarded > 0) {
        playHaptic.success();
        Alert.alert(
          'Meta Conquistada! 🏆',
          `Parabéns! Você bateu a meta "${goal.title}" e ganhou +${res.pointsAwarded} pontos!`
        );
      }

      // Recarrega pontuação e metas
      loadData();
    } catch (e) {
      console.warn('Erro ao atualizar progresso:', e);
      loadData();
    }
  };

  const handleSaveGoal = async (data: any) => {
    const userId = user?.id || 1;
    playHaptic.success();
    if (data.id) {
      await updateGoal(userId, data.id, data);
    } else {
      await createGoal(userId, data);
    }
    loadData();
  };

  const handleDeleteGoal = async (id: number) => {
    const userId = user?.id || 1;
    playHaptic.warning();
    await deleteGoal(userId, id);
    loadData();
  };

  // Estatísticas
  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => g.completed).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Metas & Desafios</Text>
          <Text style={styles.subtitle}>Conquiste seus objetivos e acumule pontos</Text>
        </View>

        <TouchableOpacity
          style={styles.addButtonHeader}
          onPress={() => {
            playHaptic.medium();
            setEditingGoal(null);
            setModalVisible(true);
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Card de Gamificação & Nível de Pontos */}
      <TouchableOpacity
        style={styles.gamificationCard}
        onPress={() => {
          playHaptic.light();
          setShowHistoryModal(true);
        }}
        activeOpacity={0.88}
      >
        <View style={styles.gamificationTop}>
          <View style={styles.badgeWrap}>
            <View style={styles.starCircle}>
              <Ionicons name="trophy" size={20} color={Colors.warning} />
            </View>
            <View>
              <View style={styles.levelRow}>
                <Text style={styles.levelTag}>Nível {score.level}</Text>
                <Text style={styles.levelTitle}>{score.levelTitle}</Text>
              </View>
              <Text style={styles.scoreSub}>Toque para ver histórico de pontos</Text>
            </View>
          </View>

          <View style={styles.pointsWrap}>
            <Text style={styles.pointsNumber}>{score.totalPoints}</Text>
            <Text style={styles.pointsLabel}>PONTOS</Text>
          </View>
        </View>

        {/* Barra de Progresso até o Próximo Nível */}
        <View style={styles.levelBarSection}>
          <View style={styles.levelBarTrack}>
            <View style={[styles.levelBarFill, { width: `${score.progressPercent}%` }]} />
          </View>
          <View style={styles.levelInfoRow}>
            <Text style={styles.levelCurrentText}>{score.totalPoints} pts</Text>
            <Text style={styles.levelNextText}>
              Próximo nível em {score.nextLevelPoints} pts ({score.progressPercent}%)
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Filter Tabs */}
      <View style={styles.filterTabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {[
            { id: 'all', label: 'Todas' },
            { id: 'once', label: '🎯 Desafios (Únicas)' },
            { id: 'daily', label: 'Diárias' },
            { id: 'weekly', label: 'Semanais' },
            { id: 'monthly', label: 'Mensais' },
            { id: 'yearly', label: 'Anuais' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.filterTab, filter === tab.id && styles.filterTabActive]}
              onPress={() => {
                playHaptic.selection();
                setFilter(tab.id as PeriodFilter);
              }}
            >
              <Text style={[styles.filterTabText, filter === tab.id && styles.filterTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 120 }]}
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
              <Text style={styles.emptyTitle}>Nenhuma meta encontrada</Text>
              <Text style={styles.emptyText}>
                {filter === 'once'
                  ? 'Você ainda não tem Desafios com prazo. Defina uma meta única como "Emagrecer 8kg" e ganhe pontos!'
                  : filter === 'all'
                  ? 'Crie hábitos recorrentes ou desafios com prazo para ganhar pontos e evoluir seu nível.'
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

      {/* Modal Criar / Editar Meta */}
      <GoalModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveGoal}
        onDelete={handleDeleteGoal}
        initialGoal={editingGoal}
        categories={categories}
      />

      {/* Modal Extrato de Pontos & Gamificação */}
      <Modal visible={showHistoryModal} animationType="slide" transparent onRequestClose={() => setShowHistoryModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Extrato de Pontos</Text>
                <Text style={styles.modalSub}>Seu saldo: {score.totalPoints} pontos</Text>
              </View>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.logsScroll} showsVerticalScrollIndicator={false}>
              {scoreLogs.length === 0 ? (
                <Text style={styles.emptyLogsText}>Nenhum histórico registrado ainda.</Text>
              ) : (
                scoreLogs.map((log) => {
                  const isPositive = log.points > 0;
                  return (
                    <View key={log.id} style={styles.logItem}>
                      <View
                        style={[
                          styles.logIconCircle,
                          { backgroundColor: isPositive ? Colors.primaryMuted : Colors.expenseBg },
                        ]}
                      >
                        <Ionicons
                          name={isPositive ? 'star' : 'alert-circle'}
                          size={16}
                          color={isPositive ? Colors.primary : Colors.expense}
                        />
                      </View>
                      <View style={styles.logInfo}>
                        <Text style={styles.logReason}>{log.reason}</Text>
                        <Text style={styles.logDate}>{formatDateBR(log.created_at.slice(0, 10))}</Text>
                      </View>
                      <Text
                        style={[
                          styles.logPoints,
                          { color: isPositive ? Colors.primary : Colors.expense },
                        ]}
                      >
                        {isPositive ? `+${log.points}` : log.points} pts
                      </Text>
                    </View>
                  );
                })
              )}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  gamificationCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    marginTop: 6,
    marginBottom: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    shadowColor: Colors.warning,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  gamificationTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  starCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.warning,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  levelTag: {
    backgroundColor: Colors.warning,
    color: '#000',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  levelTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  scoreSub: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  pointsWrap: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  pointsNumber: {
    color: Colors.warning,
    fontSize: 22,
    fontWeight: '900',
  },
  pointsLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  levelBarSection: {
    marginTop: 12,
  },
  levelBarTrack: {
    height: 6,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  levelBarFill: {
    height: '100%',
    backgroundColor: Colors.warning,
    borderRadius: 3,
  },
  levelInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  levelCurrentText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  levelNextText: {
    color: Colors.textMuted,
    fontSize: 10,
  },
  filterTabsContainer: {
    marginBottom: 12,
  },
  filterScroll: {
    paddingHorizontal: 20,
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
    paddingVertical: 50,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 12,
  },
  modalTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  modalSub: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  logsScroll: {
    maxHeight: 400,
  },
  emptyLogsText: {
    color: Colors.textMuted,
    textAlign: 'center',
    marginVertical: 30,
    fontSize: 14,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  logIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logInfo: {
    flex: 1,
    marginRight: 10,
  },
  logReason: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  logDate: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  logPoints: {
    fontSize: 14,
    fontWeight: '800',
  },
});
