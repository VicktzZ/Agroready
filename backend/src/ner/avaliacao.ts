import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Dicionario, extractEntities } from './ner';

/* Avaliação do NER contra um corpus anotado à mão (backend/avaliacao/laudos-anotados.json).
   Compara FATOS por documento, não posições: cada entidade vira "TIPO:chave" (ou "TIPO:chave!ausente" quando
   a praga/doença é citada como ausente). Mede precisão, revocação e F1 por tipo e no geral (micro-média).
   Rode com `npm run avaliar:ner`. */

export interface CasoAnotado {
  id: string;
  descricao?: string;
  texto: string;
  esperado: { entidades: string[]; ultimaInspecao: string | null; laudoNumero: string | null };
}

export interface Contagem {
  tp: number; // acertos
  fp: number; // sobrou (o sistema achou e não devia)
  fn: number; // faltou (devia achar e não achou)
}
export interface Metricas extends Contagem {
  precisao: number;
  revocacao: number;
  f1: number;
}
export interface Relatorio {
  casos: number;
  porTipo: Record<string, Metricas>;
  geral: Metricas;
  campos: { ultimaInspecao: { acertos: number; total: number }; laudoNumero: { acertos: number; total: number } };
  erros: { id: string; faltou: string[]; sobrou: string[] }[];
}

const TIPOS_AVALIADOS = new Set(['PRAGA', 'DOENCA', 'CULTURA', 'DATA', 'TALHAO']);
/** Linha extra do relatório: só as entidades marcadas como ausentes (mede a negação). */
export const AUSENTES = 'AUSENTES';

export const carregarCorpus = (): CasoAnotado[] =>
  JSON.parse(readFileSync(join(__dirname, '..', '..', 'avaliacao', 'laudos-anotados.json'), 'utf8')) as CasoAnotado[];

/** O que o NER encontrou, no mesmo formato do corpus. */
export function fatosDoSistema(texto: string, dict: Dicionario) {
  const r = extractEntities(texto, dict);
  const fatos = new Set<string>();
  for (const e of r.items) {
    if (!TIPOS_AVALIADOS.has(e.type)) continue;
    fatos.add(`${e.type}:${e.key}${e.negada ? '!ausente' : ''}`);
  }
  return { fatos, ultimaInspecao: r.ultimaInspecao, laudoNumero: r.laudoNumero };
}

const metricas = ({ tp, fp, fn }: Contagem): Metricas => {
  const precisao = tp + fp ? tp / (tp + fp) : 1;
  const revocacao = tp + fn ? tp / (tp + fn) : 1;
  const f1 = precisao + revocacao ? (2 * precisao * revocacao) / (precisao + revocacao) : 0;
  return { tp, fp, fn, precisao, revocacao, f1 };
};

export function avaliarNer(corpus: CasoAnotado[], dict: Dicionario): Relatorio {
  const buckets = new Map<string, Contagem>();
  const somar = (bucket: string, campo: keyof Contagem) => {
    const c = buckets.get(bucket) ?? { tp: 0, fp: 0, fn: 0 };
    c[campo]++;
    buckets.set(bucket, c);
  };
  const campos = { ultimaInspecao: { acertos: 0, total: 0 }, laudoNumero: { acertos: 0, total: 0 } };
  const erros: Relatorio['erros'] = [];

  for (const caso of corpus) {
    const obtido = fatosDoSistema(caso.texto, dict);
    const esperado = new Set(caso.esperado.entidades);
    const contar = (fato: string, campo: keyof Contagem) => {
      somar(fato.split(':')[0], campo);
      if (fato.endsWith('!ausente')) somar(AUSENTES, campo);
    };
    for (const f of esperado) contar(f, obtido.fatos.has(f) ? 'tp' : 'fn');
    for (const f of obtido.fatos) if (!esperado.has(f)) contar(f, 'fp');

    const faltou = [...esperado].filter((f) => !obtido.fatos.has(f));
    const sobrou = [...obtido.fatos].filter((f) => !esperado.has(f));
    if (faltou.length || sobrou.length) erros.push({ id: caso.id, faltou, sobrou });

    campos.ultimaInspecao.total++;
    if (obtido.ultimaInspecao === caso.esperado.ultimaInspecao) campos.ultimaInspecao.acertos++;
    campos.laudoNumero.total++;
    if (obtido.laudoNumero === caso.esperado.laudoNumero) campos.laudoNumero.acertos++;
  }

  const porTipo: Record<string, Metricas> = {};
  const geral: Contagem = { tp: 0, fp: 0, fn: 0 };
  for (const [tipo, c] of [...buckets].sort(([a], [b]) => a.localeCompare(b))) {
    porTipo[tipo] = metricas(c);
    if (tipo !== AUSENTES) {
      geral.tp += c.tp;
      geral.fp += c.fp;
      geral.fn += c.fn;
    }
  }
  return { casos: corpus.length, porTipo, geral: metricas(geral), campos, erros };
}
