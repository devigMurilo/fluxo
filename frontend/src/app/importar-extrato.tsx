import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { Colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { parseBankStatement, ParsedTransaction } from '../services/ofxParser';
import { suggestCategory } from '../services/autoCategorizer';
import {
  getExistingFitids,
  importBankTransactions,
  Category,
  BankImportPayload,
} from '../db/queries';
import { centsToBRL } from '../utils/formatCurrency';
import { formatDateBR } from '../utils/dates';

interface UIImportItem extends ParsedTransaction {
  selected: boolean;
  isDuplicate: boolean;
  assignedCategory: Category | null;
}

export default function ImportarExtratoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { categories, triggerRefresh } = useFinance();

  const [activeBankTab, setActiveBankTab] = useState<'nubank' | 'inter'>('nubank');
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [detectedBank, setDetectedBank] = useState<string>('');
  const [importItems, setImportItems] = useState<UIImportItem[]>([]);
  const [filterView, setFilterView] = useState<'novas' | 'todas' | 'duplicadas'>('novas');

  // Modal para trocar categoria de uma transação específica
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  const handlePickDocument = async () => {
    try {
      setParsing(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setParsing(false);
        return;
      }

      const asset = result.assets[0];
      setFileName(asset.name);

      // Leitura do conteúdo do arquivo compatível com Mobile e Web
      let fileContent = '';
      if (Platform.OS === 'web' && (asset as any).file) {
        fileContent = await (asset as any).file.text();
      } else {
        const response = await fetch(asset.uri);
        fileContent = await response.text();
      }

      if (!fileContent || fileContent.trim().length === 0) {
        Alert.alert('Arquivo Vazio', 'O arquivo selecionado não contém dados para importar.');
        setParsing(false);
        return;
      }

      // Processa o extrato (OFX ou CSV)
      const statement = parseBankStatement(fileContent, asset.name);

      if (statement.transactions.length === 0) {
        Alert.alert(
          'Nenhuma Transação Encontrada',
          'Não foi possível encontrar transações financeiras válidas neste arquivo. Verifique se exportou no formato OFX ou CSV.'
        );
        setParsing(false);
        return;
      }

      setDetectedBank(statement.bankName);

      const userId = user?.id || 1;
      // Carrega FITIDs existentes para identificar duplicatas
      const existingFitids = await getExistingFitids(userId);

      // Monta os itens com auto-categorização inteligente e checagem de duplicatas
      const items: UIImportItem[] = statement.transactions.map((t) => {
        const isDuplicate = existingFitids.has(t.id);
        const suggested = suggestCategory(t.description, t.type, categories);
        const assignedCategory = suggested ? (categories.find((c) => c.id === suggested.id) || null) : null;

        return {
          ...t,
          selected: !isDuplicate, // já vem desmarcado se for duplicado
          isDuplicate,
          assignedCategory,
        };
      });

      setImportItems(items);

      // Se todas forem duplicadas, avisa o usuário
      const totalDupes = items.filter((i) => i.isDuplicate).length;
      if (totalDupes === items.length) {
        Alert.alert(
          'Extrato Já Importado',
          'Todas as transações deste arquivo já foram importadas anteriormente.'
        );
      }
    } catch (error: any) {
      console.warn('Erro ao ler extrato:', error);
      Alert.alert('Erro na Leitura', 'Não foi possível processar o arquivo selecionado.');
    } finally {
      setParsing(false);
    }
  };

  const toggleSelectItem = (index: number) => {
    setImportItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], selected: !copy[index].selected };
      return copy;
    });
  };

  const handleSelectAll = (select: boolean) => {
    setImportItems((prev) =>
      prev.map((item) => ({
        ...item,
        selected: select ? !item.isDuplicate : false,
      }))
    );
  };

  const openCategoryPicker = (index: number) => {
    setEditingIndex(index);
    setCategoryModalVisible(true);
  };

  const handleAssignCategory = (cat: Category | null) => {
    if (editingIndex !== null) {
      setImportItems((prev) => {
        const copy = [...prev];
        copy[editingIndex] = { ...copy[editingIndex], assignedCategory: cat };
        return copy;
      });
    }
    setCategoryModalVisible(false);
    setEditingIndex(null);
  };

  const handleConfirmImport = async () => {
    const userId = user?.id || 1;

    const selectedItems = importItems.filter((i) => i.selected);
    if (selectedItems.length === 0) {
      Alert.alert('Nenhuma selecionada', 'Selecione ao menos uma transação para importar.');
      return;
    }

    try {
      setImporting(true);

      const payload: BankImportPayload[] = selectedItems.map((item) => ({
        amount: item.amount,
        type: item.type,
        categoryId: item.assignedCategory ? item.assignedCategory.id : null,
        date: item.date,
        description: item.description,
        fitid: item.id,
        bankName: detectedBank || item.bankName || 'Banco',
        syncSource: 'ofx',
      }));

      const result = await importBankTransactions(userId, payload);

      triggerRefresh();

      Alert.alert(
        'Importação Concluída! 🎉',
        `${result.importedCount} transações importadas com sucesso.${
          result.skippedCount > 0 ? ` (${result.skippedCount} duplicadas ignoradas)` : ''
        }`,
        [
          {
            text: 'Ver Transações',
            onPress: () => router.replace('/transacoes'),
          },
        ]
      );
    } catch (error) {
      console.warn('Erro ao importar transações:', error);
      Alert.alert('Erro', 'Ocorreu uma falha ao salvar as transações importadas.');
    } finally {
      setImporting(false);
    }
  };

  // Estatísticas do extrato
  const totalCount = importItems.length;
  const newCount = importItems.filter((i) => !i.isDuplicate).length;
  const dupeCount = importItems.filter((i) => i.isDuplicate).length;
  const selectedCount = importItems.filter((i) => i.selected).length;

  const filteredList = importItems.filter((item) => {
    if (filterView === 'novas') return !item.isDuplicate;
    if (filterView === 'duplicadas') return item.isDuplicate;
    return true;
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
      {/* Header Superior */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.push('/(app)/transacoes');
            }
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Importar Extrato Bancário</Text>
          <Text style={styles.headerSubtitle}>Nubank, Banco Inter e outros</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Se ainda não carregou um arquivo */}
      {importItems.length === 0 ? (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Card de Boas-Vindas */}
          <View style={styles.heroCard}>
            <View style={styles.heroIconBadge}>
              <Ionicons name="card-outline" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.heroTitle}>Sincronize suas finanças em segundos</Text>
            <Text style={styles.heroDesc}>
              Exporte o extrato no app do seu banco em formato <Text style={styles.boldText}>OFX</Text> ou{' '}
              <Text style={styles.boldText}>CSV</Text> e importe aqui. O Fluxo categoriza suas despesas
              automaticamente e não duplica transações.
            </Text>
          </View>

          {/* Abas dos Bancos */}
          <View style={styles.bankTabsContainer}>
            <TouchableOpacity
              style={[
                styles.bankTab,
                activeBankTab === 'nubank' && styles.bankTabActiveNubank,
              ]}
              onPress={() => setActiveBankTab('nubank')}
              activeOpacity={0.8}
            >
              <View style={[styles.bankLogoDot, { backgroundColor: '#8A05BE' }]} />
              <Text
                style={[
                  styles.bankTabText,
                  activeBankTab === 'nubank' && styles.bankTabTextActive,
                ]}
              >
                Nubank
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.bankTab,
                activeBankTab === 'inter' && styles.bankTabActiveInter,
              ]}
              onPress={() => setActiveBankTab('inter')}
              activeOpacity={0.8}
            >
              <View style={[styles.bankLogoDot, { backgroundColor: '#FF7A00' }]} />
              <Text
                style={[
                  styles.bankTabText,
                  activeBankTab === 'inter' && styles.bankTabTextActive,
                ]}
              >
                Banco Inter
              </Text>
            </TouchableOpacity>
          </View>

          {/* Instruções passo a passo */}
          <View style={styles.instructionsCard}>
            {activeBankTab === 'nubank' ? (
              <>
                <View style={styles.instructionHeader}>
                  <Text style={[styles.instructionBadgeText, { color: '#8A05BE' }]}>
                    Passo a passo no app Nubank
                  </Text>
                </View>

                <View style={styles.stepItem}>
                  <View style={styles.stepNumberBadge}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <Text style={styles.stepDesc}>
                    Abra o app do <Text style={styles.boldText}>Nubank</Text> e toque na sua{' '}
                    <Text style={styles.boldText}>Conta</Text> (ou em <Text style={styles.boldText}>Cartão de Crédito</Text>).
                  </Text>
                </View>

                <View style={styles.stepItem}>
                  <View style={styles.stepNumberBadge}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <Text style={styles.stepDesc}>
                    Role até a opção <Text style={styles.boldText}>"Pedir extrato"</Text> ou{' '}
                    <Text style={styles.boldText}>"Exportar"</Text>.
                  </Text>
                </View>

                <View style={styles.stepItem}>
                  <View style={styles.stepNumberBadge}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                  <Text style={styles.stepDesc}>
                    Selecione o formato <Text style={styles.boldText}>OFX</Text> (recomendado) ou{' '}
                    <Text style={styles.boldText}>CSV</Text> e envie para seu e-mail ou salve no celular.
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.instructionHeader}>
                  <Text style={[styles.instructionBadgeText, { color: '#FF7A00' }]}>
                    Passo a passo no app Banco Inter
                  </Text>
                </View>

                <View style={styles.stepItem}>
                  <View style={styles.stepNumberBadge}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <Text style={styles.stepDesc}>
                    Abra o app do <Text style={styles.boldText}>Inter</Text> e toque em{' '}
                    <Text style={styles.boldText}>"Extrato"</Text>.
                  </Text>
                </View>

                <View style={styles.stepItem}>
                  <View style={styles.stepNumberBadge}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <Text style={styles.stepDesc}>
                    Toque no ícone de <Text style={styles.boldText}>compartilhar / exportar</Text> no canto superior direito.
                  </Text>
                </View>

                <View style={styles.stepItem}>
                  <View style={styles.stepNumberBadge}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                  <Text style={styles.stepDesc}>
                    Escolha o período e selecione o formato <Text style={styles.boldText}>OFX</Text> ou{' '}
                    <Text style={styles.boldText}>CSV</Text> para salvar.
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Botão Principal de Upload */}
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handlePickDocument}
            activeOpacity={0.8}
            disabled={parsing}
          >
            {parsing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={24} color="#FFFFFF" style={{ marginRight: 10 }} />
                <Text style={styles.uploadButtonText}>Selecionar Extrato (OFX ou CSV)</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.securityNotice}>
            🔒 Seus dados bancários são processados 100% no seu dispositivo. Nenhuma senha ou informação sensível é enviada para fora do seu celular.
          </Text>
        </ScrollView>
      ) : (
        /* Se já tem arquivo carregado e lista de transações para revisar */
        <View style={styles.reviewContainer}>
          {/* Card Resumo do Extrato */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryTop}>
              <View style={styles.bankBadge}>
                <Ionicons name="business" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.bankBadgeText}>{detectedBank || 'Extrato Bancário'}</Text>
              </View>
              <TouchableOpacity
                style={styles.changeFileBtn}
                onPress={handlePickDocument}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-outline" size={15} color={Colors.primary} />
                <Text style={styles.changeFileText}>Trocar Arquivo</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.fileNameText} numberOfLines={1}>
              📄 {fileName}
            </Text>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{totalCount}</Text>
                <Text style={styles.statLabel}>Encontradas</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={[styles.statNum, { color: Colors.income }]}>{newCount}</Text>
                <Text style={styles.statLabel}>Novas</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={[styles.statNum, { color: Colors.textMuted }]}>{dupeCount}</Text>
                <Text style={styles.statLabel}>Duplicadas</Text>
              </View>
            </View>

            {/* Filtros da lista */}
            <View style={styles.filterBar}>
              <View style={styles.filterPills}>
                <TouchableOpacity
                  style={[styles.filterPill, filterView === 'novas' && styles.filterPillActive]}
                  onPress={() => setFilterView('novas')}
                >
                  <Text style={[styles.filterPillText, filterView === 'novas' && styles.filterPillTextActive]}>
                    Novas ({newCount})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterPill, filterView === 'todas' && styles.filterPillActive]}
                  onPress={() => setFilterView('todas')}
                >
                  <Text style={[styles.filterPillText, filterView === 'todas' && styles.filterPillTextActive]}>
                    Todas ({totalCount})
                  </Text>
                </TouchableOpacity>

                {dupeCount > 0 && (
                  <TouchableOpacity
                    style={[styles.filterPill, filterView === 'duplicadas' && styles.filterPillActive]}
                    onPress={() => setFilterView('duplicadas')}
                  >
                    <Text style={[styles.filterPillText, filterView === 'duplicadas' && styles.filterPillTextActive]}>
                      Duplicadas ({dupeCount})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Botão Marcar/Desmarcar todas */}
              <TouchableOpacity
                onPress={() => handleSelectAll(selectedCount < newCount)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.selectAllText}>
                  {selectedCount === newCount ? 'Desmarcar' : 'Selecionar Novas'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Lista de Transações */}
          <ScrollView style={styles.itemsScroll} contentContainerStyle={{ paddingBottom: 100 }}>
            {filteredList.map((item) => {
              const realIndex = importItems.findIndex((i) => i.id === item.id);
              const isIncome = item.type === 'receita';

              return (
                <View
                  key={item.id}
                  style={[
                    styles.itemCard,
                    item.isDuplicate && styles.itemCardDuplicate,
                    !item.selected && styles.itemCardUnselected,
                  ]}
                >
                  <TouchableOpacity
                    style={styles.checkboxTouchable}
                    onPress={() => toggleSelectItem(realIndex)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={item.selected ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={item.selected ? Colors.primary : Colors.textMuted}
                    />
                  </TouchableOpacity>

                  <View style={styles.itemContent}>
                    <View style={styles.itemRow}>
                      <Text style={styles.itemDesc} numberOfLines={1}>
                        {item.description}
                      </Text>
                      <Text
                        style={[
                          styles.itemAmount,
                          { color: isIncome ? Colors.income : Colors.expense },
                        ]}
                      >
                        {isIncome ? '+' : '-'} {centsToBRL(item.amount)}
                      </Text>
                    </View>

                    <View style={styles.itemBottomRow}>
                      <Text style={styles.itemDate}>{formatDateBR(item.date)}</Text>

                      {item.isDuplicate ? (
                        <View style={styles.dupeBadge}>
                          <Text style={styles.dupeBadgeText}>Já importada</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[
                            styles.categoryPill,
                            {
                              backgroundColor: item.assignedCategory
                                ? `${item.assignedCategory.color}20`
                                : `${Colors.border}50`,
                              borderColor: item.assignedCategory
                                ? item.assignedCategory.color
                                : Colors.border,
                            },
                          ]}
                          onPress={() => openCategoryPicker(realIndex)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={(item.assignedCategory?.icon as any) || 'pricetag-outline'}
                            size={12}
                            color={item.assignedCategory?.color || Colors.textMuted}
                            style={{ marginRight: 4 }}
                          />
                          <Text
                            style={[
                              styles.categoryPillText,
                              { color: item.assignedCategory?.color || Colors.textMuted },
                            ]}
                          >
                            {item.assignedCategory?.name || 'Sem categoria'}
                          </Text>
                          <Ionicons
                            name="chevron-down"
                            size={12}
                            color={item.assignedCategory?.color || Colors.textMuted}
                            style={{ marginLeft: 3 }}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Barra Flutuante de Confirmação */}
          <View style={styles.bottomBar}>
            <View style={styles.bottomBarInfo}>
              <Text style={styles.bottomBarSelectedText}>
                {selectedCount} selecionada{selectedCount === 1 ? '' : 's'}
              </Text>
              <Text style={styles.bottomBarHelpText}>Prontas para entrar no seu Fluxo</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                selectedCount === 0 && styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirmImport}
              disabled={selectedCount === 0 || importing}
              activeOpacity={0.8}
            >
              {importing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-done" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.confirmButtonText}>Importar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Modal para Trocar Categoria da Transação */}
      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Alterar Categoria</Text>
              <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 350 }}>
              {/* Opção sem categoria */}
              <TouchableOpacity
                style={styles.categoryItem}
                onPress={() => handleAssignCategory(null)}
              >
                <View style={[styles.categoryCircle, { backgroundColor: '#64748B25' }]}>
                  <Ionicons name="close-circle-outline" size={18} color="#64748B" />
                </View>
                <Text style={styles.categoryItemName}>Sem categoria</Text>
              </TouchableOpacity>

              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.categoryItem}
                  onPress={() => handleAssignCategory(cat)}
                >
                  <View style={[styles.categoryCircle, { backgroundColor: `${cat.color}25` }]}>
                    <Ionicons name={cat.icon as any} size={18} color={cat.color} />
                  </View>
                  <Text style={styles.categoryItemName}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  heroIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: `${Colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  heroDesc: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  boldText: {
    fontWeight: '700',
    color: Colors.text,
  },
  bankTabsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bankTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  bankTabActiveNubank: {
    backgroundColor: '#8A05BE20',
    borderWidth: 1,
    borderColor: '#8A05BE',
  },
  bankTabActiveInter: {
    backgroundColor: '#FF7A0020',
    borderWidth: 1,
    borderColor: '#FF7A00',
  },
  bankLogoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  bankTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  bankTabTextActive: {
    color: Colors.text,
    fontWeight: '700',
  },
  instructionsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
  },
  instructionHeader: {
    marginBottom: 14,
  },
  instructionBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  stepNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 1,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  stepDesc: {
    flex: 1,
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  securityNotice: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 17,
  },
  // Revisão
  reviewContainer: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  bankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.primary}20`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bankBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  changeFileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeFileText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  fileNameText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingVertical: 10,
    marginBottom: 12,
  },
  statBox: {
    alignItems: 'center',
  },
  statNum: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  filterPills: {
    flexDirection: 'row',
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: Colors.background,
  },
  filterPillActive: {
    backgroundColor: `${Colors.primary}25`,
  },
  filterPillText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  selectAllText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
  },
  itemsScroll: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  itemCardDuplicate: {
    opacity: 0.6,
    backgroundColor: `${Colors.border}20`,
  },
  itemCardUnselected: {
    opacity: 0.5,
  },
  checkboxTouchable: {
    paddingRight: 10,
  },
  itemContent: {
    flex: 1,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemDesc: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginRight: 8,
  },
  itemAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  itemBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemDate: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  dupeBadge: {
    backgroundColor: `${Colors.border}80`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dupeBadgeText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
  },
  bottomBarInfo: {},
  bottomBarSelectedText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  bottomBarHelpText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  confirmButtonDisabled: {
    backgroundColor: Colors.border,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  // Modal de categoria
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 20,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  categoryCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryItemName: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
  },
});
