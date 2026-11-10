import { AnaliseChat, ItemChecklist, RespostaChat, resumir } from '../common/checklist';
import { criarClassificador } from '../pln/pln';

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
      ? `Atual: ${fmt(p.rl)}% — em conformidade.`
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

  return { items, resumo: resumir(items), estimativa: estimarCreditos(p, praticas) };
}

type IntencaoCarbono =
  | 'faltas' | 'creditos' | 'valor' | 'reserva' | 'praticas' | 'padrao' | 'mercado' | 'car' | 'mrv' | 'desmatamento'
  | 'resumo' | 'saudacao' | 'ajuda' | 'agradecimento';

const classificar = criarClassificador<IntencaoCarbono>([
  {
    id: 'faltas',
    exemplos: [
      'o que falta', 'o que falta para me qualificar', 'quais pendências', 'sou elegível', 'posso gerar créditos',
      'o que está em risco', 'o que preciso ajustar', 'minha propriedade se qualifica',
    ],
  },
  {
    id: 'creditos',
    exemplos: [
      'quantos créditos', 'quantos créditos posso gerar', 'estimativa de créditos', 'potencial de carbono',
      'quanto carbono', 'calcular tco2e', 'como é feito o cálculo',
    ],
  },
  {
    id: 'valor',
    exemplos: ['quanto vale um crédito', 'quanto vou ganhar', 'preço do crédito de carbono', 'quanto dinheiro', 'receita com créditos', 'valor em reais'],
  },
  {
    id: 'reserva',
    exemplos: ['reserva legal', 'qual o mínimo de reserva legal', 'reserva legal do meu bioma', 'percentual de reserva', 'código florestal'],
  },
  {
    id: 'praticas',
    exemplos: ['práticas elegíveis', 'quais práticas contam', 'plano abc', 'ilpf', 'plantio direto', 'práticas de baixo carbono', 'manejo sustentável'],
  },
  {
    id: 'padrao',
    exemplos: ['qual padrão escolher', 'verra ou gold standard', 'padrão de certificação', 'qual certificadora', 'diferença entre os padrões'],
  },
  {
    id: 'mercado',
    exemplos: ['mercado regulado', 'sbce', 'sou obrigado', 'mercado voluntário', 'lei do mercado de carbono', 'como funciona o mercado de carbono'],
  },
  { id: 'car', exemplos: ['o que é car', 'preciso do car', 'sicar', 'cadastro ambiental rural'] },
  { id: 'mrv', exemplos: ['o que é mrv', 'plano de monitoramento', 'monitoramento relato e verificação', 'como comprovar as remoções'] },
  { id: 'desmatamento', exemplos: ['desmatei uma área', 'desmatamento recente', 'supressão de vegetação nativa', 'tive desmatamento'] },
  { id: 'resumo', exemplos: ['resumo', 'status', 'como estou', 'situação da propriedade', 'resultado da avaliação'] },
  { id: 'saudacao', exemplos: ['oi', 'olá', 'bom dia', 'boa tarde', 'boa noite'] },
  { id: 'ajuda', exemplos: ['ajuda', 'o que você sabe fazer', 'como funciona', 'como você pode me ajudar'] },
  { id: 'agradecimento', exemplos: ['obrigado', 'obrigada', 'valeu', 'muito obrigado'] },
]);

