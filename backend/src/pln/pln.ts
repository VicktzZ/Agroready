import { normChars } from '../common/texto';

/* PLN clássico, sem dependências, usado pelo NER e pelos chats:
   tokenização com offsets → stopwords → stemmer leve (português) → TF-IDF + cosseno.
   Distância de edição para tolerar erro de digitação. */

export interface Token {
  texto: string; // como aparece no original
  norma: string; // minúsculas, sem acento
  inicio: number;
  fim: number;
}

export function tokenizar(texto: string): Token[] {
  const norm = normChars(texto); // mesmo comprimento do original: os offsets valem nos dois
  return [...norm.matchAll(/[a-z0-9]+/g)].map((m) => ({
    texto: texto.slice(m.index, m.index + m[0].length),
    norma: m[0],
    inicio: m.index,
    fim: m.index + m[0].length,
  }));
}

// Palavras sem carga semântica para a intenção (PT + EN). "não" e "sem" ficam: mudam o sentido.
const STOPWORDS = new Set(
  (
    'a o as os um uma uns umas de do da dos das em no na nos nas por pelo pela para pra com e ou que qual quais ' +
    'eu me meu minha meus minhas voce voces ele ela eles elas isso isto esse essa este esta aquele aquela ao aos ' +
    'se ser sao foi era estao estou tem tenho ter ha ja mais muito tambem so la aqui favor ' +
    'the an of to in is are am be for on my i you it do does did can could what which this that and or me please'
  ).split(' '),
);

/** Formas normalizadas do texto, sem stopwords (ainda não reduzidas ao radical). */
export const palavras = (texto: string) =>
  tokenizar(texto)
    .map((t) => t.norma)
    .filter((t) => !STOPWORDS.has(t));

function singular(p: string): string {
  if (p.endsWith('oes') || p.endsWith('aes')) return p.slice(0, -3) + 'ao'; // inspecoes → inspecao
  if ((p.endsWith('ais') || p.endsWith('eis')) && p.length > 4) return p.slice(0, -2) + 'l'; // legais → legal
  if (p.endsWith('ns')) return p.slice(0, -2) + 'm'; // marrons → marrom
  if (p.endsWith('res') && p.length > 5) return p.slice(0, -2); // fatores → fator
  if (p.endsWith('s') && !p.endsWith('ss')) return p.slice(0, -1);
  return p;
}

// [sufixo, tamanho mínimo do radical que sobra] — o mais longo que couber vence.
const SUFIXOS: [string, number][] = (
  [
    ['ibilidade', 3], ['abilidade', 3], ['amento', 3], ['imento', 3], ['atorio', 3], ['atoria', 3],
    ['adora', 3], ['mente', 4], ['idade', 4], ['encia', 3], ['ancia', 3], ['ativo', 3], ['ativa', 3],
    ['mento', 5], ['ador', 3], ['acao', 3], ['avel', 3], ['ivel', 3], ['ente', 3], ['ante', 3],
    ['ando', 3], ['endo', 3], ['indo', 3], ['aram', 3], ['eram', 3], ['iram', 3], ['avam', 3],
    ['cao', 4], ['ado', 3], ['ada', 3], ['ido', 3], ['ida', 3],
    ['ar', 3], ['er', 3], ['ir', 3], ['ou', 3], ['am', 3], ['em', 3], ['ei', 4],
  ] as [string, number][]
).sort((a, b) => b[0].length - a[0].length);

/** Stemmer leve para português, inspirado no RSLP: plural → um sufixo → vogal final.
 *  ponytail: sem lista de exceções do RSLP; trocar pelo RSLP completo se o vocabulário crescer. */
export function radical(palavra: string): string {
  if (palavra.length <= 3 || /\d/.test(palavra)) return palavra;
  const p = singular(palavra);
  for (const [sufixo, minimo] of SUFIXOS) {
    if (p.endsWith(sufixo) && p.length - sufixo.length >= minimo) return p.slice(0, -sufixo.length);
  }
  return p.length > 3 && /[aeo]$/.test(p) ? p.slice(0, -1) : p;
}

/** Distância de Damerau-Levenshtein (inserção, remoção, troca e transposição de vizinhas). */
export function distancia(a: string, b: string): number {
  let anteAnterior: number[] = [];
  let anterior = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const atual = [i];
    for (let j = 1; j <= b.length; j++) {
      atual[j] = Math.min(anterior[j] + 1, atual[j - 1] + 1, anterior[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        atual[j] = Math.min(atual[j], anteAnterior[j - 2] + 1);
      }
    }
    anteAnterior = anterior;
    anterior = atual;
  }
  return anterior[b.length];
}

/** Iguais ou a um erro de digitação de distância (tolerância cresce com o tamanho da palavra). */
export function parecidas(a: string, b: string): boolean {
  if (a === b) return true;
  const maior = Math.max(a.length, b.length);
  const tolerancia = maior >= 10 ? 2 : maior >= 5 ? 1 : 0;
  return tolerancia > 0 && a[0] === b[0] && Math.abs(a.length - b.length) <= tolerancia && distancia(a, b) <= tolerancia;
}

export interface Intencao<T extends string> {
  id: T;
  exemplos: string[];
}

export interface Classificacao<T extends string> {
  intencao: T | null; // null = abaixo do limiar (não entendi)
  confianca: number; // similaridade do cosseno, 0–1
  radicais: string[];
  ranking: { intencao: T; score: number }[];
}

/** Classificador de intenção: cada exemplo vira um vetor TF-IDF; a pergunta recebe a
 *  intenção do exemplo mais parecido (cosseno), se passar do limiar. */
export function criarClassificador<T extends string>(intencoes: Intencao<T>[], limiar = 0.3) {
  const vocabulario = new Set(intencoes.flatMap((i) => i.exemplos.flatMap(palavras)));
  const docs = intencoes.flatMap((i) => i.exemplos.map((ex) => ({ id: i.id, termos: palavras(ex).map(radical) })));

  const df = new Map<string, number>();
  for (const d of docs) for (const t of new Set(d.termos)) df.set(t, (df.get(t) ?? 0) + 1);
  const idf = (t: string) => Math.log((docs.length + 1) / ((df.get(t) ?? 0) + 1)) + 1;

  const vetor = (termos: string[]) => {
    const v = new Map<string, number>();
    for (const t of termos) v.set(t, (v.get(t) ?? 0) + idf(t));
    const norma = Math.hypot(...v.values()) || 1;
    for (const [t, peso] of v) v.set(t, peso / norma);
    return v;
  };
  const exemplos = docs.map((d) => ({ id: d.id, v: vetor(d.termos) }));

  return (mensagem: string): Classificacao<T> => {
    // palavra desconhecida: tenta a mais parecida do vocabulário antes de reduzir ao radical
    const radicais = palavras(mensagem)
      .map((p) => (vocabulario.has(p) ? p : ([...vocabulario].find((v) => parecidas(p, v)) ?? p)))
      .map(radical);
    const pergunta = vetor(radicais);

    const melhor = new Map<T, number>();
    for (const { id, v } of exemplos) {
      let score = 0;
      for (const [t, peso] of pergunta) score += peso * (v.get(t) ?? 0);
      if (score > (melhor.get(id) ?? 0)) melhor.set(id, score);
    }
    const ranking = [...melhor]
      .map(([intencao, score]) => ({ intencao, score: Math.round(score * 100) / 100 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    const top = ranking[0];
    return {
      intencao: top && top.score >= limiar ? top.intencao : null,
      confianca: top?.score ?? 0,
      radicais,
      ranking,
    };
  };
}
