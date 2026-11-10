import { normChars } from '../common/texto';
import { parecidas, radical, Token, tokenizar } from '../pln/pln';

/* NER de laudos fitossanitários, sem modelo treinado:
   1) dicionário (pragas, doenças, culturas) casado token a token, aceitando flexão
      (mesmo radical) e erro de digitação (distância de edição);
   2) padrões (datas, talhões, nº do laudo, áreas, município, propriedade);
   3) negação ("ausência de…", "não foi constatada…") e talhão de cada ocorrência.
   ponytail: regras em vez de modelo estatístico; trocar por um modelo treinado
   (ex.: spaCy) quando houver corpus anotado de laudos. */

export type TipoDicionario = 'PRAGA' | 'DOENCA' | 'CULTURA';
export type TipoEntidade = TipoDicionario | 'DATA' | 'TALHAO' | 'LAUDO' | 'AREA' | 'LOCAL' | 'PROPRIEDADE';
export type Dicionario = Record<TipoDicionario, string[]>;

export interface Entidade {
  type: TipoEntidade;
  start: number;
  end: number;
  text: string;
  /** Forma canônica: termo do dicionário, data ISO, "talhão 03"… */
  key: string;
  /** Casou por radical ou por distância de edição, não literalmente. */
  aproximado?: true;
  /** Praga/doença citada como ausente. */
  negada?: true;
  talhao?: string;
}

export interface DataEncontrada {
  texto: string;
  data: string; // YYYY-MM-DD
  inspecao: boolean;
  talhao?: string;
}

export interface TalhaoDetalhe {
  talhao: string;
  cultura: string | null;
  areaHa: number | null;
  pragas: string[];
  doencas: string[];
  inspecao: string | null; // YYYY-MM-DD
}

export interface ResultadoNer {
  items: Entidade[];
  pragas: string[];
  doencas: string[];
  culturas: string[];
  talhoes: string[];
  /** Pragas/doenças citadas apenas como ausentes. */
  negadas: string[];
  datas: DataEncontrada[];
  ultimaInspecao: string | null; // YYYY-MM-DD
  laudoNumero: string | null;
  propriedade: string | null;
  local: string | null;
  talhoesDetalhe: TalhaoDetalhe[];
  estatisticas: { caracteres: number; tokens: number; sentencas: number };
}

const MESES = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const RE_DATA = /\b(\d{2})[/.-](\d{2})[/.-](\d{4})\b/g;
// aplicado sobre o texto normalizado (sem acento, minúsculo)
const RE_DATA_EXTENSO = new RegExp(`\\b(\\d{1,2})[ºo°]?\\s+de\\s+(${MESES.join('|')})\\s+de\\s+(\\d{4})\\b`, 'g');
const RE_TALHAO = /talh[ãa]o\s*(?:n[ºo°.]{0,2}\s*)?(\d+[a-z]?)\b/gi;
const RE_LAUDO = /laudo(?:\s+fitossanit[áa]rio\s+n[ºo°.]{0,2}|\s+(?:n[º°]|n\.|no\.|n[úu]mero))\s*(\d+(?:[/.-]\d+)*)/gi;
const RE_AREA = /\b(\d+(?:[.,]\d+)*)\s*(?:ha|hectares?)\b/gi;
const RE_LOCAL = /(?<=(?:[Mm]unic[ií]pio|MUNIC[IÍ]PIO)\s+(?:de|DE)\s+)\p{Lu}[\p{L}' ]*?\s*[/–-]\s*[A-Z]{2}\b/gu;
const RE_PROPRIEDADE = /\b(?:Fazenda|S[ií]tio|Ch[áa]cara|Est[âa]ncia|Granja)\s+\p{Lu}[\p{L}']*(?:\s+(?:d[aeo]s?\s+)?\p{Lu}[\p{L}']*)*/gu;

const NEGACAO = new Set([
  'nao', 'sem', 'nem', 'ausencia', 'ausente', 'ausentes', 'livre', 'livres', 'isento', 'isenta', 'isentos', 'isentas',
  'nenhum', 'nenhuma', 'negativo', 'negativa', 'inexistencia', 'inexistente',
]);
const ADVERSATIVA = new Set(['mas', 'porem', 'contudo', 'entretanto', 'todavia', 'exceto', 'salvo']);
const LIGACAO = new Set(['e', 'ou', 'nem', 'de', 'da', 'do', 'das', 'dos']);
const FIM_DE_ORACAO = /[.;!?,:()]|\n\s*\n/;
const FIM_DE_FRASE = /[.;!?]|\n\s*\n/;
const NOVA_SECAO = /\n\s*\n|\n\s*(?:conclus|observa|recomenda|parecer)/i;

