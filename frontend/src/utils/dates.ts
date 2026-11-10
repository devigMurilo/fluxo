export const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export const MONTH_NAMES_SHORT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

/**
 * Retorna o mês atual no formato "AAAA-MM".
 * Ex: "2026-11"
 */
export function getCurrentMonthKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Formata uma chave "AAAA-MM" para exibição amigável.
 * Ex: "2026-11" -> "Novembro de 2026"
 */
export function formatMonthHeader(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const monthIndex = parseInt(monthStr, 10) - 1;
  const monthName = MONTH_NAMES[monthIndex] || '';
  return `${monthName} de ${yearStr}`;
}

/**
 * Retorna a chave do mês anterior ou seguinte dado um "AAAA-MM" e um delta (-1, +1).
 */
export function offsetMonthKey(monthKey: string, delta: number): string {
  const [yearStr, monthStr] = monthKey.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10) - 1 + delta;

  const date = new Date(year, month, 1);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
  return `${nextYear}-${nextMonth}`;
}

/**
 * Retorna a data de hoje em formato ISO simples: "AAAA-MM-DD".
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formata data "AAAA-MM-DD" para "DD/MM/AAAA" ou "DD de Mês".
 */
export function formatDateBR(dateStr: string, short = false): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;

  const [year, month, day] = parts;
  if (short) {
    const monthIndex = parseInt(month, 10) - 1;
    return `${day} ${MONTH_NAMES_SHORT[monthIndex] || ''}`;
  }

  return `${day}/${month}/${year}`;
}

/**
 * Retorna o número da semana ISO (1 a 53) e o ano da semana.
 * Ex: "2026-W45"
 */
export function getWeekKey(dateInput?: Date | string): string {
  const d = dateInput ? (typeof dateInput === 'string' ? new Date(dateInput + 'T12:00:00') : new Date(dateInput)) : new Date();
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7; // Segunda = 0, Domingo = 6
  target.setDate(target.getDate() - dayNr + 3); // Quinta-feira da mesma semana
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  const year = d.getFullYear();
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Retorna a chave de período apropriada para a meta:
 * - 'daily': 'AAAA-MM-DD'
 * - 'weekly': 'AAAA-Wxx'
 * - 'monthly': 'AAAA-MM'
 * - 'yearly': 'AAAA'
 */
export function getPeriodKey(
  period: 'daily' | 'weekly' | 'monthly' | 'yearly',
  dateInput?: Date | string
): string {
  const d = dateInput ? (typeof dateInput === 'string' ? new Date(dateInput + 'T12:00:00') : new Date(dateInput)) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  switch (period) {
    case 'daily':
      return `${year}-${month}-${day}`;
    case 'weekly':
      return getWeekKey(d);
    case 'monthly':
      return `${year}-${month}`;
    case 'yearly':
      return `${year}`;
  }
}

/**
 * Formata um rótulo legível para o período da meta.
 */
export function formatPeriodLabel(period: 'daily' | 'weekly' | 'monthly' | 'yearly'): string {
  switch (period) {
    case 'daily':
      return 'Diária';
    case 'weekly':
      return 'Semanal';
    case 'monthly':
      return 'Mensal';
    case 'yearly':
      return 'Anual';
  }
}

/**
 * Retorna a hora atual ou formata hora "HH:mm".
 */
export function formatTimeBR(timeStr?: string | null): string {
  if (!timeStr) return '';
  return timeStr.slice(0, 5);
}

/**
 * Retorna o nome do dia da semana (ex: 'Segunda-feira', 'Hoje', 'Amanhã').
 */
export function getDayLabel(dateStr: string): string {
  const today = getTodayDateString();
  if (dateStr === today) return 'Hoje';

  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0);

  const daysOfWeek = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
  ];
  return daysOfWeek[date.getDay()] || '';
}

