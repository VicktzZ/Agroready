import { htmlLista, ItemChecklist, Status } from '../common/checklist';
import { escapeHtml, normChars } from '../common/texto';
import type { ResultadoNer } from '../ner/ner';
import { I18N, Lang } from './export.i18n';

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

export function avaliarExportacao(ctx: ContextoExportacao) {
  const { ent: e, regra, cultura, embarque, docsConfirmados } = ctx;
  const items: ItemChecklist[] = [];

  const laudo = 'Laudo fitossanitário emitido';
  items.push(
    !e
      ? { id: 'laudo', label: laudo, status: 'pendente', note: 'Nenhum laudo carregado.' }
      : e.laudoNumero
        ? { id: 'laudo', label: laudo, status: 'ok', note: `Nº ${e.laudoNumero}` }
        : { id: 'laudo', label: laudo, status: 'pendente', note: 'Número do laudo não identificado no texto.' },
  );

  const cult = `Laudo cobre a cultura (${cultura.nome})`;
  items.push(
    !e
      ? { id: 'cultura', label: cult, status: 'pendente', note: 'Aguardando laudo.' }
      : e.culturas.map(normChars).includes(normChars(cultura.id))
        ? { id: 'cultura', label: cult, status: 'ok', note: 'Cultura encontrada no laudo.' }
        : { id: 'cultura', label: cult, status: 'risco', note: 'O laudo não menciona esta cultura.' },
  );

  const prazo = `Inspeção até ${regra.maxDias} dias antes do embarque`;
  let dias: number | null = null;
  if (!e?.ultimaInspecao) {
    items.push({ id: 'prazo', label: prazo, status: 'pendente', note: e ? 'Data de inspeção não identificada.' : 'Aguardando laudo.' });
  } else if (!embarque) {
    items.push({ id: 'prazo', label: prazo, status: 'pendente', note: 'Informe a data prevista de embarque.' });
  } else {
    dias = Math.round((Date.parse(embarque) - Date.parse(e.ultimaInspecao)) / DIA_MS);
    const ok = dias >= 0 && dias <= regra.maxDias;
    items.push({
      id: 'prazo',
      label: prazo,
      status: ok ? 'ok' : 'risco',
      note: dias < 0 ? 'Embarque anterior à inspeção.' : `Inspeção há ${dias} dia(s) do embarque.`,
    });
  }

  const detectados = e ? [...e.pragas, ...e.doencas].map(normChars) : [];
  for (const p of regra.bloqueios) {
    const base = { id: `b-${p}`, label: `Ausência de ${p}` };
    if (!e) items.push({ ...base, status: 'pendente', note: 'Aguardando laudo.' });
    else if (detectados.includes(normChars(p)))
      items.push({ ...base, status: 'risco', note: 'Detectado no laudo — tratar e comprovar antes do embarque.' });
    else items.push({ ...base, status: 'ok', note: 'Não detectado no laudo.' });
  }

  regra.docs.forEach((d, i) => {
    const ok = docsConfirmados.includes(d);
    items.push({
      id: `doc-${i}`,
      doc: d,
      label: d,
      status: ok ? 'ok' : 'pendente',
      note: ok ? 'Confirmado pelo produtor.' : 'Confirmação manual pendente.',
    });
  });

  return { items, dias };
}

/** Chat do ExportBot: classificação de intenção por palavras-chave (PT/EN). */
export function responderExportacao(mensagem: string, lang: Lang, ctx: ContextoExportacao): string {
  const L = I18N[lang];
  const e = ctx.ent;
  if (!e) return L.noLaudo;

  const t = normChars(mensagem);
  const { items, dias } = avaliarExportacao(ctx);
  const dest = escapeHtml(lang === 'pt' ? ctx.destino.nome : ctx.destino.nomeEn);
  const cult = escapeHtml(lang === 'pt' ? ctx.cultura.nome : ctx.cultura.nomeEn);
  const by = (s: Status) => items.filter((i) => i.status === s);
  const summary = L.summary(by('ok').length, by('pendente').length, by('risco').length, dest, cult);

  if (/pendent|falta|risco|pending|missing|risk/.test(t)) {
    const bad = [...by('risco'), ...by('pendente')];
    return `${summary}<br>${bad.length ? `<b>${L.pendHeader}</b>${htmlLista(bad)}` : L.nothingPending}`;
  }
  if (/prag|doenc|entidad|pest|disease|entit/.test(t)) {
    const j = (a: string[]) => (a.length ? escapeHtml(a.join(', ')) : '—');
    return `<b>${L.pragasHeader}</b><ul><li>Pragas / pests: ${j(e.pragas)}</li><li>Doenças / diseases: ${j(e.doencas)}</li><li>Talhões / plots: ${j(e.talhoes)}</li></ul>`;
  }
  if (/document|doc\b|docs/.test(t)) {
    return `<b>${L.docsHeader}</b>${htmlLista(items.filter((i) => i.doc))}`;
  }
  if (/prazo|data|inspec|deadline|date/.test(t)) {
    if (!ctx.embarque) return L.noEmbarque;
    return dias === null ? L.noInspecao : L.prazoLine(dias, ctx.regra.maxDias);
  }
  if (/atendid|\bok\b|met\b|tudo|already/.test(t)) {
    return by('ok').length ? `<b>${L.okHeader}</b>${htmlLista(by('ok'))}` : '—';
  }
  if (/resumo|summary|status/.test(t)) return summary;
  if (/ajuda|help|\boi\b|\bola\b|hello|\bhi\b/.test(t)) return L.help;
  return L.fallback;
}
