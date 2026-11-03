import { htmlLista, ItemChecklist } from '../common/checklist';
import { escapeHtml, normChars } from '../common/texto';

/* Elegibilidade a créditos de carbono (mercado voluntário) + calculadora
   ILUSTRATIVA de tCO2e. Funções puras (sem banco) para facilitar os testes. */

export interface Propriedade {
  bioma: string;
  area: number; // ha
  rl: number; // % de Reserva Legal atual
  car: boolean;
  desmatamento: boolean;
  praticas: string[];
  mrv: boolean;
  padrao: string;
}

export interface BiomaRef {
  nome: string;
  reservaLegalMin: number;
}

export interface PraticaRef {
  id: string;
  nome: string;
  fatorTco2eHaAno: number;
}

export const AREA_MINIMA_HA = 30;
/** Fração retida no pool de buffer contra não permanência (ilustrativo; na Verra
 *  o percentual sai da análise de risco de cada projeto). */
export const BUFFER_NAO_PERMANENCIA = 0.2;

const round1 = (n: number) => Math.round(n * 10) / 10;
const fmt = (n: number) => n.toLocaleString('pt-BR');

export function estimarCreditos(p: Propriedade, praticas: PraticaRef[]) {
  const area = p.area * (1 - Math.min(Math.max(p.rl, 0), 100) / 100);
  // ponytail: aplica só a prática de maior fator sobre toda a área produtiva (não soma
  // práticas na mesma área = sem dupla contagem); pedir área por prática quando o formulário tiver.
  const base = praticas
    .filter((x) => p.praticas.includes(x.id))
    .sort((a, b) => b.fatorTco2eHaAno - a.fatorTco2eHaAno)[0];
  const potencial = base ? area * base.fatorTco2eHaAno : 0;
  return {
    areaProdutivaHa: round1(area),
    praticaBase: base ? { id: base.id, nome: base.nome, fatorTco2eHaAno: base.fatorTco2eHaAno } : null,
    potencialTco2eAno: round1(potencial),
    bufferPct: BUFFER_NAO_PERMANENCIA * 100,
    creditosAno: Math.floor(potencial * (1 - BUFFER_NAO_PERMANENCIA)), // 1 crédito = 1 tCO2e
  };
}

export type AvaliacaoCarbono = ReturnType<typeof avaliarCarbono>;

export function avaliarCarbono(p: Propriedade, bioma: BiomaRef, praticas: PraticaRef[]) {
  const items: ItemChecklist[] = [];
  items.push({
    id: 'car',
    label: 'Inscrição ativa no CAR/SICAR',
    status: p.car ? 'ok' : 'pendente',
    note: p.car ? 'Cadastro Ambiental Rural informado.' : 'A inscrição no CAR é pré-requisito para qualquer projeto.',
  });
  const deficit = round1(bioma.reservaLegalMin - p.rl);
  items.push({
    id: 'rl',
    label: `Reserva Legal ≥ ${bioma.reservaLegalMin}% (${bioma.nome})`,
    status: deficit <= 0 ? 'ok' : 'risco',
    note: deficit <= 0
      ? `Atual: ${p.rl}% — em conformidade.`
      : `Déficit de ${fmt(deficit)} p.p.; regularize via PRA antes de certificar.`,
  });
  items.push({
    id: 'desmatamento',
    label: 'Sem supressão recente de vegetação nativa',
    status: p.desmatamento ? 'risco' : 'ok',
    note: p.desmatamento
      ? 'Supressão recente pode inviabilizar o projeto em padrões voluntários.'
      : 'Sem desmatamento recente declarado.',
  });
  const n = new Set(p.praticas).size;
  items.push({
    id: 'praticas',
    label: 'Prática de baixo carbono adotada (Plano ABC+)',
    status: n ? 'ok' : 'pendente',
    note: n ? `${n} prática(s) selecionada(s).` : 'Adote ao menos uma prática elegível (ex.: ILPF, plantio direto).',
  });
  items.push({
    id: 'mrv',
    label: 'Plano de monitoramento (MRV)',
    status: p.mrv ? 'ok' : 'pendente',
    note: p.mrv ? 'Plano de MRV confirmado.' : 'Defina como emissões/remoções serão medidas e verificadas.',
  });
  items.push({
    id: 'escala',
    label: `Escala mínima recomendada (≥ ${AREA_MINIMA_HA} ha)`,
    status: p.area >= AREA_MINIMA_HA ? 'ok' : 'pendente',
    note: p.area >= AREA_MINIMA_HA ? `${fmt(p.area)} ha.` : 'Área pequena: considere projeto agrupado com outras propriedades.',
  });

  const ok = items.filter((i) => i.status === 'ok').length;
  return { items, ok, score: Math.round((ok / items.length) * 100), estimativa: estimarCreditos(p, praticas) };
}

