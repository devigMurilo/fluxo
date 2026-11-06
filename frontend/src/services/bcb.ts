import axios from 'axios';

export interface BcbRates {
  selic: number;
  cdi: number;
  poupanca: number;
  date: string;
  isFallback: boolean;
}

export interface EducationalCard {
  id: string;
  title: string;
  category: string;
  risk: 'Muito Baixo' | 'Baixo' | 'Médio' | 'Alto';
  riskColor: string;
  liquidity: string;
  typicalYield: string;
  description: string;
  pros: string[];
  cons: string[];
}

// Valores de contingência caso não haja conexão ou a API do BCB oscile
const FALLBACK_RATES: BcbRates = {
  selic: 11.25,
  cdi: 11.15,
  poupanca: 6.17,
  date: 'Taxas vigentes de referência',
  isFallback: true,
};

export async function fetchBcbRates(): Promise<BcbRates> {
  try {
    const selicPromise = axios.get(
      'https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json',
      { timeout: 5000 }
    );
    const cdiPromise = axios.get(
      'https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json',
      { timeout: 5000 }
    );

    const [selicRes, cdiRes] = await Promise.allSettled([selicPromise, cdiPromise]);

    let selicValue = FALLBACK_RATES.selic;
    let cdiValue = FALLBACK_RATES.cdi;
    let rateDate = FALLBACK_RATES.date;

    if (selicRes.status === 'fulfilled' && selicRes.value.data?.[0]) {
      const val = parseFloat(selicRes.value.data[0].valor);
      if (!isNaN(val)) {
        selicValue = val;
        rateDate = selicRes.value.data[0].data || rateDate;
      }
    }

    if (cdiRes.status === 'fulfilled' && cdiRes.value.data?.[0]) {
      const val = parseFloat(cdiRes.value.data[0].valor);
      if (!isNaN(val)) {
        cdiValue = val;
      }
    } else {
      // CDI geralmente fica 0.10% abaixo da Selic
      cdiValue = parseFloat((selicValue - 0.1).toFixed(2));
    }

    // Regra da Poupança: Se Selic > 8.5%, rende 0.5% a.m. + TR (~6.17% a.a.)
    const poupancaValue = selicValue > 8.5 ? 6.17 : parseFloat((selicValue * 0.7).toFixed(2));

    return {
      selic: selicValue,
      cdi: cdiValue,
      poupanca: poupancaValue,
      date: rateDate,
      isFallback: false,
    };
  } catch (error) {
    console.log('Utilizando taxas de contingência do BCB (offline ou timeout):', error);
    return FALLBACK_RATES;
  }
}

export const EDUCATIONAL_CARDS: EducationalCard[] = [
  {
    id: 'tesouro-selic',
    title: 'Tesouro Selic',
    category: 'Renda Fixa Pública',
    risk: 'Muito Baixo',
    riskColor: '#10B981',
    liquidity: 'D+1 (Resgate em 1 dia útil)',
    typicalYield: '100% da Taxa Selic',
    description:
      'Título público emitido pelo Governo Federal considerado o investimento mais seguro do país. Ideal para reserva de emergência e objetivos de curto prazo.',
    pros: ['Segurança máxima garantida pelo Tesouro Nacional', 'Baixa volatilidade diária', 'Liquidez diária'],
    cons: ['Cobrança de IOF se resgatar em menos de 30 dias', 'Alíquota regressiva de IR (22,5% a 15%)'],
  },
  {
    id: 'cdb',
    title: 'CDB (Certificado de Depósito Bancário)',
    category: 'Renda Fixa Privada',
    risk: 'Baixo',
    riskColor: '#3B82F6',
    liquidity: 'Diária ou no vencimento',
    typicalYield: '100% a 120% do CDI',
    description:
      'Você empresta dinheiro ao banco e ele remunera você com juros. É protegido pelo Fundo Garantidor de Créditos (FGC) até R$ 250 mil por CPF/instituição.',
    pros: ['Proteção do FGC até R$ 250.000', 'Excelente rendimento para prazos médios', 'Opções com liquidez diária'],
    cons: ['CDBs com rentabilidades mais altas travam o dinheiro até o vencimento', 'Tributação regressiva de IR'],
  },
  {
    id: 'poupanca',
    title: 'Caderneta de Poupança',
    category: 'Renda Fixa Tradicional',
    risk: 'Muito Baixo',
    riskColor: '#10B981',
    liquidity: 'Imediata (com regra da data de aniversário)',
    typicalYield: '6,17% a.a. + TR (quando Selic > 8,5%)',
    description:
      'A aplicação mais popular do Brasil. É isenta de Imposto de Renda para pessoas físicas, porém historicamente rende menos que Tesouro Selic e CDBs com liquidez.',
    pros: ['Isenção total de Imposto de Renda', 'Fácil de movimentar', 'Garantida pelo FGC'],
    cons: ['Rendimento só é creditado no aniversário mensal', 'Geralmente perde para a inflação real'],
  },
  {
    id: 'fundos-di',
    title: 'Fundos DI / Renda Fixa',
    category: 'Fundos de Investimento',
    risk: 'Baixo',
    riskColor: '#8B5CF6',
    liquidity: 'D+0 a D+1',
    typicalYield: '95% a 105% do CDI',
    description:
      'Carteiras geridas por profissionais que compram títulos públicos e bancários de curto prazo. Fáceis de aplicar em corretoras e bancos digitais.',
    pros: ['Gestão profissional', 'Diversificação em múltiplos papéis', 'Fácil aplicação'],
    cons: ['Taxa de administração pode corroer rendimento', 'Come-cotas (antecipação semestral de IR)'],
  },
];
