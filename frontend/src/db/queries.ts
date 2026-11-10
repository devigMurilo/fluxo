import { Platform } from 'react-native';
import { getDatabase, webStorage } from './database';
import { CategoryPresets } from '../constants/theme';
import { getPeriodKey } from '../utils/dates';

export interface Category {
  id: number;
  user_id: number;
  name: string;
  color: string;
  icon: string;
  type?: 'all' | 'finance' | 'personal';
}

export interface EventItem {
  id: number;
  user_id: number;
  title: string;
  description?: string | null;
  date: string; // AAAA-MM-DD
  time?: string | null; // HH:mm
  end_time?: string | null; // HH:mm
  category_id?: number | null;
  color?: string | null;
  is_completed: boolean | number;
  notification_id?: string | null;
  created_at?: string;
  category_name?: string | null;
  category_icon?: string | null;
  category_color?: string | null;
}

export interface Goal {
  id: number;
  user_id: number;
  title: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  target_type: 'counter' | 'value' | 'boolean';
  target_value: number;
  unit: string; // 'vezes', 'dias', 'km', 'litros', 'páginas', 'R$'
  category_id?: number | null;
  color: string;
  icon: string;
  is_active: boolean | number;
  created_at?: string;
  category_name?: string | null;
}

export interface GoalWithProgress extends Goal {
  period_key: string;
  current_value: number;
  completed: boolean;
}

export interface Transaction {
  id: number;
  user_id: number;
  amount: number; // Em centavos
  type: 'receita' | 'despesa';
  category_id: number | null;
  date: string; // AAAA-MM-DD
  description: string;
  category_name?: string;
  category_color?: string;
  category_icon?: string;
  fitid?: string | null;
  bank_name?: string | null;
  sync_source?: string | null;
}

export interface Bill {
  id: number;
  user_id: number;
  name: string;
  amount: number; // Em centavos
  due_day: number;
  notification_id?: string | null;
  paid_month?: string | null;
}

export interface Investment {
  id: number;
  user_id: number;
  name: string;
  type: string;
  amount: number; // Em centavos
  start_date: string;
}

export interface MonthlySummary {
  totalIncome: number; // Centavos
  totalExpense: number; // Centavos
  balance: number; // Centavos
}

export interface CategoryExpense {
  name: string;
  color: string;
  icon: string;
  amount: number; // Centavos
  percentage: number;
}

export interface WeeklyExpense {
  label: string;
  amount: number; // Centavos
}

// ----------------------------------------------------
// CATEGORIAS
// ----------------------------------------------------

export async function seedDefaultCategoriesIfEmpty(userId: number): Promise<void> {
  const categories = await getCategories(userId);
  if (categories.length === 0) {
    for (const preset of CategoryPresets) {
      await addCategory(userId, preset.name, preset.color, preset.icon);
    }
  }
}

export async function getCategories(userId: number): Promise<Category[]> {
  if (Platform.OS === 'web') {
    const list = webStorage.data.categories || [];
    return list.filter((c: Category) => c.user_id === userId);
  }

  const db = await getDatabase();
  const rows = await db.getAllAsync(
    'SELECT * FROM categories WHERE user_id = ? ORDER BY name ASC',
    [userId]
  );
  return rows as Category[];
}

export async function addCategory(
  userId: number,
  name: string,
  color: string,
  icon: string
): Promise<number> {
  if (Platform.OS === 'web') {
    const list = webStorage.data.categories || [];
    const id = list.length > 0 ? Math.max(...list.map((c: any) => c.id)) + 1 : 1;
    list.push({ id, user_id: userId, name, color, icon });
    webStorage.data.categories = list;
    webStorage.save();
    return id;
  }

  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO categories (user_id, name, color, icon) VALUES (?, ?, ?, ?)',
    [userId, name, color, icon]
  );
  return result.lastInsertRowId;
}

export async function updateCategory(
  userId: number,
  id: number,
  name: string,
  color: string,
  icon: string
): Promise<void> {
  if (Platform.OS === 'web') {
    const list = webStorage.data.categories || [];
    const item = list.find((c: any) => c.id === id && c.user_id === userId);
    if (item) {
      item.name = name;
      item.color = color;
      item.icon = icon;
      webStorage.save();
    }
    return;
  }

  const db = await getDatabase();
  await db.runAsync(
    'UPDATE categories SET name = ?, color = ?, icon = ? WHERE id = ? AND user_id = ?',
    [name, color, icon, id, userId]
  );
}

