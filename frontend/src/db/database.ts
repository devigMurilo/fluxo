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
  `);
}

export { webStorage };
