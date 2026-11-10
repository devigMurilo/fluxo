import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import { Colors } from '../../constants/theme';
import { MonthSelector } from '../../components/MonthSelector';
import { TransactionModal } from '../../components/TransactionModal';
import { BillModal } from '../../components/BillModal';
import {
  getTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  getBills,
  addBill,
  updateBill,
  deleteBill,
  toggleBillPaid,
  Transaction,
  Bill,
} from '../../db/queries';
import { scheduleBillNotification, cancelNotification } from '../../services/notifications';
import { centsToBRL } from '../../utils/formatCurrency';
import { formatDateBR } from '../../utils/dates';
import { playHaptic } from '../../utils/haptics';

export default function TransacoesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { selectedMonthKey, setSelectedMonthKey, categories, refreshKey, triggerRefresh } =
    useFinance();

  const [activeSection, setActiveSection] = useState<'transacoes' | 'faturas'>('transacoes');

  useEffect(() => {
    if (params.tab === 'faturas') {
      setActiveSection('faturas');
    }
  }, [params.tab]);

  // Transações
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filterType, setFilterType] = useState<'todos' | 'despesa' | 'receita'>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Modal de Transação
  const [modalVisible, setModalVisible] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);

  // Faturas & Contas Fixas
  const [bills, setBills] = useState<Bill[]>([]);
  const [billFilter, setBillFilter] = useState<'todas' | 'pendentes' | 'pagas'>('todas');
  const [billModalVisible, setBillModalVisible] = useState(false);
  const [billToEdit, setBillToEdit] = useState<Bill | null>(null);

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

  const loadBills = useCallback(async () => {
    if (!user) return;
    try {
      const list = await getBills(user.id);
      setBills(list);
    } catch (e) {
      console.warn('Erro ao carregar faturas:', e);
    }
  }, [user]);

  useEffect(() => {
    loadTransactions();
    loadBills();
  }, [loadTransactions, loadBills, refreshKey]);

  // Cálculos de Transações
  const filteredTransactions = transactions.filter((t) =>
    t.description.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const totalFiltered = filteredTransactions.reduce((acc, curr) => {
    if (curr.type === 'receita') return acc + curr.amount;
    return acc - curr.amount;
  }, 0);

  // Cálculos de Faturas
  const isBillPaid = (bill: Bill) => {
    if (!bill.paid_month) return false;
    return bill.paid_month.split(',').includes(selectedMonthKey);
  };

  const totalDueCents = bills.reduce((acc, b) => acc + b.amount, 0);
  const totalPaidCents = bills
    .filter((b) => isBillPaid(b))
    .reduce((acc, b) => acc + b.amount, 0);
  const totalPendingCents = totalDueCents - totalPaidCents;
  const pendingBillsCount = bills.filter((b) => !isBillPaid(b)).length;

  const filteredBills = bills.filter((b) => {
    const paid = isBillPaid(b);
    if (billFilter === 'pendentes') return !paid;
    if (billFilter === 'pagas') return paid;
    return true;
  });

  const handleToggleBillPaid = async (bill: Bill) => {
    if (!user) return;
    const currentPaid = isBillPaid(bill);
    if (!currentPaid) {
      playHaptic.success();
    } else {
      playHaptic.light();
    }
    await toggleBillPaid(user.id, bill.id, selectedMonthKey, !currentPaid);
    await loadBills();
    triggerRefresh();
  };

  const handleOpenAddBill = () => {
    playHaptic.medium();
    setBillToEdit(null);
    setBillModalVisible(true);
  };

  const handleOpenEditBill = (bill: Bill) => {
    playHaptic.light();
    setBillToEdit(bill);
    setBillModalVisible(true);
  };

  const handleSaveBill = async (data: {
    name: string;
    amount: number;
    dueDay: number;
    enableNotification: boolean;
  }) => {
    if (!user) return;
    playHaptic.success();

    let notificationId: string | null = null;
    if (data.enableNotification) {
      notificationId = await scheduleBillNotification(data.name, data.amount, data.dueDay, 2);
    }

    if (billToEdit) {
      if (billToEdit.notification_id && !data.enableNotification) {
        await cancelNotification(billToEdit.notification_id);
      }
      await updateBill(
        user.id,
        billToEdit.id,
        data.name,
        data.amount,
        data.dueDay,
        notificationId || (data.enableNotification ? billToEdit.notification_id : null)
      );
    } else {
      await addBill(user.id, data.name, data.amount, data.dueDay, notificationId);
    }

    await loadBills();
    triggerRefresh();
  };

  const handleDeleteBill = async (id: number) => {
    if (!user) return;
    playHaptic.warning();
    const bill = bills.find((b) => b.id === id);
    if (bill?.notification_id) {
      await cancelNotification(bill.notification_id);
    }
    await deleteBill(user.id, id);
    await loadBills();
    triggerRefresh();
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
    if (!user) return;
    playHaptic.success();
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
    playHaptic.warning();
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

        {/* Seletor Principal: Transações vs Faturas */}
        <View style={styles.mainSegmentContainer}>
          <TouchableOpacity
            style={[
              styles.mainSegmentTab,
              activeSection === 'transacoes' && styles.mainSegmentTabActive,
            ]}
            onPress={() => {
              playHaptic.selection();
              setActiveSection('transacoes');
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="swap-horizontal-outline"
              size={15}
              color={activeSection === 'transacoes' ? '#FFF' : Colors.textMuted}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.mainSegmentText,
                activeSection === 'transacoes' && styles.mainSegmentTextActive,
              ]}
            >
              Extrato & Gastos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.mainSegmentTab,
              activeSection === 'faturas' && styles.mainSegmentTabActive,
            ]}
            onPress={() => {
              playHaptic.selection();
              setActiveSection('faturas');
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="receipt-outline"
              size={15}
              color={activeSection === 'faturas' ? '#FFF' : Colors.textMuted}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.mainSegmentText,
                activeSection === 'faturas' && styles.mainSegmentTextActive,
              ]}
            >
              Faturas & Contas
            </Text>
            {pendingBillsCount > 0 && (
              <View style={styles.segmentBadge}>
                <Text style={styles.segmentBadgeText}>{pendingBillsCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {activeSection === 'transacoes' ? (
          <>
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
                    onPress={() => {
                      playHaptic.selection();
                      setFilterType(tab);
                    }}
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

            {/* Resumo do filtro e atalhos */}
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

              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  style={styles.importBtn}
                  onPress={() => {
                    playHaptic.light();
                    router.push('/importar-extrato');
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="cloud-upload-outline" size={14} color="#FFFFFF" />
                  <Text style={styles.importBtnText}>Importar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.manageCatBtn}
                  onPress={() => {
                    playHaptic.light();
                    router.push('/categorias');
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="pricetags-outline" size={14} color={Colors.primary} />
                  <Text style={styles.manageCatBtnText}>Categorias</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.billsTopArea}>
            {/* Card de Resumo das Faturas */}
            <View style={styles.billsSummaryCard}>
              <View style={styles.billsSummaryItem}>
                <Text style={styles.billsSummaryLabel}>A Pagar</Text>
                <Text style={styles.billsSummaryValue}>{centsToBRL(totalDueCents)}</Text>
              </View>
              <View style={styles.billsDivider} />
              <View style={styles.billsSummaryItem}>
                <Text style={styles.billsSummaryLabel}>Pago</Text>
                <Text style={[styles.billsSummaryValue, { color: Colors.income }]}>
                  {centsToBRL(totalPaidCents)}
                </Text>
              </View>
              <View style={styles.billsDivider} />
              <View style={styles.billsSummaryItem}>
                <Text style={styles.billsSummaryLabel}>Pendente</Text>
                <Text style={[styles.billsSummaryValue, { color: Colors.warning }]}>
                  {centsToBRL(totalPendingCents)}
                </Text>
              </View>
            </View>

            {/* Filtros de Faturas */}
            <View style={styles.billFilterRow}>
              {(['todas', 'pendentes', 'pagas'] as const).map((f) => {
                const isSelected = billFilter === f;
                const label = f === 'todas' ? 'Todas' : f === 'pendentes' ? 'Pendentes' : 'Pagas';
                return (
                  <TouchableOpacity
                    key={f}
                    style={[styles.billFilterChip, isSelected && styles.billFilterChipActive]}
                    onPress={() => {
                      playHaptic.selection();
                      setBillFilter(f);
                    }}
                  >
                    <Text
                      style={[
                        styles.billFilterChipText,
                        isSelected && styles.billFilterChipTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </View>

      {/* Conteúdo: Lista de Transações ou Lista de Faturas */}
      {activeSection === 'transacoes' ? (
        loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <FlashList
            data={filteredTransactions}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 120 }]}
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
        )
      ) : (
        <FlashList
          data={filteredBills}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-number-outline" size={44} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Nenhuma fatura encontrada</Text>
              <Text style={styles.emptySubtitle}>
                Cadastre contas fixas, cartões e boletos para nunca esquecer a data de vencimento.
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={handleOpenAddBill}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={18} color="#FFF" />
                <Text style={styles.emptyActionBtnText}>Cadastrar Primeira Fatura</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const paid = isBillPaid(item);
            return (
              <View style={[styles.billCard, paid && styles.billCardPaid]}>
                <TouchableOpacity
                  style={[styles.checkCircle, paid && styles.checkCirclePaid]}
                  onPress={() => handleToggleBillPaid(item)}
                  activeOpacity={0.7}
                >
                  {paid && <Ionicons name="checkmark" size={16} color="#FFF" />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.billInfo}
                  onPress={() => handleOpenEditBill(item)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.billName, paid && styles.textStrike]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={styles.badgeRow}>
                    <View style={styles.dueBadge}>
                      <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />
                      <Text style={styles.dueText}>Vence dia {item.due_day}</Text>
                    </View>
                    {item.notification_id && (
                      <View style={styles.notifBadge}>
                        <Ionicons name="notifications-outline" size={12} color={Colors.primary} />
                        <Text style={styles.notifText}>Lembrete</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>

                <View style={styles.amountCol}>
                  <Text style={[styles.amountText, paid && styles.amountTextPaid]}>
                    {centsToBRL(item.amount)}
                  </Text>
                  <Text style={[styles.statusText, { color: paid ? Colors.income : Colors.warning }]}>
                    {paid ? 'PAGA' : 'PENDENTE'}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Botão Flutuante */}
      <TouchableOpacity
        style={[styles.fab, { bottom: Math.max(insets.bottom, 16) + 16 }]}
        onPress={activeSection === 'faturas' ? handleOpenAddBill : handleOpenAdd}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* Modal de Transação */}
      <TransactionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveTransaction}
        onDelete={handleDeleteTransaction}
        transactionToEdit={transactionToEdit}
        categories={categories}
      />

      {/* Modal de Fatura */}
      <BillModal
        visible={billModalVisible}
        onClose={() => setBillModalVisible(false)}
        onSave={handleSaveBill}
        onDelete={handleDeleteBill}
        billToEdit={billToEdit}
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
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  mainSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  mainSegmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
  },
  mainSegmentTabActive: {
    backgroundColor: Colors.primary,
  },
  mainSegmentText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  mainSegmentTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  segmentBadge: {
    backgroundColor: Colors.warning,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 6,
  },
  segmentBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '800',
  },
  billsTopArea: {
    marginBottom: 6,
  },
  billsSummaryCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  billsSummaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  billsDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border,
  },
  billsSummaryLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 3,
  },
  billsSummaryValue: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  billFilterRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  billFilterChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  billFilterChipActive: {
    backgroundColor: Colors.surfaceLight,
  },
  billFilterChipText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  billFilterChipTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  billCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  billCardPaid: {
    opacity: 0.65,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkCirclePaid: {
    backgroundColor: Colors.income,
    borderColor: Colors.income,
  },
  billInfo: {
    flex: 1,
    marginRight: 10,
  },
  billName: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  textStrike: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  dueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueText: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  notifBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    gap: 3,
  },
  notifText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '600',
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amountText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  amountTextPaid: {
    color: Colors.textSecondary,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    marginTop: 16,
  },
  emptyActionBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
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
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    gap: 5,
  },
  importBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  manageCatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.primary}18`,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    gap: 5,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
  },
  manageCatBtnText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 100,
    gap: 12,
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