export async function getCategoriesWithCount(
  userId: number
): Promise<(Category & { transactionCount: number })[]> {
  if (Platform.OS === 'web') {
    const list = webStorage.data.categories || [];
    const userCats = list.filter((c: Category) => c.user_id === userId);
    const txs = (webStorage.data.transactions || []).filter((t: any) => t.user_id === userId);
    return userCats.map((c: Category) => ({
      ...c,
      transactionCount: txs.filter((t: any) => t.category_id === c.id).length,
    }));
  }

  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `
    SELECT c.*, COUNT(t.id) as transactionCount
    FROM categories c
    LEFT JOIN transactions t ON c.id = t.category_id AND t.user_id = ?
    WHERE c.user_id = ?
    GROUP BY c.id
    ORDER BY c.name ASC
  `,
    [userId, userId]
  );
  return rows as (Category & { transactionCount: number })[];
}

export async function deleteCategory(userId: number, id: number): Promise<void> {
  if (Platform.OS === 'web') {
    (webStorage.data.transactions || []).forEach((t: any) => {
      if (t.category_id === id && t.user_id === userId) {
        t.category_id = null;
      }
    });
    webStorage.data.categories = (webStorage.data.categories || []).filter(
      (c: any) => !(c.id === id && c.user_id === userId)
    );
    webStorage.save();
    return;
  }

  const db = await getDatabase();
  await db.runAsync(
    'UPDATE transactions SET category_id = NULL WHERE category_id = ? AND user_id = ?',
    [id, userId]
  );
  await db.runAsync('DELETE FROM categories WHERE id = ? AND user_id = ?', [id, userId]);
}

// ----------------------------------------------------
// TRANSAÇÕES
// ----------------------------------------------------

