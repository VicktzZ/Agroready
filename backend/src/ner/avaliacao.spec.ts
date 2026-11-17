import { AUSENTES, avaliarNer, carregarCorpus } from './avaliacao';
import { DICIONARIO_PADRAO } from './dicionario-padrao';

/* Guarda de regressão do NER: se uma mudança piorar a extração, estes testes quebram.
   O corpus foi anotado pelo próprio desenvolvedor, então os números medem regressão, não qualidade
   em laudos reais (para isso, anotar laudos de terceiros). */

describe('corpus anotado', () => {
  const corpus = carregarCorpus();
  const termos = new Set(Object.values(DICIONARIO_PADRAO).flat());

  it('é consistente: ids únicos, termos existentes no dicionário e datas ISO', () => {
    expect(new Set(corpus.map((c) => c.id)).size).toBe(corpus.length);
    for (const caso of corpus) {
      for (const fato of caso.esperado.entidades) {
        const [tipo, resto] = [fato.split(':')[0], fato.slice(fato.indexOf(':') + 1).replace('!ausente', '')];
        if (['PRAGA', 'DOENCA', 'CULTURA'].includes(tipo)) expect(termos).toContain(resto); // gabarito sem erro de digitação
        if (tipo === 'DATA') expect(resto).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        if (tipo === 'TALHAO') expect(resto).toMatch(/^talhão \w+$/);
      }
    }
  });

  it('tem tamanho e variedade mínimos', () => {
    expect(corpus.length).toBeGreaterThanOrEqual(30);
    const ausentes = corpus.flatMap((c) => c.esperado.entidades).filter((f) => f.endsWith('!ausente'));
    expect(ausentes.length).toBeGreaterThanOrEqual(15); // negação bem representada
  });
});

describe('avaliarNer', () => {
  const r = avaliarNer(carregarCorpus(), DICIONARIO_PADRAO);

  it('mantém o F1 geral e a precisão', () => {
    expect(r.geral.f1).toBeGreaterThanOrEqual(0.98);
    expect(r.geral.precisao).toBeGreaterThanOrEqual(0.98);
  });

  it('mantém a negação (entidades citadas como ausentes)', () => {
    expect(r.porTipo[AUSENTES].f1).toBeGreaterThanOrEqual(0.95);
  });

  it('acerta a última inspeção e o número do laudo em todos os casos', () => {
    expect(r.campos.ultimaInspecao.acertos).toBe(r.campos.ultimaInspecao.total);
    expect(r.campos.laudoNumero.acertos).toBe(r.campos.laudoNumero.total);
  });

  it('calcula as métricas corretamente (contagem à mão)', () => {
    const pequeno = avaliarNer(
      [
        { id: 'a', texto: 'Talhão 01 (soja): inspeção em 01/10/2026. Sem mosca-branca.', esperado: { entidades: ['CULTURA:soja', 'TALHAO:talhão 01', 'DATA:2026-10-01', 'PRAGA:mosca-branca!ausente', 'PRAGA:tripes'], ultimaInspecao: '2026-10-01', laudoNumero: null } },
      ],
      DICIONARIO_PADRAO,
    );
    // achou 4 dos 5 esperados e nada a mais: tp=4, fp=0, fn=1 (faltou PRAGA:tripes)
    expect(pequeno.geral).toMatchObject({ tp: 4, fp: 0, fn: 1 });
    expect(pequeno.geral.revocacao).toBeCloseTo(0.8);
    expect(pequeno.erros).toEqual([{ id: 'a', faltou: ['PRAGA:tripes'], sobrou: [] }]);
  });
});
