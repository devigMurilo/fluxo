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