export async function getTransactions(
  userId: number,
  options?: { monthKey?: string; limit?: number; offset?: number; type?: 'receita' | 'despesa' }
): Promise<Transaction[]> {
  const { monthKey, limit = 50, offset = 0, type } = options || {};

  if (Platform.OS === 'web') {
    let list = (webStorage.data.transactions || []).filter((t: any) => t.user_id === userId);
    if (monthKey) {
      list = list.filter((t: any) => t.date && t.date.startsWith(monthKey));
    }
    if (type) {
      list = list.filter((t: any) => t.type === type);
    }
    list.sort((a: any, b: any) => (b.date > a.date ? 1 : -1));

    const cats = webStorage.data.categories || [];
    const enriched = list.map((t: any) => {
      const cat = cats.find((c: any) => c.id === t.category_id);
      return {
        ...t,
        category_name: cat ? cat.name : 'Sem categoria',
        category_color: cat ? cat.color : '#64748B',
        category_icon: cat ? cat.icon : 'ellipsis-horizontal-circle-outline',
      };
    });

    return enriched.slice(offset, offset + limit);
  }

  const db = await getDatabase();
  let query = `
    SELECT 
      t.*, 
      c.name AS category_name, 
      c.color AS category_color, 
      c.icon AS category_icon
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ?
  `;
  const params: any[] = [userId];

  if (monthKey) {
    query += ` AND t.date LIKE ?`;
    params.push(`${monthKey}%`);
  }

  if (type) {
    query += ` AND t.type = ?`;
    params.push(type);
  }

  query += ` ORDER BY t.date DESC, t.id DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const rows = await db.getAllAsync(query, params);
  return rows as Transaction[];
}

export async function addTransaction(
  userId: number,
  amount: number,
  type: 'receita' | 'despesa',
  categoryId: number | null,
  date: string,
  description: string,
  fitid?: string | null,
  bankName?: string | null,
  syncSource?: string | null
): Promise<number> {
  if (Platform.OS === 'web') {
    const list = webStorage.data.transactions || [];
    const id = list.length > 0 ? Math.max(...list.map((t: any) => t.id)) + 1 : 1;
    list.push({
      id,
      user_id: userId,
      amount,
      type,
      category_id: categoryId,
      date,
      description,
      fitid: fitid || null,
      bank_name: bankName || null,
      sync_source: syncSource || 'manual',
    });
    webStorage.data.transactions = list;
    webStorage.save();
    return id;
  }

  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO transactions (user_id, amount, type, category_id, date, description, fitid, bank_name, sync_source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, amount, type, categoryId, date, description, fitid || null, bankName || null, syncSource || 'manual']
  );
  return result.lastInsertRowId;
}

export async function getExistingFitids(userId: number): Promise<Set<string>> {
  if (Platform.OS === 'web') {
    const list = webStorage.data.transactions || [];
    const fitids = new Set<string>();
    for (const t of list) {
      if (t.user_id === userId && t.fitid) {
        fitids.add(t.fitid);
      }
    }
    return fitids;
  }

  const db = await getDatabase();
  const rows: any[] = await db.getAllAsync(
    `SELECT fitid FROM transactions WHERE user_id = ? AND fitid IS NOT NULL`,
    [userId]
  );
  const fitids = new Set<string>();
  for (const r of rows) {
    if (r.fitid) {
      fitids.add(r.fitid);
    }
  }
  return fitids;
}

export interface BankImportPayload {
  amount: number;
  type: 'receita' | 'despesa';
  categoryId: number | null;
  date: string;
  description: string;
  fitid?: string;
  bankName?: string;
  syncSource?: string;
}

export async function importBankTransactions(
  userId: number,
  transactions: BankImportPayload[]
): Promise<{ importedCount: number; skippedCount: number }> {
  if (transactions.length === 0) {
    return { importedCount: 0, skippedCount: 0 };
  }

  const existingFitids = await getExistingFitids(userId);
  let importedCount = 0;
  let skippedCount = 0;

  if (Platform.OS === 'web') {
    const list = webStorage.data.transactions || [];
    let currentId = list.length > 0 ? Math.max(...list.map((t: any) => t.id)) + 1 : 1;

    for (const item of transactions) {
      if (item.fitid && existingFitids.has(item.fitid)) {
        skippedCount++;
        continue;
      }

      list.push({
        id: currentId++,
        user_id: userId,
        amount: item.amount,
        type: item.type,
        category_id: item.categoryId,
        date: item.date,
        description: item.description,
        fitid: item.fitid || null,
        bank_name: item.bankName || 'Banco',
        sync_source: item.syncSource || 'ofx',
      });

      if (item.fitid) {
        existingFitids.add(item.fitid);
      }
      importedCount++;
    }

    webStorage.data.transactions = list;
    webStorage.save();
    return { importedCount, skippedCount };
  }

  const db = await getDatabase();
  await db.execAsync('BEGIN TRANSACTION;');

  try {
    for (const item of transactions) {
      if (item.fitid && existingFitids.has(item.fitid)) {
        skippedCount++;
        continue;
      }

      await db.runAsync(
        `INSERT INTO transactions (user_id, amount, type, category_id, date, description, fitid, bank_name, sync_source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          item.amount,
          item.type,
          item.categoryId,
          item.date,
          item.description,
          item.fitid || null,
          item.bankName || 'Banco',
          item.syncSource || 'ofx',
        ]
      );

      if (item.fitid) {
        existingFitids.add(item.fitid);
      }
      importedCount++;
    }

    await db.execAsync('COMMIT;');
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }

  return { importedCount, skippedCount };
}

export async function updateTransaction(
  userId: number,
  id: number,
  amount: number,
  type: 'receita' | 'despesa',
  categoryId: number | null,
  date: string,
  description: string
): Promise<void> {
  if (Platform.OS === 'web') {
    const list = webStorage.data.transactions || [];
    const item = list.find((t: any) => t.id === id && t.user_id === userId);
    if (item) {
      item.amount = amount;
      item.type = type;
      item.category_id = categoryId;
      item.date = date;
      item.description = description;
      webStorage.save();
    }
    return;
  }

  const db = await getDatabase();
  await db.runAsync(
    `UPDATE transactions 
     SET amount = ?, type = ?, category_id = ?, date = ?, description = ?
     WHERE id = ? AND user_id = ?`,
    [amount, type, categoryId, date, description, id, userId]
  );
}

export async function deleteTransaction(userId: number, id: number): Promise<void> {
  if (Platform.OS === 'web') {
    webStorage.data.transactions = (webStorage.data.transactions || []).filter(
      (t: any) => !(t.id === id && t.user_id === userId)
    );
    webStorage.save();
    return;
  }

  const db = await getDatabase();
  await db.runAsync('DELETE FROM transactions WHERE id = ? AND user_id = ?', [id, userId]);
}

