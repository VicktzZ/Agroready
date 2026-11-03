import { extractEntities } from './ner';

const DICT = {
  PRAGA: ['percevejo-marrom', 'broca-do-café'],
  DOENCA: ['ferrugem-asiática', 'cercosporiose'],
  CULTURA: ['soja', 'café'],
};
const LAUDO = `LAUDO FITOSSANITÁRIO Nº 2026/0842
Talhão 03 (soja, 42 ha): inspeção realizada em 12/08/2026. Constatada Ferrugem Asiática e percevejo-marrom. Aplicação em 20/08/2026.
Talhão 07 (café, 18 ha): inspeção realizada em 14/08/2026. Detectada broca do café.`;

describe('extractEntities', () => {
  const r = extractEntities(LAUDO, DICT);

  it('gera o resumo estruturado do laudo', () => {
    expect(r.laudoNumero).toBe('2026/0842');
    expect(r.culturas).toEqual(['soja', 'café']);
    expect([...r.pragas].sort()).toEqual(['broca-do-café', 'percevejo-marrom']);
    expect(r.doencas).toEqual(['ferrugem-asiática']); // hífen casa com espaço; ignora caixa/acento
    expect(r.talhoes).toEqual(['talhão 03', 'talhão 07']);
    expect(r.ultimaInspecao).toBe('2026-08-14'); // 20/08 é aplicação, não inspeção
  });

  it('mantém índices alinhados ao texto original', () => {
    for (const e of r.items) expect(LAUDO.slice(e.start, e.end)).toBe(e.text);
  });

  it('trata termo do dicionário como literal, não como regex', () => {
    const dict = { PRAGA: ['(a+)'], DOENCA: [], CULTURA: [] };
    expect(extractEntities('praga (a+) aqui', dict).pragas).toEqual(['(a+)']);
  });
});
