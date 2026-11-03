import { escapeRegex, normChars } from '../common/texto';

/* NER por dicionário + expressões regulares (porte de frontend/js/ner.js).
   ponytail: dicionário/regex, sem modelo estatístico; trocar por spaCy treinado
   no domínio quando houver corpus anotado de laudos. */

export type TipoDicionario = 'PRAGA' | 'DOENCA' | 'CULTURA';
export type TipoEntidade = TipoDicionario | 'DATA' | 'TALHAO' | 'LAUDO' | 'AREA';
export type Dicionario = Record<TipoDicionario, string[]>;

export interface Entidade {
  type: TipoEntidade;
  start: number;
  end: number;
  text: string;
  key: string;
}

export interface DataEncontrada {
  texto: string;
  data: string; // YYYY-MM-DD
  inspecao: boolean;
}

export interface ResultadoNer {
  items: Entidade[];
  pragas: string[];
  doencas: string[];
  culturas: string[];
  talhoes: string[];
  datas: DataEncontrada[];
  ultimaInspecao: string | null; // YYYY-MM-DD
  laudoNumero: string | null;
}

const PADROES: [TipoEntidade, RegExp][] = [
  ['DATA', /\b\d{2}\/\d{2}\/\d{4}\b/g],
  ['TALHAO', /talh[ãa]o\s*\d+/gi],
  ['LAUDO', /laudo\s+fitossanit[áa]rio\s+n[ºo°]?\s*[\d/]+/gi],
  ['AREA', /\b\d+(?:[.,]\d+)?\s*ha\b/gi],
];
const PREFIXO_LAUDO = /laudo\s+fitossanit[áa]rio\s+n[ºo°]?\s*/i;

const dataIso = (br: string) => br.split('/').reverse().join('-');

export function extractEntities(text: string, dict: Dicionario): ResultadoNer {
  const norm = normChars(text);
  const found: Entidade[] = [];

  // 1) Dicionários — hífen do termo aceita espaço também
  for (const [type, terms] of Object.entries(dict) as [TipoDicionario, string[]][]) {
    for (const term of terms) {
      const pattern = escapeRegex(normChars(term)).replace(/-/g, '[-\\s]');
      const re = new RegExp(`(?<![a-z])${pattern}(?![a-z])`, 'g');
      for (const m of norm.matchAll(re)) {
        const start = m.index;
        const end = start + m[0].length;
        found.push({ type, start, end, text: text.slice(start, end), key: term });
      }
    }
  }

  // 2) Padrões (datas, talhões, nº do laudo, áreas)
  for (const [type, re] of PADROES) {
    for (const m of text.matchAll(re)) {
      found.push({ type, start: m.index, end: m.index + m[0].length, text: m[0], key: m[0] });
    }
  }

  // 3) Remove sobreposições (mantém a entidade mais longa que começa primeiro)
  found.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
  const items: Entidade[] = [];
  let lastEnd = -1;
  for (const e of found) {
    if (e.start >= lastEnd) {
      items.push(e);
      lastEnd = e.end;
    }
  }

  // 4) Resumo estruturado consumido pelo ExportBot
  const uniq = (type: TipoEntidade) => [
    ...new Set(items.filter((e) => e.type === type).map((e) => e.key.toLowerCase())),
  ];
  const datas = items
    .filter((e) => e.type === 'DATA')
    .map((e) => ({
      texto: e.text,
      data: dataIso(e.text),
      inspecao: norm.slice(Math.max(0, e.start - 70), e.start).includes('inspe'),
    }));
  const inspecoes = datas.filter((d) => d.inspecao).map((d) => d.data).sort();
  const laudo = items.find((e) => e.type === 'LAUDO');

  return {
    items,
    pragas: uniq('PRAGA'),
    doencas: uniq('DOENCA'),
    culturas: uniq('CULTURA'),
    talhoes: uniq('TALHAO'),
    datas,
    ultimaInspecao: inspecoes.at(-1) ?? null,
    laudoNumero: laudo ? laudo.text.replace(PREFIXO_LAUDO, '') : null,
  };
}