export async function getMonthlySummary(
  userId: number,
  monthKey: string
): Promise<MonthlySummary> {
  if (Platform.OS === 'web') {
    const list = (webStorage.data.transactions || []).filter(
      (t: any) => t.user_id === userId && t.date && t.date.startsWith(monthKey)
    );
    let totalIncome = 0;
    let totalExpense = 0;
    for (const item of list) {
      if (item.type === 'receita') {
        totalIncome += item.amount;
      } else {
        totalExpense += item.amount;
      }
    }
    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    };
  }

  const db = await getDatabase();
  const rows = (await db.getAllAsync(
    `SELECT type, SUM(amount) AS total 
     FROM transactions 
     WHERE user_id = ? AND date LIKE ? 
     GROUP BY type`,
    [userId, `${monthKey}%`]
  )) as { type: string; total: number }[];

  let totalIncome = 0;
  let totalExpense = 0;

  for (const row of rows) {
    if (row.type === 'receita') {
      totalIncome = row.total || 0;
    } else if (row.type === 'despesa') {
      totalExpense = row.total || 0;
    }
  }

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
  };
}

export async function getExpensesByCategory(
  userId: number,
  monthKey: string
): Promise<CategoryExpense[]> {
  if (Platform.OS === 'web') {
    const list = (webStorage.data.transactions || []).filter(
      (t: any) => t.user_id === userId && t.type === 'despesa' && t.date && t.date.startsWith(monthKey)
    );
    const cats = webStorage.data.categories || [];
    const totals: Record<number, number> = {};
    let overallExpense = 0;

    for (const t of list) {
      const cId = t.category_id || 0;
      totals[cId] = (totals[cId] || 0) + t.amount;
      overallExpense += t.amount;
    }

    const result: CategoryExpense[] = [];
    for (const [cIdStr, amt] of Object.entries(totals)) {
      const cat = cats.find((c: any) => c.id === parseInt(cIdStr, 10));
      result.push({
        name: cat ? cat.name : 'Outros',
        color: cat ? cat.color : '#64748B',
        icon: cat ? cat.icon : 'ellipsis-horizontal-circle-outline',
        amount: amt,
        percentage: overallExpense > 0 ? Math.round((amt / overallExpense) * 100) : 0,
      });
    }
    return result.sort((a, b) => b.amount - a.amount);
  }

  const db = await getDatabase();
  const rows = (await db.getAllAsync(
    `SELECT 
       COALESCE(c.name, 'Outros') AS name,
       COALESCE(c.color, '#64748B') AS color,
       COALESCE(c.icon, 'ellipsis-horizontal-circle-outline') AS icon,
       SUM(t.amount) AS amount
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     WHERE t.user_id = ? AND t.type = 'despesa' AND t.date LIKE ?
     GROUP BY c.id, c.name, c.color, c.icon
     ORDER BY amount DESC`,
    [userId, `${monthKey}%`]
  )) as { name: string; color: string; icon: string; amount: number }[];

  const total = rows.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  return rows.map((r) => ({
    name: r.name,
    color: r.color,
    icon: r.icon,
    amount: r.amount,
    percentage: total > 0 ? Math.round((r.amount / total) * 100) : 0,
  }));
}

export async function getWeeklyExpenses(
  userId: number,
  monthKey: string
): Promise<WeeklyExpense[]> {
  const transactions = await getTransactions(userId, { monthKey, type: 'despesa', limit: 500 });

  // Divide o mês em 4 semanas (dias 1-7, 8-14, 15-21, 22-fim)
  const weeks = [
    { label: 'Sem 1', amount: 0 },
    { label: 'Sem 2', amount: 0 },
    { label: 'Sem 3', amount: 0 },
    { label: 'Sem 4', amount: 0 },
  ];

  for (const t of transactions) {
    const day = parseInt(t.date.split('-')[2], 10);
    if (day <= 7) {
      weeks[0].amount += t.amount;
    } else if (day <= 14) {
      weeks[1].amount += t.amount;
    } else if (day <= 21) {
      weeks[2].amount += t.amount;
    } else {
      weeks[3].amount += t.amount;
    }
  }

  return weeks;
}

// ----------------------------------------------------
// FATURAS
// ----------------------------------------------------

export async function getBills(userId: number): Promise<Bill[]> {
  if (Platform.OS === 'web') {
    return (webStorage.data.bills || []).filter((b: any) => b.user_id === userId);
  }

  const db = await getDatabase();
  const rows = await db.getAllAsync(
    'SELECT * FROM bills WHERE user_id = ? ORDER BY due_day ASC',
    [userId]
  );
  return rows as Bill[];
}

