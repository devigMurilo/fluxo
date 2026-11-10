/**
 * autoCategorizer.ts
 * Motor inteligente de categorização automática para extratos bancários brasileiros.
 * Analisa descrições de transações (Pix, TED, cartão de débito/crédito) e associa à melhor categoria.
 */

export interface SimpleCategory {
  id: number;
  name: string;
}

// Dicionário de termos associados a categorias comuns no Brasil
const KEYWORD_RULES: Record<string, string[]> = {
  alimentação: [
    'ifood', 'rappi', 'uber eats', 'aiqfome', 'mcdonald', 'burger king', 'subway',
    'habib', 'outback', 'giraffas', 'bobs', 'restaurante', 'padaria', 'panificadora',
    'lanchonete', 'pizzaria', 'churrascaria', 'bar', 'boteco', 'cafe', 'cafeteria',
    'starbucks', 'acai', 'sorveteria', 'mercado', 'supermercado', 'carrefour',
    'pao de acucar', 'extra', 'atacadao', 'assai', 'hortifruti', 'sacolao', 'acougue',
    'peixaria', 'mercearia', 'quitanda', 'confeitaria', 'delivery'
  ],
  transporte: [
    'uber', '99app', '99 pop', '99 taxi', 'taxi', 'indriver', 'posto', 'combustivel',
    'gasolina', 'etanol', 'shell', 'ipiranga', 'br distribuidora', 'auto posto',
    'petrobras', 'ale combustiveis', 'pedagio', 'sem parar', 'conectcar', 'veloe',
    'estacionamento', 'estapar', 'zona azul', 'metro', 'cptm', 'onibus', 'bilhete unico',
    'passagem', 'voegol', 'latam', 'azul linhas', 'rodoviaria', 'oficina', 'mecanica',
    'borracharia', 'lavajato', 'lava rapido'
  ],
  saúde: [
    'farmacia', 'drogaria', 'drogasil', 'raia', 'droga raia', 'pague menos',
    'drogaria sao paulo', 'panvel', 'araujo', 'ultrafarma', 'consulta', 'medico',
    'clinica', 'hospital', 'dentista', 'odontologia', 'odonto', 'laboratorio',
    'fleury', 'lavoisier', 'dasa', 'exame', 'psicologo', 'terapia', 'fisioterapia',
    'oticas', 'unimed', 'bradesco saude', 'sulamerica', 'amil', 'academia', 'smart fit',
    'bluefit', 'bodytech'
  ],
  moradia: [
    'aluguel', 'condominio', 'iptu', 'sabesp', 'sanepar', 'copasa', 'saneago',
    'compesa', 'caesb', 'agua', 'enel', 'cpfl', 'copel', 'cemig', 'eletropaulo',
    'energisa', 'luz', 'energia', 'claro', 'vivo', 'tim', 'oi', 'fibra', 'net servicos',
    'gas', 'ultragaz', 'liquigas', 'supergasbras', 'nacional gas', 'leroy merlin',
    'telhanorte', 'c&c', 'mobly', 'tok&stok', 'marceneiro', 'pedreiro', 'eletricista'
  ],
  lazer: [
    'netflix', 'spotify', 'amazon prime', 'disney', 'hbo', 'max', 'youtube premium',
    'deezer', 'apple music', 'globo play', 'cinema', 'cinemark', 'cinepolis', 'kinoplex',
    'ingresso', 'sympla', 'eventim', 'steam', 'playstation', 'xbox', 'nintendo',
    'riot games', 'epic games', 'jogos', 'blizzard', 'show', 'teatro', 'parque',
    'viagem', 'hotel', 'airbnb', 'booking'
  ],
  educação: [
    'curso', 'escola', 'colegio', 'faculdade', 'universidade', 'pos graduacao',
    'udemy', 'alura', 'coursera', 'edx', 'domestika', 'livro', 'livraria', 'saraiva',
    'leitura', 'papelaria', 'kalunga', 'material escolar', 'idiomas', 'wizard',
    'cna', 'ccaa', 'cultura inglesa'
  ],
  compras: [
    'amazon', 'mercado livre', 'shopee', 'shein', 'magalu', 'magazine luiza',
    'americanas', 'casas bahia', 'ponto frio', 'aliexpress', 'zara', 'renner',
    'c&a', 'riachuelo', 'centauro', 'decathlon', 'dafiti', 'netshoes', 'zattini',
    'lojas americanas', 'lojas', 'shopping'
  ],
  investimentos: [
    'nu invest', 'inter dtvm', 'xp investimentos', 'rico', 'clear', 'btg pactual',
    'orama', 'easynvest', 'tesouro direto', 'cripto', 'binance', 'mercado bitcoin',
    'foxbit', 'b3', 'aporte'
  ],
  salário: [
    'salario', 'remuneracao', 'pro-labore', 'prolabore', 'pagamento folha',
    'adiantamento salarial', '13 salario', 'decimo terceiro', 'bonificacao',
    'comissao', 'ferias', 'restituicao irpf'
  ]
};

/**
 * Normaliza um texto removendo acentos e caracteres especiais
 */
function normalizeString(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
}

/**
 * Identifica a melhor categoria correspondente para uma descrição de transação
 * @param description Texto da transação bancária (ex: "iFood *Restaurante", "Posto Ipiranga", "Pix Recebido - Empresa")
 * @param type 'receita' ou 'despesa'
 * @param availableCategories Lista de categorias existentes no banco de dados do usuário
 * @returns ID da categoria sugerida ou null se nenhuma regra casar
 */
export function suggestCategory(
  description: string,
  type: 'receita' | 'despesa',
  availableCategories: SimpleCategory[]
): SimpleCategory | null {
  if (!description || availableCategories.length === 0) return null;

  const normalizedDesc = normalizeString(description);

  // Se for receita e contiver indício de salário/renda
  if (type === 'receita') {
    const salaryCategory = availableCategories.find((c) => {
      const name = normalizeString(c.name);
      return name.includes('salario') || name.includes('renda') || name.includes('receita');
    });

    if (salaryCategory) {
      const salaryRules = KEYWORD_RULES['salário'] || KEYWORD_RULES['salario'] || [];
      for (const kw of salaryRules) {
        if (normalizedDesc.includes(kw)) {
          return salaryCategory;
        }
      }
    }
  }

  // Percorre as regras de palavras-chave
  for (const [groupName, keywords] of Object.entries(KEYWORD_RULES)) {
    const normGroup = normalizeString(groupName);
    // Procura uma categoria cadastrada pelo usuário cujo nome corresponda ao grupo
    const matchedCategory = availableCategories.find((c) => {
      const catNorm = normalizeString(c.name);
      return catNorm.includes(normGroup) || normGroup.includes(catNorm);
    });

    if (!matchedCategory) continue;

    // Verifica se alguma palavra-chave está na descrição
    for (const keyword of keywords) {
      // Teste com limites de palavra ou inclusão
      if (normalizedDesc.includes(keyword)) {
        return matchedCategory;
      }
    }
  }

  // Tenta correspondência direta com o nome das categorias do usuário
  for (const category of availableCategories) {
    const catNameNorm = normalizeString(category.name);
    if (catNameNorm.length >= 4 && normalizedDesc.includes(catNameNorm)) {
      return category;
    }
  }

  // Se não encontrar nenhuma regra específica, tenta categoria "Outros" ou "Geral"
  const defaultCategory = availableCategories.find((c) => {
    const catNorm = normalizeString(c.name);
    return catNorm.includes('outro') || catNorm.includes('geral') || catNorm.includes('diversos');
  });

  return defaultCategory || null;
}
