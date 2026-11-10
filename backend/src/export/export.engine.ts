import { AnaliseChat, ItemChecklist, RespostaChat, resumir, Status } from '../common/checklist';
import { normChars } from '../common/texto';
import type { ResultadoNer } from '../ner/ner';
import { criarClassificador, radical, tokenizar } from '../pln/pln';
import { Lang, T } from './export.i18n';

/* Motor de regras do ExportBot: cruza as entidades do laudo com as exigências
   do destino × cultura. Funções puras (sem banco) para facilitar os testes. */

export interface Regra {
  maxDias: number;
  bloqueios: string[];
  docs: string[];
}

export interface Nomeado {
  id: string;
  nome: string;
  nomeEn: string;
}

export interface ContextoExportacao {
  ent: ResultadoNer | null;
  regra: Regra;
  destino: Nomeado;
  cultura: Nomeado;
  embarque?: string; // YYYY-MM-DD
  docsConfirmados: string[];
}

const DIA_MS = 86_400_000;
const nomeDe = (n: Nomeado, lang: Lang) => (lang === 'pt' ? n.nome : n.nomeEn);
const igual = (a: string, b: string) => normChars(a) === normChars(b);

/** Parte do laudo que interessa à cultura: os talhões dela, se o laudo os separa; senão o laudo inteiro. */
function recorte(e: ResultadoNer, cultura: Nomeado) {
  const talhoes = (e.talhoesDetalhe ?? []).filter((t) => t.cultura && (igual(t.cultura, cultura.id) || igual(t.cultura, cultura.nome)));
  if (!talhoes.length) return { detectados: [...e.pragas, ...e.doencas], inspecao: e.ultimaInspecao, onde: () => '' };
  const inspecoes = talhoes.flatMap((t) => (t.inspecao ? [t.inspecao] : [])).sort();
  return {
    detectados: [...new Set(talhoes.flatMap((t) => [...t.pragas, ...t.doencas]))],
    inspecao: inspecoes.at(-1) ?? e.ultimaInspecao,
    onde: (termo: string) =>
      talhoes
        .filter((t) => [...t.pragas, ...t.doencas].some((x) => igual(x, termo)))
        .map((t) => t.talhao)
        .join(', '),
  };
}

export type AvaliacaoExportacao = ReturnType<typeof avaliarExportacao>;

export function avaliarExportacao(ctx: ContextoExportacao, lang: Lang = 'pt') {
  const { ent: e, regra, cultura, embarque, docsConfirmados } = ctx;
  const L = T[lang].item;
  const parte = e ? recorte(e, cultura) : null;
  const items: ItemChecklist[] = [];
  const add = (id: string, label: string, status: Status, note: string, doc?: string) =>
    items.push({ id, label, status, note, ...(doc ? { doc } : {}) });

  if (!e) add('laudo', L.laudo, 'pendente', L.semLaudo);
  else if (e.laudoNumero) add('laudo', L.laudo, 'ok', L.numero(e.laudoNumero));
  else add('laudo', L.laudo, 'pendente', L.semNumero);

  const cult = L.cultura(nomeDe(cultura, lang));
  if (!e) add('cultura', cult, 'pendente', L.aguardando);
  else if (e.culturas.some((c) => igual(c, cultura.id) || igual(c, cultura.nome))) add('cultura', cult, 'ok', L.culturaOk);
  else add('cultura', cult, 'risco', L.culturaFalta);

  const prazo = L.prazo(regra.maxDias);
  let dias: number | null = null;
  if (!parte) add('prazo', prazo, 'pendente', L.aguardando);
  else if (!parte.inspecao) add('prazo', prazo, 'pendente', L.semInspecao);
  else if (!embarque) add('prazo', prazo, 'pendente', L.semEmbarque);
  else {
    dias = Math.round((Date.parse(embarque) - Date.parse(parte.inspecao)) / DIA_MS);
    const ok = dias >= 0 && dias <= regra.maxDias;
    add('prazo', prazo, ok ? 'ok' : 'risco', dias < 0 ? L.embarqueAntes : L.dias(dias));
  }

  for (const p of regra.bloqueios) {
    const label = L.ausencia(p);
    if (!parte) add(`b-${p}`, label, 'pendente', L.aguardando);
    else if (parte.detectados.some((d) => igual(d, p))) add(`b-${p}`, label, 'risco', L.detectado(parte.onde(p)));
    else add(`b-${p}`, label, 'ok', L.naoDetectado);
  }

  regra.docs.forEach((d, i) => {
    const ok = docsConfirmados.includes(d);
    add(`doc-${i}`, d, ok ? 'ok' : 'pendente', ok ? L.docOk : L.docPendente, d);
  });

  return { items, dias, resumo: resumir(items) };
}