export async function addBill(
  userId: number,
  name: string,
  amount: number,
  dueDay: number,
  notificationId?: string | null
): Promise<number> {
  if (Platform.OS === 'web') {
    const list = webStorage.data.bills || [];
    const id = list.length > 0 ? Math.max(...list.map((b: any) => b.id)) + 1 : 1;
    list.push({
      id,
      user_id: userId,
      name,
      amount,
      due_day: dueDay,
      notification_id: notificationId || null,
      paid_month: null,
    });
    webStorage.data.bills = list;
    webStorage.save();
    return id;
  }

  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO bills (user_id, name, amount, due_day, notification_id, paid_month) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, name, amount, dueDay, notificationId || null, null]
  );
  return result.lastInsertRowId;
}

export async function updateBill(
  userId: number,
  id: number,
  name: string,
  amount: number,
  dueDay: number,
  notificationId?: string | null
): Promise<void> {
  if (Platform.OS === 'web') {
    const list = webStorage.data.bills || [];
    const item = list.find((b: any) => b.id === id && b.user_id === userId);
    if (item) {
      item.name = name;
      item.amount = amount;
      item.due_day = dueDay;
      if (notificationId !== undefined) item.notification_id = notificationId;
      webStorage.save();
    }
    return;
  }

  const db = await getDatabase();
  await db.runAsync(
    'UPDATE bills SET name = ?, amount = ?, due_day = ?, notification_id = ? WHERE id = ? AND user_id = ?',
    [name, amount, dueDay, notificationId, id, userId]
  );
}

export async function toggleBillPaid(
  userId: number,
  id: number,
  monthKey: string,
  paid: boolean
): Promise<void> {
  const bills = await getBills(userId);
  const bill = bills.find((b) => b.id === id);
  if (!bill) return;

  const currentPaid = bill.paid_month ? bill.paid_month.split(',') : [];
  let updatedPaid: string[];

  if (paid) {
    if (!currentPaid.includes(monthKey)) {
      currentPaid.push(monthKey);
    }
    updatedPaid = currentPaid;
  } else {
    updatedPaid = currentPaid.filter((m) => m !== monthKey);
  }

  const finalStr = updatedPaid.join(',');

  if (Platform.OS === 'web') {
    bill.paid_month = finalStr;
    webStorage.save();
    return;
  }

  const db = await getDatabase();
  await db.runAsync('UPDATE bills SET paid_month = ? WHERE id = ? AND user_id = ?', [
    finalStr,
    id,
    userId,
  ]);
}

export async function deleteBill(userId: number, id: number): Promise<void> {
  if (Platform.OS === 'web') {
    webStorage.data.bills = (webStorage.data.bills || []).filter(
      (b: any) => !(b.id === id && b.user_id === userId)
    );
    webStorage.save();
    return;
  }

  const db = await getDatabase();
  await db.runAsync('DELETE FROM bills WHERE id = ? AND user_id = ?', [id, userId]);
}

// ----------------------------------------------------
// INVESTIMENTOS
// ----------------------------------------------------

export async function getInvestments(userId: number): Promise<Investment[]> {
  if (Platform.OS === 'web') {
    return (webStorage.data.investments || []).filter((inv: any) => inv.user_id === userId);
  }

  const db = await getDatabase();
  const rows = await db.getAllAsync(
    'SELECT * FROM investments WHERE user_id = ? ORDER BY start_date DESC',
    [userId]
  );
  return rows as Investment[];
}

export async function addInvestment(
  userId: number,
  name: string,
  type: string,
  amount: number,
  startDate: string
): Promise<number> {
  if (Platform.OS === 'web') {
    const list = webStorage.data.investments || [];
    const id = list.length > 0 ? Math.max(...list.map((inv: any) => inv.id)) + 1 : 1;
    list.push({ id, user_id: userId, name, type, amount, start_date: startDate });
    webStorage.data.investments = list;
    webStorage.save();
    return id;
  }

  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO investments (user_id, name, type, amount, start_date) VALUES (?, ?, ?, ?, ?)',
    [userId, name, type, amount, startDate]
  );
  return result.lastInsertRowId;
}

export async function deleteInvestment(userId: number, id: number): Promise<void> {
  if (Platform.OS === 'web') {
    webStorage.data.investments = (webStorage.data.investments || []).filter(
      (inv: any) => !(inv.id === id && inv.user_id === userId)
    );
    webStorage.save();
    return;
  }

  const db = await getDatabase();
  await db.runAsync('DELETE FROM investments WHERE id = ? AND user_id = ?', [id, userId]);
}

