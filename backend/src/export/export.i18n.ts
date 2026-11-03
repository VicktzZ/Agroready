/* Mensagens bilíngues do ExportBot (porte de frontend/js/data.js).
   ponytail: textos fixos PT/EN; tradução automática (MarianMT etc.) quando houver
   conteúdo livre a traduzir. */

export type Lang = 'pt' | 'en';

export const I18N = {
  pt: {
    noLaudo: 'Ainda não há laudo carregado. Vá em <b>1 · Laudo (NER)</b> e envie ou use o laudo de exemplo.',
    summary: (ok: number, pend: number, risco: number, dest: string, cult: string) =>
      `Para <b>${cult} → ${dest}</b>: <b>${ok}</b> exigência(s) atendida(s), <b>${pend}</b> pendente(s) e <b>${risco}</b> em risco.`,
    pendHeader: 'Pendências e riscos:',
    nothingPending: 'Nenhuma pendência — tudo atendido para este destino.',
    okHeader: 'Já atendido:',
    pragasHeader: 'Entidades encontradas no laudo:',
    prazoLine: (dias: number, max: number) =>
      `Inspeção mais recente há <b>${dias}</b> dia(s) do embarque (máximo aceito: ${max}).`,
    noEmbarque: 'Informe a data prevista de embarque para eu avaliar o prazo da inspeção.',
    noInspecao: 'Não identifiquei a data de inspeção no laudo.',
    help: 'Posso responder sobre: <b>pendências</b>, <b>pragas/doenças</b>, <b>documentos</b>, <b>prazo</b> da inspeção e o que já está <b>atendido</b>.',
    fallback: 'Não entendi bem. Tente: “o que está pendente?”, “quais pragas?”, “documentos” ou “prazo”.',
    docsHeader: 'Documentos a confirmar:',
  },
  en: {
    noLaudo: 'No report loaded yet. Go to <b>1 · Laudo (NER)</b> and upload one or use the sample report.',
    summary: (ok: number, pend: number, risco: number, dest: string, cult: string) =>
      `For <b>${cult} → ${dest}</b>: <b>${ok}</b> requirement(s) met, <b>${pend}</b> pending and <b>${risco}</b> at risk.`,
    pendHeader: 'Pending items and risks:',
    nothingPending: 'Nothing pending — everything is met for this destination.',
    okHeader: 'Already met:',
    pragasHeader: 'Entities found in the report:',
    prazoLine: (dias: number, max: number) =>
      `Latest inspection is <b>${dias}</b> day(s) before shipment (maximum accepted: ${max}).`,
    noEmbarque: 'Please enter the planned shipment date so I can check the inspection deadline.',
    noInspecao: 'I could not find the inspection date in the report.',
    help: 'I can answer about: <b>pending</b> items, <b>pests/diseases</b>, <b>documents</b>, inspection <b>deadline</b> and what is already <b>met</b>.',
    fallback: 'I didn\'t quite get that. Try: “what is pending?”, “which pests?”, “documents” or “deadline”.',
    docsHeader: 'Documents to confirm:',
  },
};