/** Chat do CarbonBot: classificação de intenção por palavras-chave. */
export function responderCarbono(
  mensagem: string,
  p: Propriedade,
  avaliado: boolean,
  praticas: PraticaRef[],
  r: AvaliacaoCarbono,
): string {
  const t = normChars(mensagem);
  const bad = r.items.filter((i) => i.status !== 'ok');
  const precisaAvaliar = 'Clique em <b>Avaliar elegibilidade</b> para eu analisar os dados da propriedade.';
  const padrao = escapeHtml(p.padrao);

  if (/regulad|sbce|obrigat/.test(t))
    return 'O SBCE (Lei nº 15.042/2024) cria o mercado regulado brasileiro, mas <b>exclui a agropecuária</b> das obrigações. Para o produtor rural, o caminho é o <b>mercado voluntário</b>, com certificação por padrões como Verra VCS ou Gold Standard.';
  if (/credito|tco2|quant|estimativ|calcul|potencial/.test(t)) {
    if (!avaliado) return precisaAvaliar;
    const e = r.estimativa;
    if (!e.praticaBase) return 'Selecione ao menos uma prática de baixo carbono para eu estimar os créditos.';
    return `Estimativa <b>ilustrativa</b>: ${fmt(e.areaProdutivaHa)} ha produtivos × ${fmt(e.praticaBase.fatorTco2eHaAno)} tCO2e/ha/ano (${escapeHtml(e.praticaBase.nome)}) = <b>${fmt(e.potencialTco2eAno)} tCO2e/ano</b>. Descontando ${e.bufferPct}% de buffer de não permanência: <b>~${fmt(e.creditosAno)} crédito(s)/ano</b> (1 crédito = 1 tCO2e).${bad.length ? ` Atenção: ${bad.length} critério(s) ainda precisam ser resolvidos antes da certificação.` : ''}`;
  }
  if (/padrao|verra|gold|certific/.test(t))
    return `Você selecionou <b>${padrao}</b>. O <b>Verra VCS</b> é o mais usado em projetos agrícolas e florestais; o <b>Gold Standard</b> dá ênfase a cobenefícios sociais e ambientais. A escolha depende do tipo de projeto e do comprador dos créditos.`;
  if (/reserva|legal|\brl\b/.test(t)) {
    const i = r.items.find((x) => x.id === 'rl')!;
    return `<b>${escapeHtml(i.label)}</b>: ${escapeHtml(i.note)}`;
  }
  if (/pratica|abc|ilpf|manejo/.test(t))
    return `Práticas do Plano ABC+ consideradas: <ul>${praticas
      .map((x) => `<li>${escapeHtml(x.nome)} (${fmt(x.fatorTco2eHaAno)} tCO2e/ha/ano)${p.praticas.includes(x.id) ? ' ✓' : ''}</li>`)
      .join('')}</ul>`;
  if (/falta|pendent|qualific|risco|elegi/.test(t)) {
    if (!avaliado) return precisaAvaliar;
    return bad.length
      ? `Para se qualificar, ajuste:${htmlLista(bad)}`
      : 'Todos os critérios avaliados estão atendidos. 🎉 O próximo passo é estruturar o projeto junto a uma certificadora.';
  }
  if (/resumo|summary|status|avali/.test(t)) {
    if (!avaliado) return precisaAvaliar;
    return `<b>${r.ok}</b> de <b>${r.items.length}</b> critérios atendidos (<b>${r.score}%</b>) para o padrão <b>${padrao}</b>.${bad.length ? ` Pendências: ${bad.length}.` : ''} Potencial estimado: <b>~${fmt(r.estimativa.creditosAno)} crédito(s)/ano</b>.`;
  }
  if (/ajuda|help|\boi\b|\bola\b/.test(t))
    return 'Posso falar sobre: <b>o que falta</b>, <b>estimativa de créditos</b>, <b>Reserva Legal</b>, <b>práticas elegíveis</b>, <b>padrão de certificação</b> e <b>mercado regulado</b>.';
  return 'Não entendi bem. Tente: “o que falta?”, “quantos créditos?”, “Reserva Legal”, “práticas elegíveis” ou “mercado regulado?”.';
}
