import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { Colors } from '../constants/theme';
import { MonthSelector } from '../components/MonthSelector';
import { BillModal } from '../components/BillModal';
import {
  getBills,
  addBill,
  updateBill,
  deleteBill,
  toggleBillPaid,
  Bill,
} from '../db/queries';
import { scheduleBillNotification, cancelNotification } from '../services/notifications';
import { centsToBRL } from '../utils/formatCurrency';
import { playHaptic } from '../utils/haptics';

export default function FaturasScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { selectedMonthKey, setSelectedMonthKey, refreshKey, triggerRefresh } = useFinance();

  const [bills, setBills] = useState<Bill[]>([]);
  const [filter, setFilter] = useState<'todas' | 'pendentes' | 'pagas'>('todas');
  const [modalVisible, setModalVisible] = useState(false);
  const [billToEdit, setBillToEdit] = useState<Bill | null>(null);

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
    loadBills();
  }, [loadBills, refreshKey]);

  const isBillPaid = (bill: Bill) => {
    if (!bill.paid_month) return false;
    return bill.paid_month.split(',').includes(selectedMonthKey);
  };

  const handleTogglePaid = async (bill: Bill) => {
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

  const handleOpenAdd = () => {
    playHaptic.medium();
    setBillToEdit(null);
    setModalVisible(true);
  };

  const handleOpenEdit = (bill: Bill) => {
    playHaptic.light();
    setBillToEdit(bill);
    setModalVisible(true);
  };

  const handleSave = async (data: {
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

  const handleDelete = async (id: number) => {
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

  // Cálculos de totais para o mês selecionado
  const totalDueCents = bills.reduce((acc, b) => acc + b.amount, 0);
  const totalPaidCents = bills
    .filter((b) => isBillPaid(b))
    .reduce((acc, b) => acc + b.amount, 0);
  const totalPendingCents = totalDueCents - totalPaidCents;

  const filteredBills = bills.filter((b) => {
    const paid = isBillPaid(b);
    if (filter === 'pendentes') return !paid;
    if (filter === 'pagas') return paid;
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Top Bar com Botão Voltar */}
      <View style={[styles.topBarHeader, { paddingTop: Math.max(insets.top, 16) + 10 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            playHaptic.light();
            if (router.canGoBack()) {
              router.back();
            } else {
              router.push('/');
            }
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.topBarTextWrap}>
          <Text style={styles.headerTitle}>Faturas & Lembretes</Text>
          <Text style={styles.headerSubtitle}>Contas fixas e datas de vencimento</Text>
        </View>

        <TouchableOpacity
          style={styles.addHeaderBtn}
          onPress={handleOpenAdd}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.addHeaderBtnText}>Nova</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.topSection}>
        <MonthSelector
          currentMonthKey={selectedMonthKey}
          onChangeMonth={(m) => setSelectedMonthKey(m)}
        />

        {/* Card de Resumo das Faturas */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total a Pagar</Text>
            <Text style={styles.summaryValue}>{centsToBRL(totalDueCents)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Pago</Text>
            <Text style={[styles.summaryValue, { color: Colors.income }]}>
              {centsToBRL(totalPaidCents)}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Pendente</Text>
            <Text style={[styles.summaryValue, { color: Colors.warning }]}>
              {centsToBRL(totalPendingCents)}
            </Text>
          </View>
        </View>

        {/* Filtros */}
        <View style={styles.filterRow}>
          {(['todas', 'pendentes', 'pagas'] as const).map((f) => {
            const isSelected = filter === f;
            const label = f === 'todas' ? 'Todas' : f === 'pendentes' ? 'Pendentes' : 'Pagas';
            return (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setFilter(f)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected && styles.filterChipTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <FlatList
        data={filteredBills}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 120 }]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={44} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Nenhuma fatura cadastrada</Text>
            <Text style={styles.emptySubtitle}>
              Cadastre suas contas fixas e cartões para nunca esquecer a data de vencimento.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const paid = isBillPaid(item);

          return (
            <View style={[styles.billCard, paid && styles.billCardPaid]}>
              {/* Botão de Pagar / Desmarcar */}
              <TouchableOpacity
                style={[styles.checkCircle, paid && styles.checkCirclePaid]}
                onPress={() => handleTogglePaid(item)}
                activeOpacity={0.7}
              >
                {paid && <Ionicons name="checkmark" size={16} color="#FFF" />}
              </TouchableOpacity>

              {/* Informações */}
              <TouchableOpacity
                style={styles.billInfo}
                onPress={() => handleOpenEdit(item)}
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
                      <Text style={styles.notifText}>Lembrete ativo</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              {/* Valor */}
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

      {/* Botão Flutuante */}
      <TouchableOpacity
        style={[styles.fab, { bottom: Math.max(insets.bottom, 16) + 16 }]}
        onPress={handleOpenAdd}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* Modal */}
      <BillModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
        onDelete={handleDelete}
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
  topBarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 12,
  },
  topBarTextWrap: {
    flex: 1,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  addHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  addHeaderBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  topSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginVertical: 10,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  summaryLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
  },
  summaryValue: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.surfaceLight,
    borderColor: Colors.primary,
  },
  filterChipText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
    gap: 12,
  },
  billCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  billCardPaid: {
    opacity: 0.7,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
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
    color: Colors.textSecondary,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  dueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueText: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  notifBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
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
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
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
    maxWidth: 260,
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
