import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

const DB_NAME = 'fluxo.db';
let dbInstance: SQLite.SQLiteDatabase | null = null;

// Mock storage para ambiente Web caso SQLite nativo não esteja disponível
const webStorage = {
  data: {} as Record<string, any[]>,
  init() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = window.localStorage.getItem('@fluxo_web_db');
        if (saved) {
          this.data = JSON.parse(saved);
        }
      } catch (e) {
        console.warn('Web storage load error', e);
      }
    }
  },
  save() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('@fluxo_web_db', JSON.stringify(this.data));
      } catch (e) {
        console.warn('Web storage save error', e);
      }
    }
  },
};

export async function getDatabase(): Promise<SQLite.SQLiteDatabase | any> {
  if (Platform.OS === 'web') {
    webStorage.init();
    return null;
  }

  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  }
  return dbInstance;
}

export async function initDatabase(): Promise<void> {
  if (Platform.OS === 'web') {
    webStorage.init();
    if (!webStorage.data.categories) webStorage.data.categories = [];
    if (!webStorage.data.transactions) webStorage.data.transactions = [];
    if (!webStorage.data.bills) webStorage.data.bills = [];
    if (!webStorage.data.investments) webStorage.data.investments = [];
    if (!webStorage.data.events) webStorage.data.events = [];
    if (!webStorage.data.goals) webStorage.data.goals = [];
    if (!webStorage.data.goal_logs) webStorage.data.goal_logs = [];
    webStorage.save();
    return;
  }

  const db = await getDatabase();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      icon TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      type TEXT NOT NULL, -- 'receita' ou 'despesa'
      category_id INTEGER,
      date TEXT NOT NULL, -- 'AAAA-MM-DD'
      description TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      amount INTEGER NOT NULL,
      due_day INTEGER NOT NULL,
      notification_id TEXT,
      paid_month TEXT -- ex: "2026-11,2026-12" ou último mês pago
    );

    CREATE TABLE IF NOT EXISTS investments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'Tesouro Direto', 'CDB', 'LCI/LCA', 'Ações', 'FIIs', 'Outros'
      amount INTEGER NOT NULL,
      start_date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL, -- 'AAAA-MM-DD'
      time TEXT, -- 'HH:mm'
      end_time TEXT, -- 'HH:mm'
      category_id INTEGER,
      color TEXT,
      is_completed INTEGER DEFAULT 0,
      notification_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      period TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'yearly'
      target_type TEXT NOT NULL, -- 'counter', 'value', 'boolean'
      target_value REAL NOT NULL,
      unit TEXT NOT NULL, -- 'vezes', 'dias', 'km', 'litros', 'páginas', 'R$'
      category_id INTEGER,
      color TEXT NOT NULL,
      icon TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS goal_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id INTEGER NOT NULL,
      period_key TEXT NOT NULL, -- '2026-W45', '2026-11', '2026-11-10', '2026'
      current_value REAL DEFAULT 0,
      completed INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (goal_id) REFERENCES goals (id) ON DELETE CASCADE,
      UNIQUE(goal_id, period_key)
    );
  `);

  // Migrações seguras para suporte a extratos bancários (OFX / Open Finance)
  try {
    await db.execAsync(`ALTER TABLE transactions ADD COLUMN fitid TEXT;`);
  } catch (e) {
    // Coluna já existe
  }
  try {
    await db.execAsync(`ALTER TABLE transactions ADD COLUMN bank_name TEXT;`);
  } catch (e) {
    // Coluna já existe
  }
  try {
    await db.execAsync(`ALTER TABLE transactions ADD COLUMN sync_source TEXT;`);
  } catch (e) {
    // Coluna já existe
  }
  try {
    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_transactions_fitid ON transactions (user_id, fitid);`);
  } catch (e) {
    // Índice já existe ou falha não-crítica
  }

  // Migrações seguras para suporte ao Life OS (Eventos e Metas)
  try {
    await db.execAsync(`ALTER TABLE categories ADD COLUMN type TEXT DEFAULT 'all';`);
  } catch (e) {
    // Coluna já existe
  }
  try {
    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_events_user_date ON events (user_id, date);`);
  } catch (e) {
    // Índice já existe
  }
  try {
    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_goals_user ON goals (user_id, is_active);`);
  } catch (e) {
    // Índice já existe
  }
  try {
    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_goal_logs_goal_period ON goal_logs (goal_id, period_key);`);
  } catch (e) {
    // Índice já existe
  }
}

export { webStorage };
