import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, TipoEntidade } from '../src/generated/prisma/client';

/* Dados ILUSTRATIVOS migrados de frontend/js/data.js (Sprint Zero).
   Idempotente: pode rodar várias vezes. */

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const TERMOS: Record<TipoEntidade, string[]> = {
  PRAGA: ['lagarta-da-soja', 'percevejo-marrom', 'broca-do-café', 'bicho-mineiro', 'mosca-branca'],
  DOENCA: ['ferrugem-asiática', 'mancha-alvo', 'antracnose', 'ferrugem-do-cafeeiro', 'cercosporiose', 'mofo-branco'],
  CULTURA: ['soja', 'café'],
};

const DESTINOS = [
  { id: 'ue', nome: 'União Europeia', nomeEn: 'European Union' },
  { id: 'eua', nome: 'Estados Unidos', nomeEn: 'United States' },
  { id: 'china', nome: 'China', nomeEn: 'China' },
];

const CULTURAS = [
  { id: 'soja', nome: 'Soja', nomeEn: 'Soybean' },
  { id: 'café', nome: 'Café', nomeEn: 'Coffee' },
];

const EUDR = ['Declaração de rastreabilidade de origem', 'Comprovante de conformidade EUDR (sem desmatamento)'];
const GACC = ['Registro da exportadora no GACC', 'Certificado de tratamento fitossanitário'];
const REGRAS = [
  { destinoId: 'ue', culturaId: 'soja', maxDias: 30, bloqueios: ['percevejo-marrom'], docs: EUDR },
  { destinoId: 'ue', culturaId: 'café', maxDias: 30, bloqueios: ['broca-do-café'], docs: EUDR },
  { destinoId: 'eua', culturaId: 'soja', maxDias: 14, bloqueios: ['ferrugem-asiática'], docs: ['Permit USDA APHIS (PPQ)', 'Prior Notice — FDA'] },
  { destinoId: 'eua', culturaId: 'café', maxDias: 14, bloqueios: ['broca-do-café'], docs: ['Prior Notice — FDA', 'Registro de instalação — FDA'] },
  { destinoId: 'china', culturaId: 'soja', maxDias: 21, bloqueios: ['mosca-branca'], docs: GACC },
  { destinoId: 'china', culturaId: 'café', maxDias: 21, bloqueios: ['bicho-mineiro'], docs: GACC },
];

const BIOMAS = [
  { id: 'amazonia', nome: 'Amazônia', reservaLegalMin: 80 },
  { id: 'cerrado', nome: 'Cerrado', reservaLegalMin: 35 },
  { id: 'mata', nome: 'Mata Atlântica', reservaLegalMin: 20 },
  { id: 'pampa', nome: 'Pampa', reservaLegalMin: 20 },
  { id: 'caatinga', nome: 'Caatinga', reservaLegalMin: 20 },
  { id: 'pantanal', nome: 'Pantanal', reservaLegalMin: 20 },
];

// Fatores FICTÍCIOS de remoção/redução (tCO2e/ha/ano) — só para a calculadora do protótipo.
const PRATICAS = [
  { id: 'ilpf', nome: 'Integração Lavoura-Pecuária-Floresta (ILPF)', fatorTco2eHaAno: 1.8 },
  { id: 'pd', nome: 'Plantio direto na palha', fatorTco2eHaAno: 0.5 },
  { id: 'rpd', nome: 'Recuperação de pastagens degradadas', fatorTco2eHaAno: 1.2 },
  { id: 'flor', nome: 'Florestas plantadas', fatorTco2eHaAno: 5.0 },
  { id: 'bio', nome: 'Bioinsumos / fixação biológica de nitrogênio', fatorTco2eHaAno: 0.3 },
];

async function main() {
  for (const [tipo, termos] of Object.entries(TERMOS) as [TipoEntidade, string[]][]) {
    for (const termo of termos) {
      await prisma.termoNer.upsert({ where: { termo }, create: { tipo, termo }, update: { tipo } });
    }
  }
  for (const d of DESTINOS) await prisma.destino.upsert({ where: { id: d.id }, create: d, update: d });
  for (const c of CULTURAS) await prisma.cultura.upsert({ where: { id: c.id }, create: c, update: c });
  for (const b of BIOMAS) await prisma.bioma.upsert({ where: { id: b.id }, create: b, update: b });
  for (const p of PRATICAS) await prisma.praticaCarbono.upsert({ where: { id: p.id }, create: p, update: p });
  for (const r of REGRAS) {
    const where = { destinoId_culturaId: { destinoId: r.destinoId, culturaId: r.culturaId } };
    await prisma.regraExportacao.upsert({ where, create: r, update: r });
  }
  console.log('Seed concluído.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
