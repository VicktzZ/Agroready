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
    expect(avaliarCarbono(prop(), CERRADO, PRATICAS).score).toBe(100);
  });

  it('déficit de Reserva Legal vira risco', () => {
    const r = avaliarCarbono(prop({ rl: 30 }), CERRADO, PRATICAS);
    expect(r.items.find((i) => i.id === 'rl')).toMatchObject({ status: 'risco', note: expect.stringContaining('5 p.p.') });
    expect(r.score).toBe(83);
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
  it('responde a estimativa só depois de avaliar', () => {
    const r = avaliarCarbono(prop(), CERRADO, PRATICAS);
    expect(responderCarbono('quantos créditos?', prop(), false, PRATICAS, r)).toContain('Avaliar elegibilidade');
    expect(responderCarbono('quantos créditos?', prop(), true, PRATICAS, r)).toContain('~112 crédito(s)/ano');
  });
});
