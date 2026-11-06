/**
 * Formata um valor em centavos para a representação em Real (BRL).
 * Ex: 125050 -> "R$ 1.250,50"
 */
export function centsToBRL(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || isNaN(cents)) {
    return 'R$ 0,00';
  }

  const isNegative = cents < 0;
  const absValue = Math.abs(cents) / 100;

  const formatted = absValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Converte uma string digitada pelo usuário em centavos (inteiro).
 * Ex: "1250,50" -> 125050
 * Ex: "R$ 1.250,50" -> 125050
 * Ex: "50" -> 5000 (ou se for digitação de centavos)
 */
export function parseBRLToCents(text: string): number {
  if (!text) return 0;

  // Extrai apenas dígitos
  const digits = text.replace(/\D/g, '');
  if (!digits) return 0;

  return parseInt(digits, 10);
}

/**
 * Formata um número de centavos para exibição em input mascarado.
 * Conforme o usuário digita números, divide por 100.
 * Ex: 1 -> "R$ 0,01", 12 -> "R$ 0,12", 123 -> "R$ 1,23"
 */
export function formatCentsForInput(cents: number): string {
  const value = (cents / 100).toFixed(2);
  const parts = value.split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimalPart = parts[1];
  return `R$ ${integerPart},${decimalPart}`;
}