// ----------------------------------------------------
// EVENTOS & CALENDÁRIO
// ----------------------------------------------------

export async function getEventsForDay(userId: number, dateStr: string): Promise<EventItem[]> {
  if (Platform.OS === 'web') {
    const list = webStorage.data.events || [];
    const categories = webStorage.data.categories || [];
    return list
      .filter((e: any) => e.user_id === userId && e.date === dateStr)
      .map((e: any) => {
        const cat = categories.find((c: any) => c.id === e.category_id);
        return {
          ...e,
          is_completed: Boolean(e.is_completed),
          category_name: cat ? cat.name : null,
          category_icon: cat ? cat.icon : null,
          category_color: cat ? cat.color : null,
        };
      })
      .sort((a: any, b: any) => (a.time || '').localeCompare(b.time || ''));
  }

  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color
     FROM events e
     LEFT JOIN categories c ON e.category_id = c.id
     WHERE e.user_id = ? AND e.date = ?
     ORDER BY CASE WHEN e.time IS NULL OR e.time = '' THEN 1 ELSE 0 END, e.time ASC, e.id ASC`,
    [userId, dateStr]
  );

  return (rows as any[]).map((r) => ({
    ...r,
    is_completed: Boolean(r.is_completed),
  }));
}

export async function getEventsForMonth(userId: number, yearMonth: string): Promise<EventItem[]> {
  if (Platform.OS === 'web') {
    const list = webStorage.data.events || [];
    return list
      .filter((e: any) => e.user_id === userId && e.date.startsWith(yearMonth))
      .map((e: any) => ({ ...e, is_completed: Boolean(e.is_completed) }));
  }

  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color
     FROM events e
     LEFT JOIN categories c ON e.category_id = c.id
     WHERE e.user_id = ? AND e.date LIKE ?
     ORDER BY e.date ASC, e.time ASC`,
    [userId, `${yearMonth}%`]
  );

  return (rows as any[]).map((r) => ({
    ...r,
    is_completed: Boolean(r.is_completed),
  }));
}

export async function createEvent(
  userId: number,
  data: {
    title: string;
    description?: string | null;
    date: string;
    time?: string | null;
    end_time?: string | null;
    category_id?: number | null;
    color?: string | null;
    notification_id?: string | null;
  }
): Promise<number> {
  if (Platform.OS === 'web') {
    const list = webStorage.data.events || [];
    const id = list.length > 0 ? Math.max(...list.map((e: any) => e.id)) + 1 : 1;
    list.push({
      id,
      user_id: userId,
      ...data,
      is_completed: 0,
      created_at: new Date().toISOString(),
    });
    webStorage.data.events = list;
    webStorage.save();
    return id;
  }

  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO events (user_id, title, description, date, time, end_time, category_id, color, notification_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      data.title,
      data.description || null,
      data.date,
      data.time || null,
      data.end_time || null,
      data.category_id || null,
      data.color || null,
      data.notification_id || null,
    ]
  );
  return result.lastInsertRowId;
}

