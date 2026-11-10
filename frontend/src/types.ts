/* Formatos devolvidos pela API NestJS (espelham os tipos do backend). */

export type Status = 'ok' | 'pendente' | 'risco';
export type Papel = 'ADMIN' | 'PRODUTOR';
export type Lang = 'pt' | 'en';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
}
export interface Sessao {
  token: string;
  usuario: Usuario;
}

// ---- Laudos e NER
export type TipoDicionario = 'PRAGA' | 'DOENCA' | 'CULTURA';
export type TipoEntidade = TipoDicionario | 'DATA' | 'TALHAO' | 'LAUDO' | 'AREA' | 'LOCAL' | 'PROPRIEDADE';

export interface Entidade {
  type: TipoEntidade;
  start: number;
  end: number;
  text: string;
  key: string;
  aproximado?: boolean;
  negada?: boolean;
  talhao?: string;
}
export interface TalhaoDetalhe {
  talhao: string;
  cultura: string | null;
  areaHa: number | null;
  pragas: string[];
  doencas: string[];
  inspecao: string | null;
}
export interface ResultadoNer {
  items: Entidade[];
  pragas: string[];
  doencas: string[];
  culturas: string[];
  talhoes: string[];
  negadas?: string[];
  ultimaInspecao: string | null;
  laudoNumero: string | null;
  propriedade?: string | null;
  local?: string | null;
  talhoesDetalhe?: TalhaoDetalhe[];
  estatisticas?: { caracteres: number; tokens: number; sentencas: number };
}
export interface ResumoLaudo {
  entidades: number;
  culturas: string[];
  pragas: string[];
  doencas: string[];
  talhoes: number;
  ultimaInspecao: string | null;
  propriedade: string | null;
  local: string | null;
}
export interface LaudoItem {
  id: string;
  titulo: string | null;
  origem: string;
  numero: string | null;
  createdAt: string;
  avaliacoes?: number;
  resumo: ResumoLaudo;
}
export interface Laudo {
  id: string;
  titulo: string | null;
  origem: string;
  texto: string;
  numero: string | null;
  createdAt: string;
  entidades: ResultadoNer;
}

// ---- Checklists
export interface ItemChecklist {
  id: string;
  label: string;
  status: Status;
  note: string;
  doc?: string;
}
export interface Resumo {
  ok: number;
  pendente: number;
  risco: number;
  score: number;
  situacao: Status;
}

// ---- ExportBot
export interface Nomeado {
  id: string;
  nome: string;
  nomeEn: string;
}
export interface AvaliacaoExport {
  items: ItemChecklist[];
  dias: number | null;
  resumo: Resumo;
}
export interface AvaliacaoExportSalva {
  id: string;
  createdAt: string;
  embarque: string | null;
  docsConfirmados: string[];
  laudoId: string;
  destinoId: string;
  culturaId: string;
  destino: Nomeado;
  cultura: Nomeado;
  laudo: { id: string; numero: string | null; titulo: string | null; createdAt?: string; resumo?: ResumoLaudo };
  resumo?: Resumo; // nas listas
  resultado?: Record<Lang, AvaliacaoExport>; // no detalhe
}
export interface Regra {
  id: number;
  destinoId: string;
  culturaId: string;
  maxDias: number;
  bloqueios: string[];
  docs: string[];
  destino: Nomeado;
  cultura: Nomeado;
}

// ---- CarbonBot
export interface Propriedade {
  bioma: string;
  area: number;
  rl: number;
  car: boolean;
  desmatamento: boolean;
  praticas: string[];
  mrv: boolean;
  padrao: string;
}
export interface Estimativa {
  areaProdutivaHa: number;
  praticaBase: { id: string; nome: string; fatorTco2eHaAno: number } | null;
  potencialTco2eAno: number;
  bufferPct: number;
  creditosAno: number;
}
export interface AvaliacaoCarbono {
  items: ItemChecklist[];
  resumo: Resumo;
  estimativa: Estimativa;
}
export interface AvaliacaoCarbonoSalva {
  id: string;
  nome: string;
  createdAt: string;
  resumo?: Resumo; // nas listas
  creditosAno?: number; // nas listas
  dados?: Propriedade & { biomaNome: string; praticasNomes: string[] }; // no detalhe
  resultado?: AvaliacaoCarbono; // no detalhe
}

// ---- Chat
export interface AnaliseChat {
  intencao: string | null;
  confianca: number;
  radicais: string[];
  ranking: { intencao: string; score: number }[];
  entidades: string[];
}
export interface RespostaChat {
  texto: string;
  itens?: ItemChecklist[];
  analise: AnaliseChat;
  contexto?: { destino: string; cultura: string };
}

// ---- Catálogos
export interface Bioma {
  id: string;
  nome: string;
  reservaLegalMin: number;
}
export interface Pratica {
  id: string;
  nome: string;
  fatorTco2eHaAno: number;
}
export interface Referencias {
  destinos: Nomeado[];
  culturas: Nomeado[];
  biomas: Bioma[];
  praticas: Pratica[];
  padroes: string[];
}
export interface Termo {
  id: number;
  tipo: TipoDicionario;
  termo: string;
}

export interface Painel {
  totais: { laudos: number; exportacoes: number; carbono: number };
  situacoes: Record<Status, number>;
  ocorrencias: { termo: string; tipo: 'PRAGA' | 'DOENCA'; laudos: number }[];
  recentes: { laudos: LaudoItem[]; exportacoes: AvaliacaoExportSalva[]; carbono: AvaliacaoCarbonoSalva[] };
}
