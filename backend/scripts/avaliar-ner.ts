import { avaliarNer, carregarCorpus } from '../src/ner/avaliacao';
import { DICIONARIO_PADRAO } from '../src/ner/dicionario-padrao';

/* Uso: npm run avaliar:ner [-- --erros] [-- --json]
   Imprime precisão, revocação e F1 do NER contra o corpus anotado (backend/avaliacao). */

const args = new Set(process.argv.slice(2));
const r = avaliarNer(carregarCorpus(), DICIONARIO_PADRAO);

if (args.has('--json')) {
  console.log(JSON.stringify(r, null, 2));
} else {
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`.padStart(7);
  const linha = (nome: string, m: (typeof r)['geral']) =>
    `${nome.padEnd(11)} ${pct(m.precisao)} ${pct(m.revocacao)} ${pct(m.f1)}   ${String(m.tp).padStart(4)} ${String(m.fp).padStart(4)} ${String(m.fn).padStart(4)}`;

  console.log(`\nAvaliação do NER — ${r.casos} laudos anotados\n`);
  console.log(`${'Tipo'.padEnd(11)} ${'Precisão'.padStart(7)} ${'Revoc.'.padStart(7)} ${'F1'.padStart(7)}   ${'TP'.padStart(4)} ${'FP'.padStart(4)} ${'FN'.padStart(4)}`);
  for (const [tipo, m] of Object.entries(r.porTipo)) console.log(linha(tipo === 'AUSENTES' ? '↳ ausentes' : tipo, m));
  console.log('-'.repeat(56));
  console.log(linha('GERAL', r.geral));
  console.log(
    `\nÚltima inspeção correta: ${r.campos.ultimaInspecao.acertos}/${r.campos.ultimaInspecao.total}` +
      ` · Nº do laudo correto: ${r.campos.laudoNumero.acertos}/${r.campos.laudoNumero.total}`,
  );
  console.log(`Laudos sem nenhum erro: ${r.casos - r.erros.length}/${r.casos}`);
  console.log('(TP = acertos, FP = sobrou, FN = faltou. "ausentes" é a negação, já contada nos tipos.)');

  if (r.erros.length) {
    console.log(`\nLaudos com divergência${args.has('--erros') ? '' : ' (use --erros para detalhar)'}:`);
    for (const e of r.erros) {
      console.log(`  - ${e.id}`);
      if (args.has('--erros')) {
        for (const f of e.faltou) console.log(`      faltou: ${f}`);
        for (const s of e.sobrou) console.log(`      sobrou: ${s}`);
      }
    }
  }
  console.log();
}