export async function updateEvent(
  userId: number,
  id: number,
  data: Partial<EventItem>
): Promise<void> {
  if (Platform.OS === 'web') {
    const list = webStorage.data.events || [];
    const idx = list.findIndex((e: any) => e.id === id && e.user_id === userId);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...data };
      webStorage.data.events = list;
      webStorage.save();
    }
    return;
  }

  const db = await getDatabase();
  const fields: string[] = [];
  const params: any[] = [];

  if (data.title !== undefined) { fields.push('title = ?'); params.push(data.title); }
  if (data.description !== undefined) { fields.push('description = ?'); params.push(data.description); }
  if (data.date !== undefined) { fields.push('date = ?'); params.push(data.date); }
  if (data.time !== undefined) { fields.push('time = ?'); params.push(data.time); }
  if (data.end_time !== undefined) { fields.push('end_time = ?'); params.push(data.end_time); }
  if (data.category_id !== undefined) { fields.push('category_id = ?'); params.push(data.category_id); }
  if (data.color !== undefined) { fields.push('color = ?'); params.push(data.color); }
  if (data.is_completed !== undefined) { fields.push('is_completed = ?'); params.push(data.is_completed ? 1 : 0); }
  if (data.notification_id !== undefined) { fields.push('notification_id = ?'); params.push(data.notification_id); }

  if (fields.length === 0) return;

  params.push(id, userId);
  await db.runAsync(`UPDATE events SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, params);
}

export async function toggleEventCompleted(userId: number, id: number, isCompleted: boolean): Promise<void> {
  await updateEvent(userId, id, { is_completed: isCompleted ? 1 : 0 });
}

export async function deleteEvent(userId: number, id: number): Promise<void> {
  if (Platform.OS === 'web') {
    webStorage.data.events = (webStorage.data.events || []).filter(
      (e: any) => !(e.id === id && e.user_id === userId)
    );
    webStorage.save();
    return;
  }

  const db = await getDatabase();
  await db.runAsync('DELETE FROM events WHERE id = ? AND user_id = ?', [id, userId]);
}

// ----------------------------------------------------
// METAS & HÁBITOS
// ----------------------------------------------------

export async function getGoalsWithProgress(
  userId: number,
  periodFilter?: 'daily' | 'weekly' | 'monthly' | 'yearly'
): Promise<GoalWithProgress[]> {
  const db = await getDatabase();

  if (Platform.OS === 'web') {
    const goalsList = webStorage.data.goals || [];
    const logsList = webStorage.data.goal_logs || [];
    const categories = webStorage.data.categories || [];

    const filtered = goalsList.filter((g: any) => {
      if (g.user_id !== userId || !g.is_active) return false;
      if (periodFilter && g.period !== periodFilter) return false;
      return true;
    });

    return filtered.map((g: any) => {
      const pKey = getPeriodKey(g.period);
      const log = logsList.find((l: any) => l.goal_id === g.id && l.period_key === pKey);
      const cat = categories.find((c: any) => c.id === g.category_id);
      const current_value = log ? log.current_value : 0;
      const completed = log ? Boolean(log.completed) : current_value >= g.target_value;

      return {
        ...g,
        category_name: cat ? cat.name : null,
        period_key: pKey,
        current_value,
        completed,
      };
    });
  }

  let query = `
    SELECT g.*, c.name as category_name
    FROM goals g
    LEFT JOIN categories c ON g.category_id = c.id
    WHERE g.user_id = ? AND g.is_active = 1
  `;
  const params: any[] = [userId];

  if (periodFilter) {
    query += ` AND g.period = ?`;
    params.push(periodFilter);
  }

  query += ` ORDER BY g.id ASC`;

  const rows = (await db.getAllAsync(query, params)) as any[];

  // Para cada meta, busca o log correspondente à chave atual do seu período
  const results: GoalWithProgress[] = [];

  for (const row of rows) {
    const pKey = getPeriodKey(row.period);
    const logRow = (await db.getFirstAsync(
      `SELECT current_value, completed FROM goal_logs WHERE goal_id = ? AND period_key = ?`,
      [row.id, pKey]
    )) as { current_value: number; completed: number } | null;

    const current_value = logRow ? logRow.current_value : 0;
    const completed = logRow ? Boolean(logRow.completed) : current_value >= row.target_value;

    results.push({
      ...row,
      period_key: pKey,
      current_value,
      completed,
    });
  }

  return results;
}

export async function createGoal(
  userId: number,
  data: {
    title: string;
    period: 'daily' | 'weekly' | 'monthly' | 'yearly';
    target_type: 'counter' | 'value' | 'boolean';
    target_value: number;
    unit: string;
    category_id?: number | null;
    color: string;
    icon: string;
  }
): Promise<number> {
  if (Platform.OS === 'web') {
    const list = webStorage.data.goals || [];
    const id = list.length > 0 ? Math.max(...list.map((g: any) => g.id)) + 1 : 1;
    list.push({
      id,
      user_id: userId,
      ...data,
      is_active: 1,
      created_at: new Date().toISOString(),
    });
    webStorage.data.goals = list;
    webStorage.save();
    return id;
  }

  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO goals (user_id, title, period, target_type, target_value, unit, category_id, color, icon)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      data.title,
      data.period,
      data.target_type,
      data.target_value,
      data.unit,
      data.category_id || null,
      data.color,
      data.icon,
    ]
  );
  return result.lastInsertRowId;
}

export async function updateGoal(
  userId: number,
  id: number,
  data: Partial<Goal>
): Promise<void> {
  if (Platform.OS === 'web') {
    const list = webStorage.data.goals || [];
    const idx = list.findIndex((g: any) => g.id === id && g.user_id === userId);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...data };
      webStorage.data.goals = list;
      webStorage.save();
    }
    return;
  }

  const db = await getDatabase();
  const fields: string[] = [];
  const params: any[] = [];

  if (data.title !== undefined) { fields.push('title = ?'); params.push(data.title); }
  if (data.period !== undefined) { fields.push('period = ?'); params.push(data.period); }
  if (data.target_type !== undefined) { fields.push('target_type = ?'); params.push(data.target_type); }
  if (data.target_value !== undefined) { fields.push('target_value = ?'); params.push(data.target_value); }
  if (data.unit !== undefined) { fields.push('unit = ?'); params.push(data.unit); }
  if (data.category_id !== undefined) { fields.push('category_id = ?'); params.push(data.category_id); }
  if (data.color !== undefined) { fields.push('color = ?'); params.push(data.color); }
  if (data.icon !== undefined) { fields.push('icon = ?'); params.push(data.icon); }
  if (data.is_active !== undefined) { fields.push('is_active = ?'); params.push(data.is_active ? 1 : 0); }

  if (fields.length === 0) return;

  params.push(id, userId);
  await db.runAsync(`UPDATE goals SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, params);
}