function dataIso(dia: number, mes: number, ano: number): string | null {
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  if (d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) return null; // 31/02 etc.
  return d.toISOString().slice(0, 10);
}

/** "42" → 42 · "42,5" → 42.5 · "1.250" → 1250 · "1.250,5" → 1250.5 */
function paraNumero(s: string): number {
  if (s.includes(',')) return parseFloat(s.replace(/\./g, '').replace(',', '.'));
  return parseFloat(/^\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, '') : s);
}

function casarDicionario(text: string, tokens: Token[], dict: Dicionario): Entidade[] {
  const found: Entidade[] = [];
  const radicais = tokens.map((t) => radical(t.norma));
  for (const [type, termos] of Object.entries(dict) as [TipoDicionario, string[]][]) {
    for (const termo of termos) {
      const alvo = tokenizar(termo).map((t) => t.norma);
      if (alvo.join('').length < 3) continue; // termo sem letras suficientes casaria com qualquer coisa
      const alvoRadicais = alvo.map(radical);
      for (let i = 0; i + alvo.length <= tokens.length; i++) {
        let exato = true;
        let casou = true;
        for (let j = 0; j < alvo.length && casou; j++) {
          const tk = tokens[i + j];
          // entre as palavras do termo só pode haver hífen ou espaço ("broca-do-café" = "broca do café")
          if (j > 0 && !/^[-\s]{1,3}$/.test(text.slice(tokens[i + j - 1].fim, tk.inicio))) casou = false;
          else if (tk.norma === alvo[j]) continue;
          else if (radicais[i + j] === alvoRadicais[j] || parecidas(tk.norma, alvo[j])) exato = false;
          else casou = false;
        }
        if (!casou) continue;
        const start = tokens[i].inicio;
        const end = tokens[i + alvo.length - 1].fim;
        found.push({ type, start, end, text: text.slice(start, end), key: termo, ...(exato ? {} : { aproximado: true }) });
      }
    }
  }
  return found;
}

function casarPadroes(text: string, norm: string): Entidade[] {
  const found: Entidade[] = [];
  const add = (type: TipoEntidade, m: RegExpExecArray, key: string) =>
    found.push({ type, start: m.index, end: m.index + m[0].length, text: text.slice(m.index, m.index + m[0].length), key });

  for (const m of text.matchAll(RE_DATA)) {
    const iso = dataIso(+m[1], +m[2], +m[3]);
    if (iso) add('DATA', m, iso);
  }
  for (const m of norm.matchAll(RE_DATA_EXTENSO)) {
    const iso = dataIso(+m[1], MESES.indexOf(m[2]) + 1, +m[3]);
    if (iso) add('DATA', m, iso);
  }
  for (const m of text.matchAll(RE_TALHAO)) add('TALHAO', m, `talhão ${m[1].toLowerCase()}`);
  for (const m of text.matchAll(RE_LAUDO)) add('LAUDO', m, m[1]);
  for (const m of text.matchAll(RE_AREA)) add('AREA', m, m[1]);
  for (const m of text.matchAll(RE_LOCAL)) add('LOCAL', m, m[0].replace(/\s*[/–-]\s*/, '/'));
  for (const m of text.matchAll(RE_PROPRIEDADE)) add('PROPRIEDADE', m, m[0]);
  return found;
}

/** NegEx simplificado: gatilho de negação até 6 palavras antes, na mesma oração.
 *  ponytail: janela fixa; uma análise sintática de dependências resolveria casos longos. */
function marcarNegacoes(text: string, tokens: Token[], items: Entidade[]) {
  let anterior: Entidade | undefined;
  for (const e of items) {
    if (e.type !== 'PRAGA' && e.type !== 'DOENCA') continue;
    // enumeração herda a negação: "ausência de A, B e C"
    if (anterior?.negada) {
      const meio = text.slice(anterior.end, e.start);
      if (!/[.;!?:()]|\n\s*\n/.test(meio) && tokenizar(meio).every((t) => LIGACAO.has(t.norma))) e.negada = true;
    }
    if (!e.negada) {
      const antes = tokens.filter((t) => t.fim <= e.start).slice(-6).reverse();
      for (const t of antes) {
        if (FIM_DE_ORACAO.test(text.slice(t.fim, e.start)) || ADVERSATIVA.has(t.norma)) break;
        if (NEGACAO.has(t.norma)) {
          e.negada = true;
          break;
        }
      }
    }
    anterior = e;
  }
}

