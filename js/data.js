/* ==========================================================================
   data.js — dados do protótipo (simulam o que virá do PostgreSQL na Sprint 1)
   ATENÇÃO: as regras abaixo são ILUSTRATIVAS, usadas para validar a interface.
   ========================================================================== */

const LAUDO_EXEMPLO = `LAUDO FITOSSANITÁRIO Nº 2026/0842
Propriedade: Fazenda Santa Clara — Município de Cristalina/GO

Talhão 03 (soja, 42 ha): inspeção realizada em 12/08/2026 pelo engenheiro agrônomo responsável. Foi constatada ferrugem-asiática em nível baixo e presença de percevejo-marrom abaixo do nível de ação. Aplicação de fungicida em 20/08/2026.

Talhão 07 (café, 18 ha): inspeção realizada em 14/08/2026. Detectada broca-do-café em 2% dos frutos amostrados e sinais de cercosporiose. Manejo com controle biológico iniciado em 25/08/2026.

Conclusão: lavouras em condição fitossanitária controlada, com monitoramento semanal.`;

/* Dicionários do NER (a versão final usará spaCy treinado no domínio agrícola) */
const NER_DICT = {
  PRAGA: ["lagarta-da-soja", "percevejo-marrom", "broca-do-café", "bicho-mineiro", "mosca-branca"],
  DOENCA: ["ferrugem-asiática", "mancha-alvo", "antracnose", "ferrugem-do-cafeeiro", "cercosporiose", "mofo-branco"],
  CULTURA: ["soja", "café"],
};

const DESTINOS = {
  ue:   { nome: "União Europeia", nomeEn: "European Union" },
  eua:  { nome: "Estados Unidos", nomeEn: "United States" },
  china:{ nome: "China",          nomeEn: "China" },
};

const CULTURAS = {
  soja: { nome: "Soja", nomeEn: "Soybean" },
  "café": { nome: "Café", nomeEn: "Coffee" },
};

/* Regras de exportação por destino × cultura.
   maxDias: idade máxima da inspeção em relação ao embarque.
   bloqueio: pragas/doenças que exigem tratamento antes do embarque.
   docs: documentos que o produtor confirma manualmente. */
const REGRAS_EXPORT = {
  "ue|soja":   { maxDias: 30, bloqueio: ["percevejo-marrom"],     docs: ["Declaração de rastreabilidade de origem", "Comprovante de conformidade EUDR (sem desmatamento)"] },
  "ue|café":   { maxDias: 30, bloqueio: ["broca-do-café"],        docs: ["Declaração de rastreabilidade de origem", "Comprovante de conformidade EUDR (sem desmatamento)"] },
  "eua|soja":  { maxDias: 14, bloqueio: ["ferrugem-asiática"],    docs: ["Permit USDA APHIS (PPQ)", "Prior Notice — FDA"] },
  "eua|café":  { maxDias: 14, bloqueio: ["broca-do-café"],        docs: ["Prior Notice — FDA", "Registro de instalação — FDA"] },
  "china|soja":{ maxDias: 21, bloqueio: ["mosca-branca"],         docs: ["Registro da exportadora no GACC", "Certificado de tratamento fitossanitário"] },
  "china|café":{ maxDias: 21, bloqueio: ["bicho-mineiro"],        docs: ["Registro da exportadora no GACC", "Certificado de tratamento fitossanitário"] },
};

const BIOMAS = {
  amazonia:   { nome: "Amazônia",        rl: 80 },
  cerrado:    { nome: "Cerrado",         rl: 35 },
  mata:       { nome: "Mata Atlântica",  rl: 20 },
  pampa:      { nome: "Pampa",           rl: 20 },
  caatinga:   { nome: "Caatinga",        rl: 20 },
  pantanal:   { nome: "Pantanal",        rl: 20 },
};

const PRATICAS_CARBONO = [
  { id: "ilpf",   nome: "Integração Lavoura-Pecuária-Floresta (ILPF)" },
  { id: "pd",     nome: "Plantio direto na palha" },
  { id: "rpd",    nome: "Recuperação de pastagens degradadas" },
  { id: "flor",   nome: "Florestas plantadas" },
  { id: "bio",    nome: "Bioinsumos / fixação biológica de nitrogênio" },
];

/* Mensagens bilíngues (a versão final usará MarianMT / Google Translate API) */
const I18N = {
  pt: {
    greetExport: "Olá! Sou o ExportBot. Escolha o destino e a cultura e eu cruzo o seu laudo com as exigências. Pergunte, por exemplo: “o que está pendente?”",
    noLaudo: "Ainda não há laudo carregado. Vá em <b>1 · Laudo (NER)</b> e envie ou use o laudo de exemplo.",
    summary: (ok, pend, risco, dest, cult) => `Para <b>${cult} → ${dest}</b>: <b>${ok}</b> exigência(s) atendida(s), <b>${pend}</b> pendente(s) e <b>${risco}</b> em risco.`,
    pendHeader: "Pendências e riscos:",
    nothingPending: "Nenhuma pendência — tudo atendido para este destino.",
    okHeader: "Já atendido:",
    pragasHeader: "Entidades encontradas no laudo:",
    prazoLine: (dias, max) => `Inspeção mais recente há <b>${dias}</b> dia(s) do embarque (máximo aceito: ${max}).`,
    noEmbarque: "Informe a data prevista de embarque para eu avaliar o prazo da inspeção.",
    help: "Posso responder sobre: <b>pendências</b>, <b>pragas/doenças</b>, <b>documentos</b>, <b>prazo</b> da inspeção e o que já está <b>atendido</b>.",
    fallback: "Não entendi bem. Tente: “o que está pendente?”, “quais pragas?”, “documentos” ou “prazo”.",
    docsHeader: "Documentos a confirmar:",
    st: { ok: "Atendido", pendente: "Pendente", risco: "Em risco" },
  },
  en: {
    greetExport: "Hi! I'm ExportBot. Pick the destination and crop and I'll cross-check your report with the requirements. Try: “what is pending?”",
    noLaudo: "No report loaded yet. Go to <b>1 · Laudo (NER)</b> and upload one or use the sample report.",
    summary: (ok, pend, risco, dest, cult) => `For <b>${cult} → ${dest}</b>: <b>${ok}</b> requirement(s) met, <b>${pend}</b> pending and <b>${risco}</b> at risk.`,
    pendHeader: "Pending items and risks:",
    nothingPending: "Nothing pending — everything is met for this destination.",
    okHeader: "Already met:",
    pragasHeader: "Entities found in the report:",
    prazoLine: (dias, max) => `Latest inspection is <b>${dias}</b> day(s) before shipment (maximum accepted: ${max}).`,
    noEmbarque: "Please enter the planned shipment date so I can check the inspection deadline.",
    help: "I can answer about: <b>pending</b> items, <b>pests/diseases</b>, <b>documents</b>, inspection <b>deadline</b> and what is already <b>met</b>.",
    fallback: "I didn't quite get that. Try: “what is pending?”, “which pests?”, “documents” or “deadline”.",
    docsHeader: "Documents to confirm:",
    st: { ok: "Met", pendente: "Pending", risco: "At risk" },
  },
};