export async function deleteGoal(userId: number, id: number): Promise<void> {
  if (Platform.OS === 'web') {
    webStorage.data.goals = (webStorage.data.goals || []).filter(
      (g: any) => !(g.id === id && g.user_id === userId)
    );
    webStorage.data.goal_logs = (webStorage.data.goal_logs || []).filter(
      (l: any) => l.goal_id !== id
    );
    webStorage.save();
    return;
  }

  const db = await getDatabase();
  await db.runAsync('DELETE FROM goal_logs WHERE goal_id = ?', [id]);
  await db.runAsync('DELETE FROM goals WHERE id = ? AND user_id = ?', [id, userId]);
}

export async function incrementGoalProgress(
  goalId: number,
  periodKey: string,
  delta: number,
  targetValue: number
): Promise<{ currentValue: number; completed: boolean }> {
  if (Platform.OS === 'web') {
    const logs = webStorage.data.goal_logs || [];
    let log = logs.find((l: any) => l.goal_id === goalId && l.period_key === periodKey);
    let val = (log ? log.current_value : 0) + delta;
    if (val < 0) val = 0;
    const completed = val >= targetValue;

    if (!log) {
      logs.push({
        id: logs.length + 1,
        goal_id: goalId,
        period_key: periodKey,
        current_value: val,
        completed: completed ? 1 : 0,
      });
    } else {
      log.current_value = val;
      log.completed = completed ? 1 : 0;
    }
    webStorage.data.goal_logs = logs;
    webStorage.save();
    return { currentValue: val, completed };
  }

  const db = await getDatabase();
  const existing = (await db.getFirstAsync(
    `SELECT current_value FROM goal_logs WHERE goal_id = ? AND period_key = ?`,
    [goalId, periodKey]
  )) as { current_value: number } | null;

  let val = (existing ? existing.current_value : 0) + delta;
  if (val < 0) val = 0;
  const completed = val >= targetValue;

  await db.runAsync(
    `INSERT INTO goal_logs (goal_id, period_key, current_value, completed, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(goal_id, period_key) DO UPDATE SET
       current_value = ?,
       completed = ?,
       updated_at = datetime('now')`,
    [goalId, periodKey, val, completed ? 1 : 0, val, completed ? 1 : 0]
  );

  return { currentValue: val, completed };
}

export async function setGoalProgress(
  goalId: number,
  periodKey: string,
  value: number,
  targetValue: number
): Promise<{ currentValue: number; completed: boolean }> {
  const val = Math.max(0, value);
  const completed = val >= targetValue;

  if (Platform.OS === 'web') {
    const logs = webStorage.data.goal_logs || [];
    let log = logs.find((l: any) => l.goal_id === goalId && l.period_key === periodKey);
    if (!log) {
      logs.push({
        id: logs.length + 1,
        goal_id: goalId,
        period_key: periodKey,
        current_value: val,
        completed: completed ? 1 : 0,
      });
    } else {
      log.current_value = val;
      log.completed = completed ? 1 : 0;
    }
    webStorage.data.goal_logs = logs;
    webStorage.save();
    return { currentValue: val, completed };
  }

  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO goal_logs (goal_id, period_key, current_value, completed, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(goal_id, period_key) DO UPDATE SET
       current_value = ?,
       completed = ?,
       updated_at = datetime('now')`,
    [goalId, periodKey, val, completed ? 1 : 0, val, completed ? 1 : 0]
  );

  return { currentValue: val, completed };
}
