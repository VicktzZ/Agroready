import { avaliarCarbono, estimarCreditos, Propriedade, responderCarbono } from './carbono.engine';

const PRATICAS = [
  { id: 'pd', nome: 'Plantio direto', fatorTco2eHaAno: 0.5 },
  { id: 'ilpf', nome: 'ILPF', fatorTco2eHaAno: 1.8 },
];
const CERRADO = { nome: 'Cerrado', reservaLegalMin: 35 };
const prop = (over: Partial<Propriedade> = {}): Propriedade => ({
  bioma: 'cerrado',
  area: 120,
  rl: 35,
  car: true,
  desmatamento: false,
  praticas: ['pd', 'ilpf'],
  mrv: true,
  padrao: 'Verra VCS',
  ...over,
});

describe('avaliarCarbono', () => {
  it('100% quando todos os critérios são atendidos', () => {
    expect(avaliarCarbono(prop(), CERRADO, PRATICAS).resumo).toMatchObject({ score: 100, situacao: 'ok' });
  });

  it('déficit de Reserva Legal vira risco', () => {
    const r = avaliarCarbono(prop({ rl: 30 }), CERRADO, PRATICAS);
    expect(r.items.find((i) => i.id === 'rl')).toMatchObject({ status: 'risco', note: expect.stringContaining('5 p.p.') });
    expect(r.resumo).toMatchObject({ score: 83, situacao: 'risco' });
  });
});

describe('estimarCreditos', () => {
  it('usa a prática de maior fator sobre a área produtiva, sem dupla contagem', () => {
    expect(estimarCreditos(prop(), PRATICAS)).toEqual({
      areaProdutivaHa: 78, // 120 ha − 35% de RL
      praticaBase: { id: 'ilpf', nome: 'ILPF', fatorTco2eHaAno: 1.8 },
      potencialTco2eAno: 140.4,
      bufferPct: 20,
      creditosAno: 112, // floor(140,4 × 0,8)
    });
  });

  it('sem prática adotada, não há crédito', () => {
    expect(estimarCreditos(prop({ praticas: [] }), PRATICAS)).toMatchObject({ praticaBase: null, creditosAno: 0 });
  });
});

describe('responderCarbono', () => {
  const perguntar = (msg: string, p = prop(), avaliado = true) =>
    responderCarbono(msg, p, avaliado, PRATICAS, avaliarCarbono(p, CERRADO, PRATICAS));

  it('responde a estimativa só depois de avaliar', () => {
    expect(perguntar('quantos créditos?', prop(), false).texto).toContain('Avaliar elegibilidade');
    expect(perguntar('quantos créditos?').texto).toContain('~112 crédito(s)/ano');
  });

  it('entende variações e lista o que falta', () => {
    const r = perguntar('o que ainda está faltando pra eu me qualificar?', prop({ rl: 30, mrv: false }));
    expect(r.analise.intencao).toBe('faltas');
    expect(r.itens!.map((i) => i.id)).toEqual(['rl', 'mrv']); // risco primeiro
    expect(perguntar('sou obrigado a participar do mercado regulado?').texto).toContain('exclui a agropecuária');
    expect(perguntar('qual é a reserva legal mínima?').texto).toContain('Reserva Legal ≥ 35%');
    expect(perguntar('quais práticas são elegíveis?').itens).toHaveLength(2);
  });

  it('não inventa preço de crédito', () => {
    expect(perguntar('quanto vale um crédito de carbono?').texto).toContain('Não estimo valores');
  });
});