/** Procura um destino/cultura citado na pergunta ("e para a China?") e devolve a pergunta sem ele. */
export function extrairSlot<T extends Nomeado>(mensagem: string, opcoes: T[]): { achado: T | null; resto: string } {
  const tokens = tokenizar(mensagem).map((t) => t.norma);
  for (const opcao of opcoes) {
    for (const nome of [opcao.nome, opcao.nomeEn, opcao.id]) {
      const alvo = tokenizar(nome).map((t) => radical(t.norma));
      if (!alvo.length) continue;
      for (let i = 0; i + alvo.length <= tokens.length; i++) {
        if (alvo.every((a, j) => radical(tokens[i + j]) === a)) {
          return { achado: opcao, resto: [...tokens.slice(0, i), ...tokens.slice(i + alvo.length)].join(' ') };
        }
      }
    }
  }
  return { achado: null, resto: mensagem };
}

type IntencaoExport =
  | 'pendencias' | 'entidades' | 'documentos' | 'prazo' | 'atendido' | 'resumo' | 'regra'
  | 'saudacao' | 'ajuda' | 'agradecimento';

// Exemplos em PT e EN: o mesmo classificador atende os dois idiomas.
const classificar = criarClassificador<IntencaoExport>([
  {
    id: 'pendencias',
    exemplos: [
      'o que está pendente', 'o que falta', 'o que ainda falta resolver', 'quais são as pendências', 'tem algum risco',
      'o que está em risco', 'o que preciso resolver', 'o que não está ok', 'problemas do laudo',
      'what is pending', 'what is missing', 'any risks', 'what do i need to fix', 'what is at risk', 'what is not ok',
    ],
  },
  {
    id: 'entidades',
    exemplos: [
      'quais pragas foram encontradas', 'quais doenças', 'pragas e doenças do laudo', 'o que o laudo encontrou',
      'entidades extraídas', 'quais talhões', 'which pests', 'which diseases were found', 'what did the report find',
      'pests and diseases', 'which plots',
    ],
  },
  {
    id: 'documentos',
    exemplos: [
      'documentos', 'quais documentos preciso', 'documentação exigida', 'que certificados são necessários', 'papelada',
      'which documents', 'documents required', 'paperwork', 'certificates needed',
    ],
  },
  {
    id: 'prazo',
    exemplos: [
      'prazo da inspeção', 'a inspeção está no prazo', 'quando foi a inspeção', 'validade do laudo', 'o laudo está vencido',
      'data de embarque', 'quantos dias', 'inspection deadline', 'is the inspection still valid', 'shipment date', 'how many days',
    ],
  },
  {
    id: 'atendido',
    exemplos: [
      'o que já está atendido', 'o que está ok', 'o que já cumpri', 'itens atendidos', 'o que está certo',
      'what is already met', 'what is ok', 'what is fine', 'requirements met',
    ],
  },
  {
    id: 'resumo',
    exemplos: [
      'resumo', 'status geral', 'como está minha exportação', 'posso exportar', 'estou pronto para exportar', 'situação',
      'summary', 'overall status', 'am i ready to export', 'can i export',
    ],
  },
  {
    id: 'regra',
    exemplos: [
      'quais as exigências do destino', 'o que o país exige', 'regras de exportação', 'requisitos do destino', 'o que é exigido',
      'what are the requirements', 'what does the destination require', 'export rules',
    ],
  },
  { id: 'saudacao', exemplos: ['oi', 'olá', 'bom dia', 'boa tarde', 'boa noite', 'hello', 'hi', 'good morning'] },
  {
    id: 'ajuda',
    exemplos: ['ajuda', 'o que você sabe fazer', 'como funciona', 'como você pode me ajudar', 'help', 'what can you do', 'how does this work'],
  },
  { id: 'agradecimento', exemplos: ['obrigado', 'obrigada', 'valeu', 'muito obrigado', 'thanks', 'thank you'] },
]);

