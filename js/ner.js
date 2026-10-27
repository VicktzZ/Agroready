/* ==========================================================================
   ner.js — simulação client-side do módulo NER (a versão final usa spaCy
   no backend FastAPI). Aqui: dicionários + expressões regulares.
   ========================================================================== */

/* Remove acentos e põe em minúsculas, mantendo o MESMO comprimento da string
   original (necessário para reaproveitar os índices na hora de destacar). */
function normChars(text) {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const base = text[i].normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    out += base.length ? base[0] : text[i];
  }
  return out;
}

function parseDataBR(s) {
  const [d, m, y] = s.split("/").map(Number);
  return new Date(y, m - 1, d);
}

function extractEntities(text) {
  const norm = normChars(text);
  const found = [];

  // 1) Dicionários (pragas, doenças, culturas) — hífen aceita espaço também
  Object.entries(NER_DICT).forEach(([type, terms]) => {
    terms.forEach((term) => {
      const pattern = normChars(term).replace(/-/g, "[-\\s]");
      const re = new RegExp(`(?<![a-z])${pattern}(?![a-z])`, "g");
      let m;
      while ((m = re.exec(norm))) {
        found.push({ type, start: m.index, end: m.index + m[0].length, text: text.slice(m.index, m.index + m[0].length), key: term });
      }
    });
  });

  // 2) Padrões (datas, talhões, nº do laudo, áreas)
  const patterns = [
    ["DATA", /\b\d{2}\/\d{2}\/\d{4}\b/g],
    ["TALHAO", /talh[ãa]o\s*\d+/gi],
    ["LAUDO", /laudo\s+fitossanit[áa]rio\s+n[ºo°]?\s*[\d\/]+/gi],
    ["AREA", /\b\d+(?:[.,]\d+)?\s*ha\b/gi],
  ];
  patterns.forEach(([type, re]) => {
    let m;
    while ((m = re.exec(text))) {
      found.push({ type, start: m.index, end: m.index + m[0].length, text: m[0], key: m[0] });
    }
  });

  // 3) Remove sobreposições (mantém a entidade mais longa que começa primeiro)
  found.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const items = [];
  let lastEnd = -1;
  found.forEach((e) => { if (e.start >= lastEnd) { items.push(e); lastEnd = e.end; } });

  // 4) Resumo estruturado (é isto que o ExportBot/CarbonBot consomem)
  const uniq = (type) => [...new Set(items.filter((e) => e.type === type).map((e) => e.key.toLowerCase()))];
  const datas = items.filter((e) => e.type === "DATA").map((e) => {
    const before = norm.slice(Math.max(0, e.start - 70), e.start);
    return { texto: e.text, data: parseDataBR(e.text), inspecao: before.includes("inspe") };
  });
  const inspecoes = datas.filter((d) => d.inspecao).map((d) => d.data);
  const laudo = items.find((e) => e.type === "LAUDO");

  return {
    items,
    pragas: uniq("PRAGA"),
    doencas: uniq("DOENCA"),
    culturas: uniq("CULTURA"),
    talhoes: uniq("TALHAO"),
    datas,
    ultimaInspecao: inspecoes.length ? new Date(Math.max(...inspecoes)) : null,
    laudoNumero: laudo ? laudo.text.replace(/laudo\s+fitossanit[áa]rio\s+n[ºo°]?\s*/i, "") : null,
  };
}

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
