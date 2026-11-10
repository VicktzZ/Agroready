import { criarClassificador, distancia, palavras, parecidas, radical, tokenizar } from './pln';

describe('tokenizar', () => {
  it('normaliza e mantém os offsets do texto original', () => {
    const texto = 'Ferrugem-Asiática no Talhão 03.';
    const tokens = tokenizar(texto);
    expect(tokens.map((t) => t.norma)).toEqual(['ferrugem', 'asiatica', 'no', 'talhao', '03']);
    for (const t of tokens) expect(texto.slice(t.inicio, t.fim)).toBe(t.texto);
  });

  it('descarta stopwords', () => {
    expect(palavras('O que está pendente para a China?')).toEqual(['pendente', 'china']);
  });
});

describe('radical', () => {
  it.each([
    [['pendente', 'pendentes', 'pendencia', 'pendencias'], 'pend'],
    [['exige', 'exigem', 'exigido', 'exigencia', 'exigencias'], 'exig'],
    [['documento', 'documentos', 'documentacao'], 'document'],
    [['exportar', 'exportacao', 'exportando'], 'export'],
    [['elegivel', 'elegiveis', 'elegibilidade'], 'eleg'],
    [['falta', 'faltam', 'faltando', 'faltou'], 'falt'],
    [['percevejo', 'percevejos'], 'percevej'],
    [['marrom', 'marrons'], 'marrom'],
  ])('reduz %j a "%s"', (formas, esperado) => {
    for (const f of formas) expect(radical(f)).toBe(esperado);
  });

  it('não mexe em palavras curtas nem em números', () => {
    expect(radical('sem')).toBe('sem');
    expect(radical('2026')).toBe('2026');
  });
});

describe('distância de edição', () => {
  it('conta inserções, remoções, trocas e transposições', () => {
    expect(distancia('ferrugem', 'ferugem')).toBe(1);
    expect(distancia('pendnete', 'pendente')).toBe(1);
    expect(distancia('previsao', 'preciso')).toBe(2);
    expect(distancia('soja', 'soja')).toBe(0);
  });

  it('tolera erro de digitação só em palavras longas', () => {
    expect(parecidas('ferugem', 'ferrugem')).toBe(true);
    expect(parecidas('previsao', 'preciso')).toBe(false);
    expect(parecidas('alvo', 'alta')).toBe(false);
    expect(parecidas('soja', 'sopa')).toBe(false);
  });
});

describe('criarClassificador', () => {
  const classificar = criarClassificador([
    { id: 'pendencias', exemplos: ['o que está pendente', 'o que falta', 'quais pendências', 'what is pending'] },
    { id: 'documentos', exemplos: ['quais documentos preciso', 'documentação exigida', 'which documents'] },
    { id: 'prazo', exemplos: ['prazo da inspeção', 'a inspeção está no prazo', 'inspection deadline'] },
  ]);

  it('reconhece variações morfológicas e outro idioma', () => {
    expect(classificar('quais são as pendências?').intencao).toBe('pendencias');
    expect(classificar('o que ainda está faltando?').intencao).toBe('pendencias');
    expect(classificar('preciso de qual documentação?').intencao).toBe('documentos');
    expect(classificar('is the inspection deadline ok?').intencao).toBe('prazo');
  });

  it('corrige erro de digitação', () => {
    expect(classificar('o que esta pendnete').intencao).toBe('pendencias');
  });

  it('devolve null quando não entende', () => {
    const r = classificar('qual a previsão do tempo amanhã?');
    expect(r.intencao).toBeNull();
    expect(r.confianca).toBeLessThan(0.3);
  });
});
