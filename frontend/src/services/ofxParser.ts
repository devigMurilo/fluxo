/**
 * ofxParser.ts
 * Parser universal e robusto para extratos bancários em formato OFX (1.x SGML e 2.x XML) e CSV.
 * Otimizado especialmente para extratos do Nubank e Banco Inter.
 */

export interface ParsedTransaction {
  id: string; // FITID único do banco ou hash
  date: string; // 'YYYY-MM-DD'
  amount: number; // valor em centavos (positivo)
  type: 'receita' | 'despesa';
  description: string;
  memo?: string;
  bankName?: string;
}

export interface BankStatementResult {
  bankName: string;
  accountType?: string;
  currency?: string;
  startDate?: string;
  endDate?: string;
  transactions: ParsedTransaction[];
}

/**
 * Remove acentos, tags e espaços extras de um texto
 */
function cleanText(text: string): string {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Converte datas do formato OFX (ex: 20261105120000[-03:EST] ou 20261105) para 'YYYY-MM-DD'
 */
function parseOfxDate(rawDate: string): string {
  if (!rawDate) {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  const clean = rawDate.trim();
  // Formato YYYYMMDD
  if (clean.length >= 8 && /^\d{8}/.test(clean)) {
    const year = clean.substring(0, 4);
    const month = clean.substring(4, 6);
    const day = clean.substring(6, 8);
    return `${year}-${month}-${day}`;
  }

  // Se já estiver em formato YYYY-MM-DD ou DD/MM/YYYY
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    return clean.substring(0, 10);
  }

  if (/^\d{2}\/\d{2}\/\d{4}/.test(clean)) {
    const [d, m, y] = clean.split('/');
    return `${y}-${m}-${d}`;
  }

  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * Extrai valor de uma tag OFX considerando tags fechadas ou abertas (SGML padrão brasileiro)
 */
function extractTagValue(block: string, tag: string): string | null {
  // Tenta tag fechada primeiro: <TAG>valor</TAG>
  const closedRegex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const closedMatch = block.match(closedRegex);
  if (closedMatch) {
    return cleanText(closedMatch[1]);
  }

  // Tenta formato SGML (sem fechamento): <TAG>valor\n ou <TAG>valor<OUTRA_TAG>
  const openRegex = new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i');
  const openMatch = block.match(openRegex);
  if (openMatch) {
    return cleanText(openMatch[1]);
  }

  return null;
}

/**
 * Detecta o banco pelo código bancário ou nome no OFX
 */
function detectBankName(content: string): string {
  const bankId = extractTagValue(content, 'BANKID');
  const org = extractTagValue(content, 'ORG');
  const fid = extractTagValue(content, 'FID');

  const combined = `${bankId || ''} ${org || ''} ${fid || ''} ${content.slice(0, 1500)}`.toLowerCase();

  if (combined.includes('nubank') || bankId === '260' || combined.includes('nu pagamentos')) {
    return 'Nubank';
  }
  if (combined.includes('inter') || bankId === '077' || bankId === '77') {
    return 'Banco Inter';
  }
  if (combined.includes('itau') || combined.includes('itaú') || bankId === '341') {
    return 'Itaú';
  }
  if (combined.includes('bradesco') || bankId === '237') {
    return 'Bradesco';
  }
  if (combined.includes('santander') || bankId === '033') {
    return 'Santander';
  }
  if (combined.includes('brasil') || bankId === '001') {
    return 'Banco do Brasil';
  }
  if (combined.includes('caixa') || bankId === '104') {
    return 'Caixa Econômica';
  }
  if (combined.includes('c6') || bankId === '336') {
    return 'C6 Bank';
  }

  return org || 'Extrato Bancário';
}

/**
 * Parser para formato OFX (Open Financial Exchange)
 */
export function parseOFX(ofxContent: string): BankStatementResult {
  const bankName = detectBankName(ofxContent);
  const transactions: ParsedTransaction[] = [];

  // Localiza todos os blocos de transação <STMTTRN>...</STMTTRN> ou <STMTTRN> até o próximo <STMTTRN> / </BANKTRANLIST>
  const transactionBlocks: string[] = [];

  const closedMatches = ofxContent.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi);
  if (closedMatches && closedMatches.length > 0) {
    transactionBlocks.push(...closedMatches);
  } else {
    // Formato SGML sem tag de fechamento </STMTTRN>
    const parts = ofxContent.split(/<STMTTRN>/i);
    // Descarta o primeiro pedaço antes do primeiro <STMTTRN>
    for (let i = 1; i < parts.length; i++) {
      // Pega o conteúdo até o próximo fechamento de lista ou tag de bloco
      const block = parts[i].split(/<\/BANKTRANLIST>|<\/CCSTMTRS>|<\/STMTRS>/i)[0];
      transactionBlocks.push(block);
    }
  }

  for (let i = 0; i < transactionBlocks.length; i++) {
    const block = transactionBlocks[i];

    const trnType = extractTagValue(block, 'TRNTYPE')?.toUpperCase();
    const dtPosted = extractTagValue(block, 'DTPOSTED') || '';
    const trnAmtRaw = extractTagValue(block, 'TRNAMT') || '0';
    const fitid = extractTagValue(block, 'FITID') || `ofx-${Date.now()}-${i}`;
    const memo = extractTagValue(block, 'MEMO');
    const name = extractTagValue(block, 'NAME');

    // Limpa e normaliza o valor numérico
    // Aceita tanto vírgula quanto ponto decimal
    const normalizedAmtStr = trnAmtRaw.replace(/\s/g, '').replace(',', '.');
    const numericAmt = parseFloat(normalizedAmtStr);

    if (isNaN(numericAmt)) continue;

    // Determina se é despesa ou receita
    const isExpense = numericAmt < 0 || trnType === 'DEBIT' || trnType === 'PAYMENT';
    const amountInCents = Math.round(Math.abs(numericAmt) * 100);

    if (amountInCents === 0) continue;

    // Define melhor descrição
    let description = memo || name || 'Transação Bancária';
    // Remove prefixos comuns de extratos brasileiros
    description = description
      .replace(/^PAG\*/i, '')
      .replace(/^COMPRA\s*(NO\s*)?(DEBITO|CREDITO)\s*-?\s*/i, '')
      .replace(/^PIX\s*(ENVIADO|RECEBIDO)\s*-?\s*/i, 'Pix: ')
      .replace(/^TRANSFERENCIA\s*(ENVIADA|RECEBIDA)\s*-?\s*/i, 'TED: ')
      .trim();

    transactions.push({
      id: fitid,
      date: parseOfxDate(dtPosted),
      amount: amountInCents,
      type: isExpense ? 'despesa' : 'receita',
      description: description || 'Transação',
      memo: memo || undefined,
      bankName,
    });
  }

  return {
    bankName,
    transactions,
  };
}

/**
 * Parser para formato CSV (Extratos do Nubank e Banco Inter em CSV)
 */
export function parseCSV(csvContent: string): BankStatementResult {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { bankName: 'Extrato CSV', transactions: [] };
  }

  // Detecta delimitador (, ou ;)
  const firstLine = lines[0];
  const delimiter = firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';

  // Cabeçalhos normalizados
  const headers = firstLine.split(delimiter).map((h) => h.toLowerCase().trim().replace(/["']/g, ''));

  // Identifica índices das colunas
  const dateIndex = headers.findIndex((h) => h.includes('data') || h.includes('date'));
  const amountIndex = headers.findIndex((h) => h.includes('valor') || h.includes('amount'));
  const descIndex = headers.findIndex(
    (h) => h.includes('descri') || h.includes('título') || h.includes('titulo') || h.includes('historico') || h.includes('title')
  );
  const idIndex = headers.findIndex((h) => h.includes('id') || h.includes('identificador'));

  // Detecta banco pelo cabeçalho
  let bankName = 'Extrato CSV';
  const fullHeader = headers.join(' ');
  if (fullHeader.includes('identificador') || fullHeader.includes('title') || fullHeader.includes('category')) {
    bankName = 'Nubank';
  } else if (fullHeader.includes('historico') || fullHeader.includes('saldo')) {
    bankName = 'Banco Inter';
  }

  const transactions: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Split simples respeitando possíveis campos vazios
    const columns = line.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));

    if (columns.length <= 1) continue;

    const rawDate = dateIndex >= 0 ? columns[dateIndex] : columns[0];
    const rawAmount = amountIndex >= 0 ? columns[amountIndex] : '';
    const rawDesc = descIndex >= 0 ? columns[descIndex] : (columns[1] || 'Lançamento');
    const rawId = idIndex >= 0 ? columns[idIndex] : `csv-${i}-${rawDate}`;

    if (!rawAmount) continue;

    // Converte valor monetário brasileiro ou americano: " -1.234,56" ou "-1234.56"
    let cleanAmt = rawAmount
      .replace(/[R$\s]/g, '')
      .replace(/\.(?=\d{3}(?:[.,]|$))/g, '') // remove pontos de milhar
      .replace(',', '.'); // troca vírgula decimal por ponto

    const numericAmt = parseFloat(cleanAmt);
    if (isNaN(numericAmt) || numericAmt === 0) continue;

    const isExpense = numericAmt < 0;
    const amountInCents = Math.round(Math.abs(numericAmt) * 100);

    transactions.push({
      id: rawId || `csv-${i}-${Date.now()}`,
      date: parseOfxDate(rawDate),
      amount: amountInCents,
      type: isExpense ? 'despesa' : 'receita',
      description: cleanText(rawDesc) || 'Transação',
      bankName,
    });
  }

  return {
    bankName,
    transactions,
  };
}

/**
 * Função unificada que detecta e converte arquivo para transações
 */
export function parseBankStatement(fileContent: string, fileName?: string): BankStatementResult {
  const lowerName = (fileName || '').toLowerCase();
  const trimmed = fileContent.trim();

  if (lowerName.endsWith('.csv') || (!trimmed.includes('<OFX>') && !trimmed.includes('OFXHEADER') && trimmed.includes(','))) {
    return parseCSV(fileContent);
  }

  return parseOFX(fileContent);
}
