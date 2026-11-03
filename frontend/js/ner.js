/* ==========================================================================
   ner.js — destaque das entidades no texto do laudo. A extração (NER)
   roda no backend NestJS (POST /api/laudos).
   ========================================================================== */

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const ENT_LABEL = { PRAGA: "Praga", DOENCA: "Doença", CULTURA: "Cultura", DATA: "Data", TALHAO: "Talhão", LAUDO: "Nº laudo", AREA: "Área" };

function renderHighlight(text, items) {
  let html = "", pos = 0;
  items.forEach((e) => {
    html += escapeHtml(text.slice(pos, e.start));
    html += `<mark class="ent ent-${e.type}" title="${ENT_LABEL[e.type]}">${escapeHtml(e.text)}<sup>${ENT_LABEL[e.type]}</sup></mark>`;
    pos = e.end;
  });
  html += escapeHtml(text.slice(pos));
  return html.replace(/\n/g, "<br>");
}
