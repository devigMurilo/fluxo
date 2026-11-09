import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import { Colors, CategoryPresets } from '../../constants/theme';
import { CategoryModal } from '../../components/CategoryModal';
import {
  addCategory,
  updateCategory,
  deleteCategory,
  getCategoriesWithCount,
  Category,
} from '../../db/queries';

type CategoryWithCount = Category & { transactionCount: number };

export default function CategoriasScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { reloadCategories, triggerRefresh, refreshKey } = useFinance();

  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 16
  );

  const [categoriesWithCount, setCategoriesWithCount] = useState<CategoryWithCount[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const list = await getCategoriesWithCount(user.id);
      setCategoriesWithCount(list);
    } catch (e) {
      console.warn('Erro ao carregar categorias com contagem:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  const handleOpenAdd = () => {
    setCategoryToEdit(null);
    setModalVisible(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setCategoryToEdit(cat);
    setModalVisible(true);
  };

  const handleSave = async (data: { name: string; color: string; icon: string }) => {
    if (!user) return;
    if (categoryToEdit) {
      await updateCategory(user.id, categoryToEdit.id, data.name, data.color, data.icon);
    } else {
      await addCategory(user.id, data.name, data.color, data.icon);
    }
    await reloadCategories();
    await loadData();
    triggerRefresh();
  };

  const handleDelete = async (id: number) => {
    if (!user) return;
    await deleteCategory(user.id, id);
    await reloadCategories();
    await loadData();
    triggerRefresh();
  };

  const handleConfirmDelete = (cat: CategoryWithCount) => {
    const txWarning =
      cat.transactionCount > 0
        ? `\n\nAtenção: Existem ${cat.transactionCount} transação(ões) vinculadas a esta categoria. Elas ficarão como sem categoria.`
        : '';

    Alert.alert(
      'Excluir Categoria',
      `Deseja realmente remover a categoria "${cat.name}"?${txWarning}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => handleDelete(cat.id),
        },
      ]
    );
  };

  const handleRestoreDefaults = async () => {
    if (!user) return;
    Alert.alert(
      'Restaurar Categorias',
      'Deseja adicionar novamente as categorias padrão do Fluxo (Alimentação, Transporte, Moradia, etc.)?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          onPress: async () => {
            for (const preset of CategoryPresets) {
              const exists = categoriesWithCount.some(
                (c) => c.name.toLowerCase() === preset.name.toLowerCase()
              );
              if (!exists) {
                await addCategory(user.id, preset.name, preset.color, preset.icon);
              }
            }
            await reloadCategories();
            await loadData();
            triggerRefresh();
            Alert.alert('Sucesso', 'Categorias padrão verificadas e restauradas.');
          },
        },
      ]
    );
  };

  const filteredCategories = categoriesWithCount.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <View style={styles.container}>
      {/* Top Bar com Navegação e Ações com Safe Area */}
      <View style={[styles.topBar, { paddingTop: topInset + 10 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
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
          <Text style={styles.headerTitle}>Categorias</Text>
          <Text style={styles.headerCountBadge}>
            {categoriesWithCount.length} cadastradas
          </Text>
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

      {/* Barra de Pesquisa */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome da categoria..."
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
      </View>

      {/* Lista de Categorias */}
      {loading && categoriesWithCount.length === 0 ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredCategories}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="pricetags-outline" size={36} color={Colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'Nenhuma categoria encontrada' : 'Nenhuma categoria criada'}
              </Text>
              <Text style={styles.emptySub}>
                {searchQuery
                  ? 'Tente buscar com outro termo.'
                  : 'Crie categorias para classificar suas despesas e receitas.'}
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={handleOpenAdd}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={18} color="#FFF" />
                <Text style={styles.emptyActionText}>Criar Primeira Categoria</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.cardItem}>
              {/* Ícone com Cor */}
              <View style={[styles.iconCircle, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon as any} size={22} color="#FFF" />
              </View>

              {/* Informações da Categoria */}
              <TouchableOpacity
                style={styles.infoTouch}
                onPress={() => handleOpenEdit(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.name}>{item.name}</Text>
                <View style={styles.metaRow}>
                  <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                  <Text style={styles.colorHex}>{item.color.toUpperCase()}</Text>
                  <Text style={styles.metaDivider}>•</Text>
                  <Text style={styles.transactionCountText}>
                    {item.transactionCount === 1
                      ? '1 transação'
                      : `${item.transactionCount} transações`}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Botões de Ação na Linha */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.actionIconBtn}
                  onPress={() => handleOpenEdit(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="create-outline" size={20} color={Colors.primary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionIconBtn, styles.deleteIconBtn]}
                  onPress={() => handleConfirmDelete(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={19} color={Colors.expense} />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListFooterComponent={
            categoriesWithCount.length > 0 ? (
              <TouchableOpacity
                style={styles.restoreDefaultsBtn}
                onPress={handleRestoreDefaults}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh-outline" size={16} color={Colors.textMuted} />
                <Text style={styles.restoreDefaultsText}>
                  Restaurar categorias padrão do sistema
                </Text>
              </TouchableOpacity>
            ) : undefined
          }
        />
      )}

      {/* Botão Flutuante de Adicionar */}
      <TouchableOpacity style={styles.fab} onPress={handleOpenAdd} activeOpacity={0.85}>
        <Ionicons name="add" size={30} color="#FFF" />
      </TouchableOpacity>

      {/* Modal de Criação / Edição */}
      <CategoryModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
        onDelete={handleDelete}
        categoryToEdit={categoryToEdit}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingBottom: 14,
    gap: 14,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  topBarTextWrap: {
    flex: 1,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  headerCountBadge: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  addHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 9,
    paddingHorizontal: 15,
    borderRadius: 14,
    gap: 5,
  },
  addHeaderBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: 22,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
    padding: 0,
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 22,
    paddingTop: 4,
    paddingBottom: 120,
    gap: 12,
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTouch: {
    flex: 1,
  },
  name: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  colorHex: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  metaDivider: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  transactionCountText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${Colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIconBtn: {
    backgroundColor: Colors.expenseBg,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    color: Colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    gap: 8,
  },
  emptyActionText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  restoreDefaultsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 8,
    gap: 6,
  },
  restoreDefaultsText: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
});
