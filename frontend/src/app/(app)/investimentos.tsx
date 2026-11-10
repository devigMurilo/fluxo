import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import { Colors } from '../../constants/theme';
import { fetchBcbRates, BcbRates, EDUCATIONAL_CARDS } from '../../services/bcb';
import { InvestmentSimulator } from '../../components/InvestmentSimulator';
import { InvestmentModal } from '../../components/InvestmentModal';
import {
  getInvestments,
  addInvestment,
  deleteInvestment,
  Investment,
} from '../../db/queries';
import { centsToBRL } from '../../utils/formatCurrency';
import { formatDateBR } from '../../utils/dates';
import { playHaptic } from '../../utils/haptics';

export default function InvestimentosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { refreshKey, triggerRefresh } = useFinance();

  // Taxas do BCB
  const [rates, setRates] = useState<BcbRates | null>(null);
  const [loadingRates, setLoadingRates] = useState(false);

  // Carteira
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  // Card Educativo Expandido
  const [expandedCardId, setExpandedCardId] = useState<string | null>('tesouro-selic');

  const loadRates = async () => {
    try {
      setLoadingRates(true);
      const data = await fetchBcbRates();
      setRates(data);
    } catch (e) {
      console.warn('Erro ao obter taxas:', e);
    } finally {
      setLoadingRates(false);
    }
  };

  const loadInvestments = useCallback(async () => {
    if (!user) return;
    try {
      const list = await getInvestments(user.id);
      setInvestments(list);
    } catch (e) {
      console.warn('Erro ao obter carteira:', e);
    }
  }, [user]);

  useEffect(() => {
    loadRates();
  }, []);

  useEffect(() => {
    loadInvestments();
  }, [loadInvestments, refreshKey]);

  const handleSaveInvestment = async (data: {
    name: string;
    type: string;
    amount: number;
    startDate: string;
  }) => {
    if (!user) return;
    playHaptic.success();
    await addInvestment(user.id, data.name, data.type, data.amount, data.startDate);
    await loadInvestments();
    triggerRefresh();
  };

  const handleDeleteInvestment = (item: Investment) => {
    playHaptic.warning();
    Alert.alert(
      'Remover Ativo',
      `Deseja remover "${item.name}" da sua carteira manual?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            playHaptic.warning();
            await deleteInvestment(user.id, item.id);
            await loadInvestments();
            triggerRefresh();
          },
        },
      ]
    );
  };

  const totalPortfolioCents = investments.reduce((acc, curr) => acc + curr.amount, 0);

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
          <Text style={styles.headerTitle}>Investimentos</Text>
          <Text style={styles.headerSubtitle}>Simulações e carteira pessoal</Text>
        </View>

        <TouchableOpacity
          style={styles.addHeaderBtn}
          onPress={() => {
            playHaptic.medium();
            setModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.addHeaderBtnText}>Ativo</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
      >
        {/* AVISO OBRIGATÓRIO DE CONTEÚDO EDUCATIVO */}
      <View style={styles.disclaimerBanner}>
        <Ionicons name="information-circle" size={20} color={Colors.warning} style={styles.disclaimerIcon} />
        <View style={styles.disclaimerTextWrap}>
          <Text style={styles.disclaimerTitle}>Conteúdo educativo. Não é recomendação de investimento.</Text>
          <Text style={styles.disclaimerDesc}>
            O Fluxo não indica produtos específicos para compra. Todas as informações e simulações têm caráter estritamente pedagógico.
          </Text>
        </View>
      </View>

      {/* SEÇÃO 1: TAXAS DO BANCO CENTRAL */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="analytics-outline" size={18} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Taxas Oficiais de Referência</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshRatesButton}
          onPress={loadRates}
          disabled={loadingRates}
        >
          {loadingRates ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Ionicons name="refresh" size={16} color={Colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.ratesGrid}>
        {/* SELIC */}
        <View style={styles.rateCard}>
          <Text style={styles.rateLabel}>Taxa Selic Meta</Text>
          <Text style={styles.rateValue}>{rates?.selic ? `${rates.selic.toFixed(2)}%` : '--'}</Text>
          <Text style={styles.rateSub}>ao ano</Text>
        </View>

        {/* CDI */}
        <View style={styles.rateCard}>
          <Text style={styles.rateLabel}>Taxa CDI</Text>
          <Text style={[styles.rateValue, { color: Colors.info }]}>
            {rates?.cdi ? `${rates.cdi.toFixed(2)}%` : '--'}
          </Text>
          <Text style={styles.rateSub}>ao ano</Text>
        </View>

        {/* POUPANÇA */}
        <View style={styles.rateCard}>
          <Text style={styles.rateLabel}>Poupança</Text>
          <Text style={[styles.rateValue, { color: Colors.purple }]}>
            {rates?.poupanca ? `${rates.poupanca.toFixed(2)}%` : '--'}
          </Text>
          <Text style={styles.rateSub}>ao ano</Text>
        </View>
      </View>

      <Text style={styles.ratesSource}>
        Fonte: Banco Central do Brasil (SGS) • {rates?.date || 'Atualizado'}
        {rates?.isFallback && ' (Modo contingência offline)'}
      </Text>

      {/* SEÇÃO 2: SIMULADOR DE JUROS COMPOSTOS */}
      <InvestmentSimulator />

      {/* SEÇÃO 3: CARTEIRA MANUAL */}
      <View style={styles.card}>
        <View style={styles.portfolioHeader}>
          <View>
            <Text style={styles.portfolioTitle}>Minha Carteira de Ativos</Text>
            <Text style={styles.portfolioSubtitle}>Registro manual de investimentos</Text>
          </View>

          <TouchableOpacity
            style={styles.addAssetButton}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color="#FFF" />
            <Text style={styles.addAssetText}>Adicionar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.portfolioTotalBox}>
          <Text style={styles.portfolioTotalLabel}>Patrimônio Registrado</Text>
          <Text style={styles.portfolioTotalValue}>{centsToBRL(totalPortfolioCents)}</Text>
        </View>

        {investments.length === 0 ? (
          <View style={styles.emptyPortfolio}>
            <Ionicons name="briefcase-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyPortfolioText}>
              Nenhum ativo registrado na carteira ainda.
            </Text>
          </View>
        ) : (
          <View style={styles.portfolioList}>
            {investments.map((inv) => (
              <View key={inv.id} style={styles.portfolioItem}>
                <View style={styles.portfolioItemInfo}>
                  <Text style={styles.portfolioItemName}>{inv.name}</Text>
                  <Text style={styles.portfolioItemType}>
                    {inv.type} • Desde {formatDateBR(inv.start_date, true)}
                  </Text>
                </View>

                <View style={styles.portfolioItemRight}>
                  <Text style={styles.portfolioItemAmt}>{centsToBRL(inv.amount)}</Text>
                  <TouchableOpacity
                    onPress={() => handleDeleteInvestment(inv)}
                    style={styles.deleteAssetBtn}
                  >
                    <Ionicons name="trash-outline" size={16} color={Colors.expense} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* SEÇÃO 4: GUIA EDUCATIVO */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="school-outline" size={18} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Guia Educativo de Produtos</Text>
        </View>
      </View>

      <View style={styles.eduCardsList}>
        {EDUCATIONAL_CARDS.map((card) => {
          const isExpanded = expandedCardId === card.id;

          return (
            <TouchableOpacity
              key={card.id}
              style={styles.eduCard}
              onPress={() => setExpandedCardId(isExpanded ? null : card.id)}
              activeOpacity={0.9}
            >
              <View style={styles.eduCardHeader}>
                <View style={styles.eduCardHeaderLeft}>
                  <Text style={styles.eduCardTitle}>{card.title}</Text>
                  <Text style={styles.eduCardCategory}>{card.category}</Text>
                </View>

                <View style={styles.eduCardHeaderRight}>
                  <View style={[styles.riskBadge, { backgroundColor: `${card.riskColor}20` }]}>
                    <Text style={[styles.riskBadgeText, { color: card.riskColor }]}>
                      {card.risk}
                    </Text>
                  </View>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={Colors.textMuted}
                  />
                </View>
              </View>

              <View style={styles.eduPillsRow}>
                <View style={styles.eduPill}>
                  <Ionicons name="time-outline" size={12} color={Colors.textSecondary} />
                  <Text style={styles.eduPillText}>{card.liquidity}</Text>
                </View>
                <View style={styles.eduPill}>
                  <Ionicons name="trending-up-outline" size={12} color={Colors.primary} />
                  <Text style={[styles.eduPillText, { color: Colors.primary }]}>
                    {card.typicalYield}
                  </Text>
                </View>
              </View>

              {isExpanded && (
                <View style={styles.eduCardBody}>
                  <Text style={styles.eduDescription}>{card.description}</Text>

                  <View style={styles.prosConsSection}>
                    <Text style={styles.prosTitle}>Vantagens:</Text>
                    {card.pros.map((p, i) => (
                      <View key={i} style={styles.bulletRow}>
                        <Ionicons name="checkmark-circle" size={14} color={Colors.income} />
                        <Text style={styles.bulletText}>{p}</Text>
                      </View>
                    ))}

                    <Text style={[styles.prosTitle, { marginTop: 10 }]}>Pontos de atenção:</Text>
                    {card.cons.map((c, i) => (
                      <View key={i} style={styles.bulletRow}>
                        <Ionicons name="alert-circle" size={14} color={Colors.warning} />
                        <Text style={styles.bulletText}>{c}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Modal Adicionar Ativo */}
      <InvestmentModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveInvestment}
      />
    </ScrollView>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  disclaimerBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginBottom: 18,
    alignItems: 'flex-start',
  },
  disclaimerIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  disclaimerTextWrap: {
    flex: 1,
  },
  disclaimerTitle: {
    color: Colors.warning,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  disclaimerDesc: {
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  refreshRatesButton: {
    padding: 6,
  },
  ratesGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  rateCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rateLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
  },
  rateValue: {
    color: Colors.income,
    fontSize: 18,
    fontWeight: '800',
  },
  rateSub: {
    color: Colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  ratesSource: {
    color: Colors.textMuted,
    fontSize: 10,
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  portfolioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  portfolioTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  portfolioSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  addAssetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  addAssetText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  portfolioTotalBox: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  portfolioTotalLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  portfolioTotalValue: {
    color: Colors.primary,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  emptyPortfolio: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyPortfolioText: {
    color: Colors.textMuted,
    fontSize: 13,
    marginTop: 6,
  },
  portfolioList: {
    gap: 10,
  },
  portfolioItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: 12,
    padding: 12,
  },
  portfolioItemInfo: {
    flex: 1,
    marginRight: 8,
  },
  portfolioItemName: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  portfolioItemType: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  portfolioItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  portfolioItemAmt: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  deleteAssetBtn: {
    padding: 4,
  },
  eduCardsList: {
    gap: 12,
    marginBottom: 20,
  },
  eduCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  eduCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eduCardHeaderLeft: {
    flex: 1,
    marginRight: 8,
  },
  eduCardTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  eduCardCategory: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  eduCardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  riskBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  eduPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  eduPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  eduPillText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  eduCardBody: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  eduDescription: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  prosConsSection: {
    marginTop: 6,
  },
  prosTitle: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 3,
  },
  bulletText: {
    color: Colors.textSecondary,
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
});
