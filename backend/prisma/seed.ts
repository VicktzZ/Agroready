import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { gerarHash } from '../src/auth/senha';
import { PrismaClient, TipoEntidade } from '../src/generated/prisma/client';

/* Dados ILUSTRATIVOS de referência + conta de administrador.
   Idempotente: pode rodar várias vezes (roda a cada deploy na Vercel). Usa `update: {}`,
   então nunca sobrescreve o que o administrador editou pela aplicação. */

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

// ---------------------------------------------------------------- dicionário do NER
const TERMOS: Record<TipoEntidade, string[]> = {
  PRAGA: [
    // soja
    'lagarta-da-soja', 'lagarta-falsa-medideira', 'lagarta-helicoverpa', 'percevejo-marrom', 'percevejo-verde',
    'percevejo-barriga-verde', 'mosca-branca', 'ácaro-vermelho', 'ácaro-rajado', 'nematoide-de-cisto',
    'nematoide-das-galhas', 'pulgão', 'tripes',
    // café
    'broca-do-café', 'bicho-mineiro', 'cochonilha-da-raiz',
    // milho, algodão, cana, arroz e citros
    'lagarta-do-cartucho', 'lagarta-elasmo', 'cigarrinha-do-milho', 'gorgulho', 'bicudo-do-algodoeiro',
    'broca-da-cana', 'cigarrinha-das-raízes', 'percevejo-do-colmo', 'mosca-das-frutas', 'psilídeo-dos-citros',
    'ácaro-da-leprose',
  ],
  DOENCA: [
    // soja
    'ferrugem-asiática', 'mancha-alvo', 'antracnose', 'mofo-branco', 'oídio', 'cancro-da-haste', 'podridão-radicular',
    'mancha-parda', 'murcha-de-fusarium',
    // café
    'ferrugem-do-cafeeiro', 'cercosporiose', 'mancha-de-phoma', 'mancha-aureolada',
    // trigo, arroz, milho, algodão, cana e citros
    'brusone', 'giberela', 'ferrugem-da-folha', 'mancha-branca', 'míldio', 'podridão-do-colmo', 'ramulose',
    'ferrugem-alaranjada', 'carvão', 'cancro-cítrico', 'greening', 'mancha-preta-dos-citros',
  ],
  CULTURA: ['soja', 'café', 'milho', 'algodão', 'trigo', 'arroz', 'laranja', 'cana-de-açúcar'],
};

// ---------------------------------------------------------------- catálogos
const DESTINOS = [
  { id: 'ue', nome: 'União Europeia', nomeEn: 'European Union' },
  { id: 'eua', nome: 'Estados Unidos', nomeEn: 'United States' },
  { id: 'china', nome: 'China', nomeEn: 'China' },
  { id: 'japao', nome: 'Japão', nomeEn: 'Japan' },
  { id: 'reino-unido', nome: 'Reino Unido', nomeEn: 'United Kingdom' },
  { id: 'canada', nome: 'Canadá', nomeEn: 'Canada' },
  { id: 'india', nome: 'Índia', nomeEn: 'India' },
  { id: 'coreia-do-sul', nome: 'Coreia do Sul', nomeEn: 'South Korea' },
  { id: 'arabia-saudita', nome: 'Arábia Saudita', nomeEn: 'Saudi Arabia' },
];

