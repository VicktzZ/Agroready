import { extractEntities } from './ner';

const DICT = {
  PRAGA: ['percevejo-marrom', 'broca-do-café', 'mosca-branca'],
  DOENCA: ['ferrugem-asiática', 'cercosporiose', 'mancha-alvo', 'antracnose'],
  CULTURA: ['soja', 'café'],
};
const LAUDO = `LAUDO FITOSSANITÁRIO Nº 2026/0842
Propriedade: Fazenda Santa Clara — Município de Cristalina/GO

Talhão 03 (soja, 42 ha): inspeção realizada em 12/08/2026. Constatada Ferrugem Asiática e percevejo-marrom. Aplicação em 20/08/2026.

Talhão 07 (café, 18,5 ha): inspeção realizada em 14 de agosto de 2026. Detectada broca do café.`;

describe('extractEntities', () => {
  const r = extractEntities(LAUDO, DICT);

  it('gera o resumo estruturado do laudo', () => {
    expect(r.laudoNumero).toBe('2026/0842');
    expect(r.propriedade).toBe('Fazenda Santa Clara');
    expect(r.local).toBe('Cristalina/GO');
    expect(r.culturas).toEqual(['soja', 'café']);
    expect([...r.pragas].sort()).toEqual(['broca-do-café', 'percevejo-marrom']);
    expect(r.doencas).toEqual(['ferrugem-asiática']); // hífen casa com espaço; ignora caixa/acento
    expect(r.talhoes).toEqual(['talhão 03', 'talhão 07']);
    expect(r.ultimaInspecao).toBe('2026-08-14'); // data por extenso; 20/08 é aplicação, não inspeção
  });

  it('agrupa as ocorrências por talhão', () => {
    expect(r.talhoesDetalhe).toEqual([
      { talhao: 'talhão 03', cultura: 'soja', areaHa: 42, pragas: ['percevejo-marrom'], doencas: ['ferrugem-asiática'], inspecao: '2026-08-12' },
      { talhao: 'talhão 07', cultura: 'café', areaHa: 18.5, pragas: ['broca-do-café'], doencas: [], inspecao: '2026-08-14' },
    ]);
  });

  it('mantém índices alinhados ao texto original', () => {
    for (const e of r.items) expect(LAUDO.slice(e.start, e.end)).toBe(e.text);
  });

  it('aceita erro de digitação e plural, marcando como aproximado', () => {
    const x = extractEntities('Foram vistos percevejos-marrons e sinais de ferugem asiatica.', DICT);
    expect(x.pragas).toEqual(['percevejo-marrom']);
    expect(x.doencas).toEqual(['ferrugem-asiática']);
    expect(x.items.every((e) => e.aproximado)).toBe(true);
  });

  it('não confunde palavras curtas parecidas', () => {
    expect(extractEntities('Mancha alta na folha de sopa.', DICT).items).toEqual([]);
  });

  it('entende negação, inclusive em enumeração, e o "mas"', () => {
    const x = extractEntities(
      'Talhão 01 (soja): ausência de mosca-branca, mancha-alvo e antracnose. Não foi constatada cercosporiose, mas há percevejo-marrom.',
      DICT,
    );
    expect(x.pragas).toEqual(['percevejo-marrom']);
    expect(x.doencas).toEqual([]);
    expect([...x.negadas].sort()).toEqual(['antracnose', 'cercosporiose', 'mancha-alvo', 'mosca-branca']);
  });

  it('ignora datas impossíveis', () => {
    expect(extractEntities('Inspeção em 31/02/2026.', DICT).datas).toEqual([]);
  });

  it('ignora termo do dicionário sem letras suficientes (e não o trata como regex)', () => {
    const dict = { PRAGA: ['(a+)'], DOENCA: [], CULTURA: [] };
    expect(extractEntities('praga (a+) aqui', dict).pragas).toEqual([]);
  });
});
