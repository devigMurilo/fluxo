import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import { Colors } from '../../constants/theme';
import { MonthSelector } from '../../components/MonthSelector';
import { TransactionModal } from '../../components/TransactionModal';
import {
  getTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  Transaction,
} from '../../db/queries';
import { centsToBRL } from '../../utils/formatCurrency';
import { formatDateBR } from '../../utils/dates';

export default function TransacoesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedMonthKey, setSelectedMonthKey, categories, refreshKey, triggerRefresh } =
    useFinance();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filterType, setFilterType] = useState<'todos' | 'despesa' | 'receita'>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);

  const loadTransactions = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const queryType = filterType === 'todos' ? undefined : filterType;
      const list = await getTransactions(user.id, {
        monthKey: selectedMonthKey,
        type: queryType,
        limit: 100,
      });
      setTransactions(list);
    } catch (e) {
      console.warn('Erro ao carregar transações:', e);
    } finally {
      setLoading(false);
    }
  }, [user, selectedMonthKey, filterType]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions, refreshKey]);

  const filteredTransactions = transactions.filter((t) =>
    t.description.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const totalFiltered = filteredTransactions.reduce((acc, curr) => {
    if (curr.type === 'receita') return acc + curr.amount;
    return acc - curr.amount;
  }, 0);

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
      <View style={styles.topBar}>
        <MonthSelector
          currentMonthKey={selectedMonthKey}
          onChangeMonth={(m) => setSelectedMonthKey(m)}
        />

        {/* Barra de Busca */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por descrição..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filtros: Todos / Despesas / Receitas */}
        <View style={styles.filterTabs}>
          {(['todos', 'despesa', 'receita'] as const).map((tab) => {
            const isSelected = filterType === tab;
            const label = tab === 'todos' ? 'Todos' : tab === 'despesa' ? 'Despesas' : 'Receitas';
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.filterTab, isSelected && styles.filterTabActive]}
                onPress={() => setFilterType(tab)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    isSelected && styles.filterTabTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Resumo do filtro e atalho para categorias */}
        <View style={styles.filterSummary}>
          <View>
            <Text style={styles.filterSummaryText}>
              {filteredTransactions.length} transaç{filteredTransactions.length === 1 ? 'ão' : 'ões'}
            </Text>
            <Text
              style={[
                styles.filterSummaryTotal,
                { color: totalFiltered >= 0 ? Colors.income : Colors.expense },
              ]}
            >
              {centsToBRL(totalFiltered)}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.manageCatBtn}
            onPress={() => router.push('/categorias')}
            activeOpacity={0.7}
          >
            <Ionicons name="pricetags-outline" size={15} color={Colors.primary} />
            <Text style={styles.manageCatBtnText}>Gerenciar Categorias</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lista */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={44} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Nenhuma transação encontrada</Text>
              <Text style={styles.emptySubtitle}>
                Toque no botão "+" para registrar sua primeira movimentação.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isIncome = item.type === 'receita';
            return (
              <TouchableOpacity
                style={styles.cardItem}
                onPress={() => handleOpenEdit(item)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: `${item.category_color || '#64748B'}25` },
                  ]}
                >
                  <Ionicons
                    name={(item.category_icon as any) || 'pricetag-outline'}
                    size={20}
                    color={item.category_color || Colors.primary}
                  />
                </View>

                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.description}
                  </Text>
                  <Text style={styles.itemSub}>
                    {item.category_name || 'Geral'} • {formatDateBR(item.date)}
                  </Text>
                </View>

                <View style={styles.itemAmountWrap}>
                  <Text
                    style={[
                      styles.itemAmount,
                      { color: isIncome ? Colors.income : Colors.expense },
                    ]}
                  >
                    {isIncome ? '+' : '-'}
                    {centsToBRL(item.amount)}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Botão Flutuante */}
      <TouchableOpacity style={styles.fab} onPress={handleOpenAdd} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* Modal */}
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
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    paddingVertical: 10,
    fontSize: 14,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: Colors.surfaceLight,
  },
  filterTabText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  filterSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  filterSummaryText: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  filterSummaryTotal: {
    fontSize: 14,
    fontWeight: '700',
  },
  manageCatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.primary}18`,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
  },
  manageCatBtnText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
    gap: 10,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  itemSub: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },
  itemAmountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtitle: {
    color: Colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 240,
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
