/* ==========================================================================
   data.js — textos fixos do front. Regras, dicionário do NER, biomas e
   práticas de carbono agora vêm do backend (GET /api/referencias, PostgreSQL).
   ========================================================================== */

const LAUDO_EXEMPLO = `LAUDO FITOSSANITÁRIO Nº 2026/0842
Propriedade: Fazenda Santa Clara — Município de Cristalina/GO

Talhão 03 (soja, 42 ha): inspeção realizada em 12/08/2026 pelo engenheiro agrônomo responsável. Foi constatada ferrugem-asiática em nível baixo e presença de percevejo-marrom abaixo do nível de ação. Aplicação de fungicida em 20/08/2026.

Talhão 07 (café, 18 ha): inspeção realizada em 14/08/2026. Detectada broca-do-café em 2% dos frutos amostrados e sinais de cercosporiose. Manejo com controle biológico iniciado em 25/08/2026.

Conclusão: lavouras em condição fitossanitária controlada, com monitoramento semanal.`;

/* Textos de interface (as respostas do chat são geradas pelo backend) */
const I18N = {
  pt: {
    greetExport: "Olá! Sou o ExportBot. Escolha o destino e a cultura e eu cruzo o seu laudo com as exigências. Pergunte, por exemplo: “o que está pendente?”",
    st: { ok: "Atendido", pendente: "Pendente", risco: "Em risco" },
  },
  en: {
    greetExport: "Hi! I'm ExportBot. Pick the destination and crop and I'll cross-check your report with the requirements. Try: “what is pending?”",
    st: { ok: "Met", pendente: "Pending", risco: "At risk" },
  },
};