const CULTURAS = [
  { id: 'soja', nome: 'Soja', nomeEn: 'Soybean' },
  { id: 'café', nome: 'Café', nomeEn: 'Coffee' },
  { id: 'milho', nome: 'Milho', nomeEn: 'Corn' },
  { id: 'algodao', nome: 'Algodão', nomeEn: 'Cotton' },
  { id: 'trigo', nome: 'Trigo', nomeEn: 'Wheat' },
  { id: 'arroz', nome: 'Arroz', nomeEn: 'Rice' },
  { id: 'laranja', nome: 'Laranja', nomeEn: 'Orange' },
  { id: 'cana-de-acucar', nome: 'Cana-de-açúcar', nomeEn: 'Sugarcane' },
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
  { id: 'saf', nome: 'Sistemas agroflorestais (SAF)', fatorTco2eHaAno: 3.2 },
  { id: 'restauracao', nome: 'Restauração de vegetação nativa', fatorTco2eHaAno: 6.0 },
  { id: 'cobertura', nome: 'Plantas de cobertura e adubação verde', fatorTco2eHaAno: 0.7 },
  { id: 'pasto-rotacionado', nome: 'Manejo rotacionado de pastagens', fatorTco2eHaAno: 0.9 },
  { id: 'dejetos', nome: 'Tratamento de dejetos animais', fatorTco2eHaAno: 0.8 },
  { id: 'irrigacao', nome: 'Irrigação eficiente', fatorTco2eHaAno: 0.4 },
];

// ---------------------------------------------------------------- regras de exportação
// Todas ILUSTRATIVAS. As 6 primeiras são as da versão original; o resto é gerado por destino × cultura.
const EUDR = ['Declaração de rastreabilidade de origem', 'Comprovante de conformidade EUDR (sem desmatamento)'];
const GACC = ['Registro da exportadora no GACC', 'Certificado de tratamento fitossanitário'];
const REGRAS_ORIGINAIS = [
  { destinoId: 'ue', culturaId: 'soja', maxDias: 30, bloqueios: ['percevejo-marrom'], docs: EUDR },
  { destinoId: 'ue', culturaId: 'café', maxDias: 30, bloqueios: ['broca-do-café'], docs: EUDR },
  { destinoId: 'eua', culturaId: 'soja', maxDias: 14, bloqueios: ['ferrugem-asiática'], docs: ['Permit USDA APHIS (PPQ)', 'Prior Notice — FDA'] },
  { destinoId: 'eua', culturaId: 'café', maxDias: 14, bloqueios: ['broca-do-café'], docs: ['Prior Notice — FDA', 'Registro de instalação — FDA'] },
  { destinoId: 'china', culturaId: 'soja', maxDias: 21, bloqueios: ['mosca-branca'], docs: GACC },
  { destinoId: 'china', culturaId: 'café', maxDias: 21, bloqueios: ['bicho-mineiro'], docs: GACC },
];

/** Prazo máximo da inspeção e documentos por destino (ilustrativos). */
const POR_DESTINO: Record<string, { maxDias: number; docs: string[] }> = {
  ue: { maxDias: 30, docs: EUDR },
  eua: { maxDias: 14, docs: ['Permit USDA APHIS (PPQ)', 'Prior Notice — FDA'] },
  china: { maxDias: 21, docs: GACC },
  japao: { maxDias: 21, docs: ['Certificado fitossanitário (MAFF)', 'Declaração de tratamento de fumigação'] },
  'reino-unido': { maxDias: 30, docs: ['Certificado fitossanitário (DEFRA)', 'Declaração de rastreabilidade de origem'] },
  canada: { maxDias: 14, docs: ['Permit CFIA', 'Certificado fitossanitário'] },
  india: { maxDias: 21, docs: ['Import Permit (Plant Quarantine Order)', 'Certificado fitossanitário'] },
  'coreia-do-sul': { maxDias: 21, docs: ['Certificado fitossanitário (APQA)', 'Declaração de tratamento de fumigação'] },
  'arabia-saudita': { maxDias: 30, docs: ['Certificado fitossanitário', 'Certificado de origem legalizado'] },
};