/** Cada ocorrência pertence ao último talhão citado antes dela, até a próxima seção. */
function atribuirTalhoes(text: string, items: Entidade[]) {
  let atual: Entidade | undefined;
  for (const e of items) {
    if (e.type === 'TALHAO') {
      atual = e;
      continue;
    }
    if (atual && NOVA_SECAO.test(text.slice(atual.end, e.start))) atual = undefined;
    if (atual) e.talhao = atual.key;
  }
  // praga citada antes do talhão na mesma frase: "Constatada ferrugem no Talhão 05"
  items.forEach((e, i) => {
    if (e.talhao || (e.type !== 'PRAGA' && e.type !== 'DOENCA')) return;
    const proximo = items.slice(i + 1).find((x) => x.type === 'TALHAO');
    if (proximo && !FIM_DE_FRASE.test(text.slice(e.end, proximo.start))) e.talhao = proximo.key;
  });
}

const ultima = (datas: string[]) => [...datas].sort().at(-1) ?? null;

export function extractEntities(text: string, dict: Dicionario): ResultadoNer {
  const norm = normChars(text);
  const tokens = tokenizar(text);

  // Sobreposições: fica a que começa antes; no empate, a mais longa e, depois, a literal.
  const found = [...casarDicionario(text, tokens, dict), ...casarPadroes(text, norm)].sort(
    (a, b) => a.start - b.start || b.end - a.end || Number(!!a.aproximado) - Number(!!b.aproximado),
  );
  const items: Entidade[] = [];
  let lastEnd = -1;
  for (const e of found) {
    if (e.start >= lastEnd) {
      items.push(e);
      lastEnd = e.end;
    }
  }

  marcarNegacoes(text, tokens, items);
  atribuirTalhoes(text, items);

  const uniq = (type: TipoEntidade, de: Entidade[] = items) => [
    ...new Set(de.filter((e) => e.type === type && !e.negada).map((e) => e.key)),
  ];
  const pragas = uniq('PRAGA');
  const doencas = uniq('DOENCA');
  const presentes = new Set([...pragas, ...doencas]);

  const datas: DataEncontrada[] = items
    .filter((e) => e.type === 'DATA')
    .map((e) => ({
      texto: e.text,
      data: e.key,
      // "inspeção realizada em 12/08/2026": a palavra aparece antes da data, na mesma frase
      inspecao: /inspe|vistori/.test(norm.slice(Math.max(0, e.start - 70), e.start).split(/[.;!?]/).at(-1)!),
      ...(e.talhao ? { talhao: e.talhao } : {}),
    }));

  const talhoes = uniq('TALHAO');
  const talhoesDetalhe = talhoes.map((talhao): TalhaoDetalhe => {
    const dele = items.filter((e) => e.talhao === talhao);
    const area = dele.find((e) => e.type === 'AREA');
    return {
      talhao,
      cultura: uniq('CULTURA', dele)[0] ?? null,
      areaHa: area ? paraNumero(area.key) : null,
      pragas: uniq('PRAGA', dele),
      doencas: uniq('DOENCA', dele),
      inspecao: ultima(datas.filter((d) => d.talhao === talhao && d.inspecao).map((d) => d.data)),
    };
  });

  return {
    items,
    pragas,
    doencas,
    culturas: uniq('CULTURA'),
    talhoes,
    negadas: [...new Set(items.filter((e) => e.negada && !presentes.has(e.key)).map((e) => e.key))],
    datas,
    ultimaInspecao: ultima(datas.filter((d) => d.inspecao).map((d) => d.data)),
    laudoNumero: items.find((e) => e.type === 'LAUDO')?.key ?? null,
    propriedade: items.find((e) => e.type === 'PROPRIEDADE')?.key ?? null,
    local: items.find((e) => e.type === 'LOCAL')?.key ?? null,
    talhoesDetalhe,
    estatisticas: {
      caracteres: text.length,
      tokens: tokens.length,
      sentencas: text.split(/[.!?]+(?:\s|$)/).filter((s) => s.trim()).length,
    },
  };
}
