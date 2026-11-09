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
  Transaction,
  MonthlySummary,
  CategoryExpense,
  WeeklyExpense,
} from '../../db/queries';
import { centsToBRL } from '../../utils/formatCurrency';
import { formatDateBR } from '../../utils/dates';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedMonthKey, setSelectedMonthKey, categories, refreshKey, triggerRefresh } =
    useFinance();

  const [summary, setSummary] = useState<MonthlySummary>({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
  });
  const [categoryExpenses, setCategoryExpenses] = useState<CategoryExpense[]>([]);
  const [weeklyExpenses, setWeeklyExpenses] = useState<WeeklyExpense[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Modal de Transação
  const [modalVisible, setModalVisible] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);

  const loadDashboardData = useCallback(async () => {
    if (!user) return;
    try {
      const [sum, catExp, weekExp, recents] = await Promise.all([
        getMonthlySummary(user.id, selectedMonthKey),
        getExpensesByCategory(user.id, selectedMonthKey),
        getWeeklyExpenses(user.id, selectedMonthKey),
        getTransactions(user.id, { monthKey: selectedMonthKey, limit: 5 }),
      ]);

      setSummary(sum);
      setCategoryExpenses(catExp);
      setWeeklyExpenses(weekExp);
      setRecentTransactions(recents);
    } catch (e) {
      console.warn('Erro ao carregar dados do dashboard:', e);
    }
  }, [user, selectedMonthKey]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData, refreshKey]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleOpenAdd = () => {
    setTransactionToEdit(null);
    setModalVisible(true);
  };

  const handleOpenEdit = (t: Transaction) => {
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
    if (!user) return;
    if (transactionToEdit) {
      await updateTransaction(
        user.id,
        transactionToEdit.id,
        data.amount,
        data.type,
        data.categoryId,
        data.date,
        data.description
      );
    } else {
      await addTransaction(
        user.id,
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
    if (!user) return;
    await deleteTransaction(user.id, id);
    triggerRefresh();
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Boas-vindas e Seletor de Mês */}
        <View style={styles.userGreeting}>
          <Text style={styles.greetingTitle}>Olá, {user?.name || 'Usuário'} 👋</Text>
          <Text style={styles.greetingSubtitle}>Acompanhe suas finanças deste mês</Text>
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

        {/* Ações Rápidas */}
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
            onPress={() => router.push('/(app)/transacoes')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: Colors.infoBg }]}>
              <Ionicons name="list-outline" size={20} color={Colors.info} />
            </View>
            <Text style={styles.actionText}>Ver Extrato</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/categorias')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: `${Colors.purple}20` }]}>
              <Ionicons name="pricetag-outline" size={20} color={Colors.purple} />
            </View>
            <Text style={styles.actionText}>Categorias</Text>
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

      {/* Botão Flutuante de Adicionar */}
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
    paddingTop: 16,
    paddingBottom: 100,
  },
  userGreeting: {
    marginBottom: 6,
  },
  greetingTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  greetingSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  recentSection: {
    marginTop: 6,
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
  seeAllText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
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