/** Pragas/doenças de maior risco por cultura (todas existem no dicionário acima). */
const RISCOS: Record<string, string[]> = {
  soja: ['percevejo-marrom', 'ferrugem-asiática', 'mosca-branca', 'lagarta-helicoverpa'],
  café: ['broca-do-café', 'bicho-mineiro', 'ferrugem-do-cafeeiro', 'cercosporiose'],
  milho: ['lagarta-do-cartucho', 'cigarrinha-do-milho', 'gorgulho', 'giberela'],
  algodao: ['bicudo-do-algodoeiro', 'ramulose', 'mosca-branca', 'ácaro-rajado'],
  trigo: ['brusone', 'giberela', 'ferrugem-da-folha', 'pulgão'],
  arroz: ['brusone', 'percevejo-do-colmo', 'mancha-parda', 'gorgulho'],
  laranja: ['cancro-cítrico', 'greening', 'mancha-preta-dos-citros', 'mosca-das-frutas'],
  'cana-de-acucar': ['broca-da-cana', 'cigarrinha-das-raízes', 'carvão', 'ferrugem-alaranjada'],
};

/** Documento extra por cultura (ilustrativo). */
const DOC_DA_CULTURA: Record<string, string> = {
  laranja: 'Declaração de área livre de cancro cítrico',
  algodao: 'Certificado de classificação do algodão (HVI)',
  'cana-de-acucar': 'Certificado de qualidade do açúcar',
};

const REGRAS = [
  ...REGRAS_ORIGINAIS,
  ...DESTINOS.flatMap((d, i) =>
    CULTURAS.map((c) => ({
      destinoId: d.id,
      culturaId: c.id,
      maxDias: POR_DESTINO[d.id].maxDias,
      // cada destino exige atenção a duas pragas/doenças da cultura, em rodízio
      bloqueios: [RISCOS[c.id][i % 4], RISCOS[c.id][(i + 1) % 4]],
      docs: [...POR_DESTINO[d.id].docs, ...(DOC_DA_CULTURA[c.id] ? [DOC_DA_CULTURA[c.id]] : [])],
    })),
  ),
];

/** As regras só funcionam se tudo o que citam existir; melhor falhar aqui do que no ExportBot. */
function conferirConsistencia() {
  const termos = new Set(Object.values(TERMOS).flat());
  const destinos = new Set(DESTINOS.map((d) => d.id));
  const culturas = new Set(CULTURAS.map((c) => c.id));
  for (const r of REGRAS) {
    if (!destinos.has(r.destinoId) || !culturas.has(r.culturaId)) throw new Error(`Regra com destino/cultura inexistente: ${r.destinoId}/${r.culturaId}`);
    for (const b of r.bloqueios) if (!termos.has(b)) throw new Error(`Bloqueio fora do dicionário do NER: "${b}" (${r.destinoId}/${r.culturaId})`);
  }
}

async function main() {
  conferirConsistencia();
  for (const [tipo, termos] of Object.entries(TERMOS) as [TipoEntidade, string[]][]) {
    for (const termo of termos) {
      await prisma.termoNer.upsert({ where: { termo }, create: { tipo, termo }, update: {} });
    }
  }
  for (const d of DESTINOS) await prisma.destino.upsert({ where: { id: d.id }, create: d, update: {} });
  for (const c of CULTURAS) await prisma.cultura.upsert({ where: { id: c.id }, create: c, update: {} });
  for (const b of BIOMAS) await prisma.bioma.upsert({ where: { id: b.id }, create: b, update: {} });
  for (const p of PRATICAS) await prisma.praticaCarbono.upsert({ where: { id: p.id }, create: p, update: {} });
  for (const r of REGRAS) {
    const where = { destinoId_culturaId: { destinoId: r.destinoId, culturaId: r.culturaId } };
    await prisma.regraExportacao.upsert({ where, create: r, update: {} });
  }
  console.log(
    `Catálogos: ${DESTINOS.length} destinos, ${CULTURAS.length} culturas, ${BIOMAS.length} biomas, ${PRATICAS.length} práticas; ` +
      `${Object.values(TERMOS).flat().length} termos no NER; ${REGRAS.length} regras.`,
  );

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
