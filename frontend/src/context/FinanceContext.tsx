import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { Category, getCategories } from '../db/queries';
import { getCurrentMonthKey } from '../utils/dates';

interface FinanceContextType {
  selectedMonthKey: string;
  setSelectedMonthKey: (key: string) => void;
  categories: Category[];
  reloadCategories: () => Promise<void>;
  refreshKey: number;
  triggerRefresh: () => void;
}

const FinanceContext = createContext<FinanceContextType>({} as FinanceContextType);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(getCurrentMonthKey());
  const [categories, setCategories] = useState<Category[]>([]);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const reloadCategories = useCallback(async () => {
    if (!user) {
      setCategories([]);
      return;
    }
    try {
      const cats = await getCategories(user.id);
      setCategories(cats);
    } catch (e) {
      console.warn('Erro ao carregar categorias:', e);
    }
  }, [user]);

  useEffect(() => {
    reloadCategories();
  }, [reloadCategories, refreshKey]);

  return (
    <FinanceContext.Provider
      value={{
        selectedMonthKey,
        setSelectedMonthKey,
        categories,
        reloadCategories,
        refreshKey,
        triggerRefresh,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => useContext(FinanceContext);
