import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import { Colors } from '../../constants/theme';
import { CategoryModal } from '../../components/CategoryModal';
import {
  addCategory,
  updateCategory,
  deleteCategory,
  Category,
} from '../../db/queries';

export default function CategoriasScreen() {
  const { user } = useAuth();
  const { categories, reloadCategories, triggerRefresh } = useFinance();

  const [modalVisible, setModalVisible] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);

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
    triggerRefresh();
  };

  const handleDelete = async (id: number) => {
    if (!user) return;
    await deleteCategory(user.id, id);
    await reloadCategories();
    triggerRefresh();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Minhas Categorias</Text>
        <Text style={styles.headerSubtitle}>
          Organize seus gastos criando e personalizando categorias com cores e ícones.
        </Text>
      </View>

      <FlatList
        data={categories}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.cardItem}
            onPress={() => handleOpenEdit(item)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: item.color }]}>
              <Ionicons name={item.icon as any} size={22} color="#FFF" />
            </View>

            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <View style={styles.metaRow}>
                <View style={[styles.colorBadge, { backgroundColor: item.color }]} />
                <Text style={styles.colorHex}>{item.color.toUpperCase()}</Text>
              </View>
            </View>

            <Ionicons name="create-outline" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      />

      {/* Botão Flutuante de Adicionar */}
      <TouchableOpacity style={styles.fab} onPress={handleOpenAdd} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#FFF" />
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
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
    gap: 10,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  info: {
    flex: 1,
  },
  name: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  colorBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  colorHex: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
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
