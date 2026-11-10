import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import { Colors } from '../../constants/theme';
import { MonthSelector } from '../../components/MonthSelector';
import { SummaryCard } from '../../components/SummaryCard';
import { CategoryPieChart } from '../../components/CategoryPieChart';
import { WeeklyBarChart } from '../../components/WeeklyBarChart';
import { TransactionModal } from '../../components/TransactionModal';
import {
  getMonthlySummary,
  getExpensesByCategory,
  getWeeklyExpenses,
  getTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  getUpcomingMonthEvents,
  getGoalsWithProgress,
  toggleEventCompleted,
  incrementGoalProgress,
  getUserScore,
  Transaction,
  MonthlySummary,
  CategoryExpense,
  WeeklyExpense,
  EventItem,
  GoalWithProgress,
  UserScore,
} from '../../db/queries';
import { centsToBRL } from '../../utils/formatCurrency';
import { formatDateBR, getTodayDateString, getDayLabel } from '../../utils/dates';
import { playHaptic } from '../../utils/haptics';

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { selectedMonthKey, setSelectedMonthKey, categories, refreshKey, triggerRefresh } =
    useFinance();

  const today = getTodayDateString();

  const [summary, setSummary] = useState<MonthlySummary>({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
  });
  const [categoryExpenses, setCategoryExpenses] = useState<CategoryExpense[]>([]);
  const [weeklyExpenses, setWeeklyExpenses] = useState<WeeklyExpense[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [monthEvents, setMonthEvents] = useState<EventItem[]>([]);
  const [activeGoals, setActiveGoals] = useState<GoalWithProgress[]>([]);
  const [userScore, setUserScore] = useState<UserScore>({
    totalPoints: 100,
    level: 1,
    levelTitle: 'Aspirante',
    nextLevelPoints: 200,
    progressPercent: 50,
  });
  const [refreshing, setRefreshing] = useState(false);

  // Modal de Transação
  const [modalVisible, setModalVisible] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);

  const loadDashboardData = useCallback(async () => {
    const userId = user?.id || 1;
    try {
      const [sum, catExp, weekExp, recents, events, goals, scoreData] = await Promise.all([
        getMonthlySummary(userId, selectedMonthKey),
        getExpensesByCategory(userId, selectedMonthKey),
        getWeeklyExpenses(userId, selectedMonthKey),
        getTransactions(userId, { monthKey: selectedMonthKey, limit: 5 }),
        getUpcomingMonthEvents(userId, today, 3),
        getGoalsWithProgress(userId),
        getUserScore(userId),
      ]);

      setSummary(sum);
      setCategoryExpenses(catExp);
      setWeeklyExpenses(weekExp);
      setRecentTransactions(recents);
      setMonthEvents(events);
      setActiveGoals(goals);
      setUserScore(scoreData);
    } catch (e) {
      console.warn('Erro ao carregar dados do dashboard:', e);
    }
  }, [user, selectedMonthKey, today]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData, refreshKey]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleToggleEvent = async (ev: EventItem) => {
    const userId = user?.id || 1;
    const newStatus = !ev.is_completed;
    if (newStatus) {
      playHaptic.success();
    } else {
      playHaptic.selection();
    }
    setMonthEvents((prev) =>
      prev.map((e) => (e.id === ev.id ? { ...e, is_completed: newStatus } : e))
    );
    await toggleEventCompleted(userId, ev.id, newStatus);
  };

  const handleIncrementGoal = async (goal: GoalWithProgress, delta: number) => {
    const userId = user?.id || 1;
    const newVal = Math.max(0, goal.current_value + delta);
    if (newVal >= goal.target_value && goal.current_value < goal.target_value) {
      playHaptic.success();
    } else {
      playHaptic.light();
    }
    setActiveGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goal.id) return g;
        return {
          ...g,
          current_value: newVal,
          completed: newVal >= g.target_value,
        };
      })
    );
    await incrementGoalProgress(userId, goal, delta);
    loadDashboardData();
  };

  const handleOpenAdd = () => {
    playHaptic.medium();
    setTransactionToEdit(null);
    setModalVisible(true);
  };

  const handleOpenEdit = (t: Transaction) => {
    playHaptic.light();
    setTransactionToEdit(t);
    setModalVisible(true);
  };

  const handleSaveTransaction = async (data: {
    amount: number;
    type: 'receita' | 'despesa';
    categoryId: number | null;
    date: string;
    description: string;
  }) => {
    const userId = user?.id || 1;
    playHaptic.success();
    if (transactionToEdit) {
      await updateTransaction(
        userId,
        transactionToEdit.id,
        data.amount,
        data.type,
        data.categoryId,
        data.date,
        data.description
      );
    } else {
      await addTransaction(
        userId,
        data.amount,
        data.type,
        data.categoryId,
        data.date,
        data.description
      );
    }
    triggerRefresh();
  };

  const handleDeleteTransaction = async (id: number) => {
    const userId = user?.id || 1;
    playHaptic.warning();
    await deleteTransaction(userId, id);
    triggerRefresh();
  };

  const dayOfWeek = getDayLabel(today);
  const formattedToday = formatDateBR(today);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Top Life OS Greeting */}
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.greetingTitle}>Olá, {user?.name || 'Igor'} 👋</Text>
            <Text style={styles.greetingSubtitle}>Seu painel de controle pessoal</Text>
          </View>
          <View style={styles.headerPills}>
            <TouchableOpacity
              style={styles.pointsPill}
              onPress={() => router.push('/(app)/metas')}
              activeOpacity={0.8}
            >
              <Ionicons name="star" size={13} color={Colors.warning} style={{ marginRight: 4 }} />
              <Text style={styles.pointsPillText}>{userScore.totalPoints} pts</Text>
            </TouchableOpacity>

            <View style={styles.todayPill}>
              <Ionicons name="calendar-outline" size={13} color={Colors.primary} style={{ marginRight: 4 }} />
              <Text style={styles.todayPillText}>{dayOfWeek}, {formattedToday}</Text>
            </View>
          </View>
        </View>

        {/* ==================================================== */}
        {/* COMPROMISSOS DO MÊS                                  */}
        {/* ==================================================== */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="calendar" size={18} color={Colors.info} style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitle}>Compromissos do Mês</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(app)/calendario')}>
            <Text style={styles.seeAllText}>Ver agenda</Text>
          </TouchableOpacity>
        </View>

        {monthEvents.length > 0 ? (
          <View style={styles.eventsContainer}>
            {monthEvents.map((ev) => {
              const isCompleted = Boolean(ev.is_completed);
              const dateLabel = ev.date === today ? 'Hoje' : formatDateBR(ev.date, true);
              return (
                <View key={ev.id} style={[styles.eventItem, isCompleted && styles.eventItemCompleted]}>
                  <TouchableOpacity
                    style={styles.checkboxTouch}
                    onPress={() => handleToggleEvent(ev)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={isCompleted ? Colors.primary : Colors.textMuted}
                    />
                  </TouchableOpacity>

                  <View style={styles.eventInfo}>
                    <Text
                      style={[styles.eventTitle, isCompleted && styles.textCompleted]}
                      numberOfLines={1}
                    >
                      {ev.title}
                    </Text>
                    <Text style={styles.eventTime}>
                      {dateLabel} • {ev.time ? ev.time : 'Dia todo'}
                      {ev.category_name ? ` • ${ev.category_name}` : ''}
                    </Text>
                  </View>

                  <View style={[styles.eventDot, { backgroundColor: ev.color || Colors.info }]} />
                </View>
              );
            })}
          </View>
        ) : (
          <TouchableOpacity
            style={styles.emptyBanner}
            onPress={() => router.push('/(app)/calendario')}
            activeOpacity={0.8}
          >
            <View style={styles.emptyBannerLeft}>
              <Ionicons name="sunny-outline" size={24} color={Colors.warning} />
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.emptyBannerTitle}>Nenhum compromisso agendado para este mês</Text>
                <Text style={styles.emptyBannerSub}>Toque para agendar um evento ou rotina</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* ==================================================== */}
        {/* METAS ATIVAS (HABIT TRACKER RÁPIDO)                 */}
        {/* ==================================================== */}
        <View style={[styles.sectionHeader, { marginTop: 22 }]}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="trophy" size={18} color={Colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitle}>Metas & Hábitos</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(app)/metas')}>
            <Text style={styles.seeAllText}>Ver todas</Text>
          </TouchableOpacity>
        </View>

        {activeGoals.length > 0 ? (
          <View style={styles.goalsContainer}>
            {activeGoals.slice(0, 3).map((g) => {
              const percent = Math.min(
                100,
                Math.round((g.current_value / Math.max(1, g.target_value)) * 100)
              );
              const isCompleted = g.current_value >= g.target_value;

              return (
                <View key={g.id} style={[styles.goalRow, isCompleted && styles.goalRowCompleted]}>
                  <View style={[styles.goalIconWrap, { backgroundColor: `${g.color}25` }]}>
                    <Ionicons name={(g.icon || 'trophy-outline') as any} size={18} color={g.color} />
                  </View>

                  <View style={styles.goalInfo}>
                    <View style={styles.goalTitleRow}>
                      <Text style={styles.goalTitle} numberOfLines={1}>
                        {g.title}
                      </Text>
                      <Text style={[styles.goalCount, isCompleted && { color: Colors.primary }]}>
                        {g.current_value}/{g.target_value} {g.unit}
                      </Text>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.goalBarTrack}>
                      <View
                        style={[
                          styles.goalBarFill,
                          {
                            width: `${percent}%`,
                            backgroundColor: isCompleted ? Colors.primary : g.color,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Botão +1 Rápido */}
                  <TouchableOpacity
                    style={[styles.goalAddBtn, { backgroundColor: `${g.color}20` }]}
                    onPress={() => handleIncrementGoal(g, 1)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="add" size={16} color={g.color} />
                    <Text style={[styles.goalAddBtnText, { color: g.color }]}>+1</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ) : (
          <TouchableOpacity
            style={styles.emptyBanner}
            onPress={() => router.push('/(app)/metas')}
            activeOpacity={0.8}
          >
            <View style={styles.emptyBannerLeft}>
              <Ionicons name="flag-outline" size={24} color={Colors.primary} />
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.emptyBannerTitle}>Crie sua primeira meta de vida</Text>
                <Text style={styles.emptyBannerSub}>Ex: Treinar 5x na semana, beber água...</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* ==================================================== */}
        {/* FINANÇAS & GASTOS DO MÊS                             */}
        {/* ==================================================== */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="wallet" size={18} color={Colors.income} style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitle}>Finanças do Mês</Text>
          </View>
        </View>

        <MonthSelector
          currentMonthKey={selectedMonthKey}
          onChangeMonth={(m) => setSelectedMonthKey(m)}
        />

        {/* Cartão de Resumo Financeiro */}
        <SummaryCard
          balance={summary.balance}
          totalIncome={summary.totalIncome}
          totalExpense={summary.totalExpense}
        />

        {/* Ações Rápidas de Gestão */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleOpenAdd}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: Colors.primaryMuted }]}>
              <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.actionText}>Novo Gasto</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              playHaptic.light();
              router.push('/importar-extrato');
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: '#8A05BE22' }]}>
              <Ionicons name="cloud-upload-outline" size={20} color="#A855F7" />
            </View>
            <Text style={styles.actionText}>Importar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              playHaptic.light();
              router.push('/(app)/faturas');
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: Colors.warningBg }]}>
              <Ionicons name="receipt-outline" size={20} color={Colors.warning} />
            </View>
            <Text style={styles.actionText}>Faturas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              playHaptic.light();
              router.push('/(app)/investimentos');
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: `${Colors.cyan}20` }]}>
              <Ionicons name="trending-up-outline" size={20} color={Colors.cyan} />
            </View>
            <Text style={styles.actionText}>Investir</Text>
          </TouchableOpacity>
        </View>

        {/* Gráfico de Pizza por Categoria */}
        <CategoryPieChart data={categoryExpenses} totalExpense={summary.totalExpense} />

        {/* Gráfico de Barras por Semana */}
        <WeeklyBarChart data={weeklyExpenses} />

        {/* Últimas Transações */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Últimas Transações</Text>
            <TouchableOpacity onPress={() => router.push('/(app)/transacoes')}>
              <Text style={styles.seeAllText}>Ver todas</Text>
            </TouchableOpacity>
          </View>

          {recentTransactions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="receipt-outline" size={32} color={Colors.textMuted} />
              <Text style={styles.emptyCardText}>Nenhuma transação registrada neste mês.</Text>
              <TouchableOpacity style={styles.emptyAddButton} onPress={handleOpenAdd}>
                <Text style={styles.emptyAddText}>+ Adicionar primeiro gasto</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.transactionList}>
              {recentTransactions.map((t) => {
                const isIncome = t.type === 'receita';
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={styles.transactionItem}
                    onPress={() => handleOpenEdit(t)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.txIconWrap,
                        { backgroundColor: `${t.category_color || '#64748B'}25` },
                      ]}
                    >
                      <Ionicons
                        name={(t.category_icon as any) || 'pricetag-outline'}
                        size={18}
                        color={t.category_color || Colors.primary}
                      />
                    </View>

                    <View style={styles.txInfo}>
                      <Text style={styles.txDesc} numberOfLines={1}>
                        {t.description}
                      </Text>
                      <Text style={styles.txMeta}>
                        {t.category_name || 'Geral'} • {formatDateBR(t.date, true)}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.txAmount,
                        { color: isIncome ? Colors.income : Colors.expense },
                      ]}
                    >
                      {isIncome ? '+' : '-'}
                      {centsToBRL(t.amount)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Botão Flutuante de Adicionar Gasto */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleOpenAdd}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* Modal Adicionar / Editar */}
      <TransactionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveTransaction}
        onDelete={handleDeleteTransaction}
        transactionToEdit={transactionToEdit}
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 110,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerPills: {
    alignItems: 'flex-end',
    gap: 6,
  },
  pointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  pointsPillText: {
    color: Colors.warning,
    fontSize: 12,
    fontWeight: '800',
  },
  greetingTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  greetingSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  todayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  todayPillText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  seeAllText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  eventsContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  eventItemCompleted: {
    opacity: 0.6,
  },
  checkboxTouch: {
    marginRight: 10,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  eventTime: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  textCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  emptyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  emptyBannerTitle: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyBannerSub: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  goalsContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    gap: 12,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalRowCompleted: {
    opacity: 0.85,
  },
  goalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  goalInfo: {
    flex: 1,
    marginRight: 10,
  },
  goalTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  goalTitle: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  goalCount: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  goalBarTrack: {
    height: 6,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  goalBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  goalAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 2,
  },
  goalAddBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 14,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  actionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  recentSection: {
    marginTop: 20,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyCardText: {
    color: Colors.textMuted,
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyAddButton: {
    marginTop: 14,
    backgroundColor: Colors.primaryMuted,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  emptyAddText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  transactionList: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  txIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txInfo: {
    flex: 1,
    marginRight: 8,
  },
  txDesc: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  txMeta: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
});
