import type { ResultadoNer } from '../ner/ner';
import { avaliarExportacao, ContextoExportacao, responderExportacao } from './export.engine';

const ent: ResultadoNer = {
  items: [],
  pragas: ['percevejo-marrom'],
  doencas: [],
  culturas: ['soja'],
  talhoes: ['talhão 03'],
  datas: [],
  ultimaInspecao: '2026-08-14',
  laudoNumero: '2026/0842',
};

const ctx = (over: Partial<ContextoExportacao> = {}): ContextoExportacao => ({
  ent,
  regra: { maxDias: 30, bloqueios: ['percevejo-marrom'], docs: ['Doc A'] },
  destino: { id: 'ue', nome: 'União Europeia', nomeEn: 'European Union' },
  cultura: { id: 'soja', nome: 'Soja', nomeEn: 'Soybean' },
  embarque: '2026-09-10',
  docsConfirmados: [],
  ...over,
});

const status = (c: ContextoExportacao) =>
  Object.fromEntries(avaliarExportacao(c).items.map((i) => [i.id, i.status]));

describe('avaliarExportacao', () => {
  it('cruza o laudo com a regra do destino', () => {
    expect(status(ctx())).toEqual({
      laudo: 'ok',
      cultura: 'ok',
      prazo: 'ok',
      'b-percevejo-marrom': 'risco',
      'doc-0': 'pendente',
    });
    expect(avaliarExportacao(ctx()).dias).toBe(27);
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
});

describe('responderExportacao', () => {
  it('responde pendências no idioma pedido', () => {
    expect(responderExportacao('what is pending?', 'en', ctx())).toContain('1</b> at risk');
    expect(responderExportacao('quais pragas?', 'pt', ctx())).toContain('percevejo-marrom');
  });
});
