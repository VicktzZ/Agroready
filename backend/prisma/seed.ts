import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { gerarHash } from '../src/auth/senha';
import { PrismaClient, TipoEntidade } from '../src/generated/prisma/client';

/* Dados ILUSTRATIVOS de referência + conta de administrador.
   Idempotente: pode rodar várias vezes. */

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const TERMOS: Record<TipoEntidade, string[]> = {
  PRAGA: [
    'lagarta-da-soja', 'lagarta-falsa-medideira', 'percevejo-marrom', 'percevejo-verde', 'mosca-branca',
    'ácaro-vermelho', 'nematoide-de-cisto', 'nematoide-das-galhas', 'broca-do-café', 'bicho-mineiro', 'cochonilha-da-raiz',
  ],
  DOENCA: [
    'ferrugem-asiática', 'mancha-alvo', 'antracnose', 'mofo-branco', 'oídio', 'cancro-da-haste', 'podridão-radicular',
    'ferrugem-do-cafeeiro', 'cercosporiose', 'mancha-de-phoma', 'mancha-aureolada',
  ],
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

// Fatores FICTÍCIOS de remoção/redução (tCO2e/ha/ano) — só para a calculadora ilustrativa.
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
      await prisma.termoNer.upsert({ where: { termo }, create: { tipo, termo }, update: {} });
    }
  }
  // `update: {}` nos catálogos: não sobrescreve o que o administrador editou pela aplicação
  for (const d of DESTINOS) await prisma.destino.upsert({ where: { id: d.id }, create: d, update: {} });
  for (const c of CULTURAS) await prisma.cultura.upsert({ where: { id: c.id }, create: c, update: {} });
  for (const b of BIOMAS) await prisma.bioma.upsert({ where: { id: b.id }, create: b, update: {} });
  for (const p of PRATICAS) await prisma.praticaCarbono.upsert({ where: { id: p.id }, create: p, update: {} });
  for (const r of REGRAS) {
    const where = { destinoId_culturaId: { destinoId: r.destinoId, culturaId: r.culturaId } };
    await prisma.regraExportacao.upsert({ where, create: r, update: {} });
  }

  // Administrador (credenciais no .env). Não troca a senha de uma conta que já existe.
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const senha = process.env.ADMIN_PASSWORD;
  if (!email || !senha) {
    console.warn('ADMIN_EMAIL/ADMIN_PASSWORD não definidos: nenhum administrador criado.');
  } else {
    const admin = await prisma.usuario.upsert({
      where: { email },
      create: { nome: 'Administrador', email, senhaHash: await gerarHash(senha), papel: 'ADMIN' },
      update: { papel: 'ADMIN' },
    });
    // laudos criados antes de existir login passam a pertencer ao administrador
    const { count } = await prisma.laudo.updateMany({ where: { usuarioId: null }, data: { usuarioId: admin.id } });
    console.log(`Administrador: ${email}${count ? ` (${count} laudo(s) antigo(s) atribuído(s))` : ''}`);
  }
  console.log('Seed concluído.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