/** Chat do CarbonBot: intenção por similaridade TF-IDF + resposta montada a partir da avaliação. */
export function responderCarbono(
  mensagem: string,
  p: Propriedade,
  avaliado: boolean,
  praticas: PraticaRef[],
  a: AvaliacaoCarbono,
): RespostaChat & { analise: AnaliseChat } {
  const c = classificar(mensagem);
  const analise: AnaliseChat = { ...c, entidades: [] };
  const r = (texto: string, itens: ItemChecklist[] = []) => ({ texto, ...(itens.length ? { itens } : {}), analise });
  const ruins = a.items.filter((i) => i.status !== 'ok').sort((x, y) => Number(y.status === 'risco') - Number(x.status === 'risco'));
  const precisaAvaliar = 'Preencha os dados e clique em **Avaliar elegibilidade** para eu analisar a propriedade.';
  const item = (id: string) => a.items.find((i) => i.id === id)!;
  const e = a.estimativa;

  switch (c.intencao) {
    case 'mercado':
      return r(
        'O SBCE (Lei nº 15.042/2024) cria o mercado regulado brasileiro, mas **exclui a agropecuária** das obrigações. Para o produtor rural, o caminho é o **mercado voluntário**, com certificação por padrões como Verra VCS ou Gold Standard.',
      );
    case 'padrao':
      return r(
        `Você selecionou **${p.padrao}**. O **Verra VCS** é o mais usado em projetos agrícolas e florestais; o **Gold Standard** dá ênfase a cobenefícios sociais e ambientais. A escolha depende do tipo de projeto e de quem compra os créditos.`,
      );
    case 'valor':
      return r(
        'Não estimo valores em reais: o preço do crédito varia muito com o padrão, o tipo de projeto e o comprador. O que calculo é a **quantidade** potencial de créditos (1 crédito = 1 tCO2e) — pergunte “quantos créditos?”.',
      );
    case 'car':
      return r(`O **CAR** (Cadastro Ambiental Rural) registra o imóvel, as APPs e a Reserva Legal no SICAR. Sem ele não há como comprovar a regularidade ambiental. Na sua avaliação: ${item('car').note}`);
    case 'mrv':
      return r(`**MRV** é o plano de monitoramento, relato e verificação: como as remoções serão medidas e auditadas por terceira parte. Na sua avaliação: ${item('mrv').note}`);
    case 'desmatamento':
      return r(`Padrões voluntários costumam recusar áreas com supressão recente de vegetação nativa. Na sua avaliação: ${item('desmatamento').note}`);
    case 'reserva':
      return r(`**${item('rl').label}**: ${item('rl').note}`);
    case 'praticas':
      return r(
        'Práticas do Plano ABC+ consideradas (fatores ilustrativos):',
        praticas.map((x) => {
          const adotada = p.praticas.includes(x.id);
          return {
            id: x.id,
            label: x.nome,
            status: adotada ? ('ok' as const) : ('pendente' as const),
            note: `${fmt(x.fatorTco2eHaAno)} tCO2e/ha/ano · ${adotada ? 'adotada' : 'não adotada'}`,
          };
        }),
      );
    case 'saudacao':
      return r('Olá! Sou o CarbonBot. Avalio se a propriedade pode gerar créditos de carbono no mercado voluntário e estimo o potencial.');
    case 'ajuda':
      return r(
        'Posso falar sobre **o que falta** para se qualificar, **estimativa de créditos**, **Reserva Legal**, **práticas elegíveis**, **padrão de certificação**, **CAR**, **MRV** e **mercado regulado**.',
      );
    case 'agradecimento':
      return r('De nada! Se precisar, é só perguntar.');
    case null:
      return r('Não entendi bem. Tente: “o que falta?”, “quantos créditos?”, “Reserva Legal”, “práticas elegíveis” ou “mercado regulado?”.');
  }

  // Daqui em diante a resposta depende da avaliação
  if (!avaliado) return r(precisaAvaliar);
  switch (c.intencao) {
    case 'creditos':
      if (!e.praticaBase) return r('Selecione ao menos uma prática de baixo carbono para eu estimar os créditos.');
      return r(
        `Estimativa **ilustrativa**: ${fmt(e.areaProdutivaHa)} ha produtivos × ${fmt(e.praticaBase.fatorTco2eHaAno)} tCO2e/ha/ano (${e.praticaBase.nome}) = **${fmt(e.potencialTco2eAno)} tCO2e/ano**. Descontando ${e.bufferPct}% de buffer de não permanência: **~${fmt(e.creditosAno)} crédito(s)/ano** (1 crédito = 1 tCO2e).` +
          (ruins.length ? ` Atenção: ${ruins.length} critério(s) ainda precisam ser resolvidos antes da certificação.` : ''),
      );
    case 'faltas':
      return ruins.length
        ? r('Para se qualificar, ajuste:', ruins)
        : r('Todos os critérios avaliados estão atendidos. O próximo passo é estruturar o projeto junto a uma certificadora.');
    default:
      return r(
        `**${a.resumo.ok}** de **${a.items.length}** critérios atendidos (**${a.resumo.score}%**) para o padrão **${p.padrao}**.` +
          (ruins.length ? ` Pendências: ${ruins.length}.` : '') +
          ` Potencial estimado: **~${fmt(e.creditosAno)} crédito(s)/ano**.`,
      );
  }
}