export interface OpcoesPergunta {
  /** Pragas/doenças do dicionário citadas na pergunta. */
  citados?: string[];
  /** A pergunta citou outro destino/cultura ("e para a China?"). */
  trocouContexto?: boolean;
}

/** Chat do ExportBot: intenção por similaridade TF-IDF (PT/EN) + resposta montada a partir da checklist. */
export function responderExportacao(
  mensagem: string,
  lang: Lang,
  ctx: ContextoExportacao,
  { citados = [], trocouContexto = false }: OpcoesPergunta = {},
): RespostaChat & { analise: AnaliseChat } {
  const L = T[lang].chat;
  const c = classificar(mensagem);
  const intencao = citados.length ? 'termo' : (c.intencao ?? (trocouContexto ? 'resumo' : null));
  const analise: AnaliseChat = { ...c, intencao, entidades: citados };
  const r = (texto: string, itens: ItemChecklist[] = []) => ({ texto, ...(itens.length ? { itens } : {}), analise });

  const e = ctx.ent;
  const dest = nomeDe(ctx.destino, lang);
  const cult = nomeDe(ctx.cultura, lang);
  const { items, dias, resumo } = avaliarExportacao(ctx, lang);
  const lista = (a: string[]) => (a.length ? a.join(', ') : L.nenhuma);

  // Perguntas que não dependem do laudo
  switch (intencao) {
    case null:
      return r(L.naoEntendi);
    case 'saudacao':
      return r(L.saudacao);
    case 'ajuda':
      return r(L.ajuda);
    case 'agradecimento':
      return r(L.agradecimento);
    case 'regra':
      return r(
        L.regra(cult, dest, ctx.regra.maxDias) +
          (ctx.regra.bloqueios.length ? L.regraBloqueios(ctx.regra.bloqueios.join(', ')) : '') +
          (ctx.regra.docs.length ? L.regraDocs(ctx.regra.docs.join('; ')) : ''),
      );
    case 'documentos': {
      const docs = items.filter((i) => i.doc);
      return docs.length ? r(L.documentos, docs) : r(L.semDocumentos);
    }
    case 'termo': {
      const parte = e ? recorte(e, ctx.cultura) : null;
      return r(
        citados
          .map((t) => {
            const restrito = ctx.regra.bloqueios.some((b) => igual(b, t));
            if (!parte) return (restrito ? L.termo.restritoSemLaudo : L.termo.livreSemLaudo)(t, cult, dest);
            const detectado = parte.detectados.some((d) => igual(d, t));
            if (restrito) return detectado ? L.termo.bloqueia(t, cult, dest, parte.onde(t)) : L.termo.restritoAusente(t, cult, dest);
            return detectado ? L.termo.detectadoLivre(t, cult, dest, parte.onde(t)) : L.termo.nada(t, cult, dest);
          })
          .join(' '),
      );
    }
  }

  if (!e) return r(L.semLaudo);
  const resumoTxt = L.resumo(resumo.ok, resumo.pendente, resumo.risco, cult, dest);

  switch (intencao) {
    case 'pendencias': {
      const ruins = items
        .filter((i) => i.status !== 'ok')
        .sort((a, b) => Number(b.status === 'risco') - Number(a.status === 'risco'));
      return ruins.length ? r(`${resumoTxt} ${L.pendencias}`, ruins) : r(`${resumoTxt} ${L.nadaPendente}`);
    }
    case 'atendido': {
      const ok = items.filter((i) => i.status === 'ok');
      return ok.length ? r(L.atendido, ok) : r(L.nadaAtendido);
    }
    case 'entidades':
      return r(L.entidades(lista(e.pragas), lista(e.doencas), lista(e.talhoes)) + (e.negadas?.length ? L.negadas(e.negadas.join(', ')) : ''));
    case 'prazo':
      if (!ctx.embarque) return r(L.semEmbarque);
      if (dias === null) return r(L.semInspecao);
      if (dias < 0) return r(T[lang].item.embarqueAntes);
      return r(L.prazo(dias, ctx.regra.maxDias) + (dias <= ctx.regra.maxDias ? L.prazoOk : L.prazoVencido));
    default:
      return r(`${resumoTxt} ${L.situacao[resumo.situacao]}`);
  }
}
