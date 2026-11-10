import type { ResultadoNer } from '../ner/ner';
import { avaliarExportacao, ContextoExportacao, extrairSlot, responderExportacao } from './export.engine';

const ent: ResultadoNer = {
  items: [],
  pragas: ['percevejo-marrom', 'broca-do-café'],
  doencas: [],
  culturas: ['soja', 'café'],
  talhoes: ['talhão 03', 'talhão 07'],
  negadas: [],
  datas: [],
  ultimaInspecao: '2026-08-20',
  laudoNumero: '2026/0842',
  propriedade: null,
  local: null,
  talhoesDetalhe: [
    { talhao: 'talhão 03', cultura: 'soja', areaHa: 42, pragas: ['percevejo-marrom'], doencas: [], inspecao: '2026-08-14' },
    { talhao: 'talhão 07', cultura: 'café', areaHa: 18, pragas: ['broca-do-café'], doencas: [], inspecao: '2026-08-20' },
  ],
  estatisticas: { caracteres: 0, tokens: 0, sentencas: 0 },
};

const DESTINOS = [
  { id: 'ue', nome: 'União Europeia', nomeEn: 'European Union' },
  { id: 'china', nome: 'China', nomeEn: 'China' },
];

const ctx = (over: Partial<ContextoExportacao> = {}): ContextoExportacao => ({
  ent,
  regra: { maxDias: 30, bloqueios: ['percevejo-marrom', 'broca-do-café'], docs: ['Doc A'] },
  destino: DESTINOS[0],
  cultura: { id: 'soja', nome: 'Soja', nomeEn: 'Soybean' },
  embarque: '2026-09-10',
  docsConfirmados: [],
  ...over,
});

const status = (c: ContextoExportacao) =>
  Object.fromEntries(avaliarExportacao(c).items.map((i) => [i.id, i.status]));

describe('avaliarExportacao', () => {
  it('cruza só os talhões da cultura com a regra do destino', () => {
    expect(status(ctx())).toEqual({
      laudo: 'ok',
      cultura: 'ok',
      prazo: 'ok',
      'b-percevejo-marrom': 'risco',
      'b-broca-do-café': 'ok', // a broca está no talhão de café, não no de soja
      'doc-0': 'pendente',
    });
    const r = avaliarExportacao(ctx());
    expect(r.dias).toBe(27); // inspeção do talhão de soja (14/08), não a mais recente do laudo
    expect(r.items.find((i) => i.id === 'b-percevejo-marrom')!.note).toContain('talhão 03');
    expect(r.resumo).toEqual({ ok: 4, pendente: 1, risco: 1, score: 67, situacao: 'risco' });
  });

  it('sem talhões da cultura, usa o laudo inteiro', () => {
    expect(status(ctx({ ent: { ...ent, talhoesDetalhe: [] } }))).toMatchObject({ 'b-broca-do-café': 'risco' });
  });

  it('marca prazo vencido e documento confirmado', () => {
    expect(status(ctx({ embarque: '2026-09-20', docsConfirmados: ['Doc A'] }))).toMatchObject({
      prazo: 'risco',
      'doc-0': 'ok',
    });
  });

  it('sem laudo, tudo fica pendente', () => {
    expect(new Set(Object.values(status(ctx({ ent: null }))))).toEqual(new Set(['pendente']));
  });

  it('traduz a checklist', () => {
    expect(avaliarExportacao(ctx(), 'en').items[1].label).toBe('Report covers the crop (Soybean)');
  });
});

describe('extrairSlot', () => {
  it('acha o destino citado e devolve a pergunta sem ele', () => {
    expect(extrairSlot('O que a China exige?', DESTINOS)).toEqual({ achado: DESTINOS[1], resto: 'o que a exige' });
    expect(extrairSlot('e para a união europeia?', DESTINOS).achado).toBe(DESTINOS[0]);
    expect(extrairSlot('o que falta?', DESTINOS).achado).toBeNull();
  });
});

describe('responderExportacao', () => {
  it('responde pendências no idioma pedido, com os itens', () => {
    const r = responderExportacao('what is pending?', 'en', ctx());
    expect(r.analise.intencao).toBe('pendencias');
    expect(r.texto).toContain('**1** at risk');
    expect(r.itens!.map((i) => i.id)).toEqual(['b-percevejo-marrom', 'doc-0']); // risco primeiro
  });

  it('entende variações da mesma pergunta', () => {
    expect(responderExportacao('quais são as pragas do laudo?', 'pt', ctx()).texto).toContain('percevejo-marrom');
    expect(responderExportacao('que documentação eu preciso?', 'pt', ctx()).itens![0].doc).toBe('Doc A');
    expect(responderExportacao('a inspeção ainda está no prazo?', 'pt', ctx()).texto).toContain('**27** dia(s)');
    expect(responderExportacao('quais são os requisitos do destino?', 'pt', ctx()).texto).toContain('**30** dias');
  });

  it('responde sobre uma praga citada na pergunta', () => {
    const r = responderExportacao('posso exportar com', 'pt', ctx(), { citados: ['percevejo-marrom'] });
    expect(r.analise.intencao).toBe('termo');
    expect(r.texto).toContain('foi detectado** no laudo (talhão 03)');
  });

  it('sem laudo, pede o laudo; sem entender, diz que não entendeu', () => {
    expect(responderExportacao('o que falta?', 'pt', ctx({ ent: null })).texto).toContain('Ainda não há laudo');
    expect(responderExportacao('qual a previsão do tempo?', 'pt', ctx()).analise.intencao).toBeNull();
  });

  it('pergunta só com o destino vira resumo', () => {
    expect(responderExportacao('e para a', 'pt', ctx(), { trocouContexto: true }).analise.intencao).toBe('resumo');
  });
});
