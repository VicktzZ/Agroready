/* ==========================================================================
   app.js — roteamento (hash), estado e telas do AgroReady
   ========================================================================== */

const STORE_KEY = "agroready-state-v2";
const state = {
  laudoId: null,        // laudo salvo no backend (POST /api/laudos)
  laudoText: "",
  ent: null,            // entidades extraídas pelo NER do backend
  destino: "ue",
  cultura: "soja",
  embarque: "",
  docsOk: {},           // { "ue|soja|Documento": true }
  lang: "pt",
  carbon: { bioma: "cerrado", area: 120, rl: 30, car: "sim", desmat: "nao", praticas: ["pd"], mrv: false, padrao: "Verra VCS", avaliado: false },
};

function saveState() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ ...state, ent: null })); } catch (e) { /* storage indisponível */ }
}
async function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (raw) Object.assign(state, raw);
  } catch (e) { /* ignora */ }
  if (state.laudoId) {
    try {
      const l = await api(`/laudos/${state.laudoId}`);
      state.laudoText = l.texto;
      state.ent = l.entidades;
    } catch (e) { state.laudoId = null; }
  }
}

/* Chamada à API NestJS (servida na mesma origem). GET sem body; POST com body. */
async function api(path, body) {
  const opts = body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
  const res = await fetch(`/api${path}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error([].concat(data.message || `Erro ${res.status}`).join(" "));
  return data;
}

let REF = { destinos: [], culturas: [], biomas: [], praticas: [], padroes: [] }; // GET /api/referencias

const $ = (sel, root = document) => root.querySelector(sel);
const view = () => $("#view");
const fmtDate = (iso) => iso.split("-").reverse().join("/");
const fmtNum = (n) => n.toLocaleString("pt-BR");

/* ------------------------------------------------------------------ Início */
function renderInicio() {
  const has = !!state.ent;
  view().innerHTML = `
    <section class="hero">
      <span class="tag">Sprint Zero · Front-end</span>
      <h1>AgroReady</h1>
      <p>Dois assistentes conversacionais no mesmo pipeline de PLN: o <b>ExportBot</b> checa se o laudo atende às exigências do país comprador e o <b>CarbonBot</b> avalia a elegibilidade da propriedade a créditos de carbono.</p>
      <div class="hero-actions">
        <a class="btn" href="#/laudo">${has ? "Revisar laudo" : "Começar pelo laudo"}</a>
        <a class="btn ghost" href="#/sobre">Ver arquitetura e cronograma</a>
      </div>
    </section>

    <h2 class="section-title">Como usar</h2>
    <div class="grid3">
      <a class="card step" href="#/laudo"><span class="num">1</span><h3>Envie o laudo</h3><p>O NER destaca pragas, doenças, datas e talhões no texto.</p><small class="status ${has ? "ok" : "pendente"}">${has ? "Laudo carregado" : "Aguardando laudo"}</small></a>
      <a class="card step" href="#/exportbot"><span class="num">2</span><h3>Converse com o ExportBot</h3><p>Escolha destino e cultura e veja o que está atendido ou pendente.</p></a>
      <a class="card step" href="#/carbonbot"><span class="num">3</span><h3>Teste o CarbonBot</h3><p>Informe dados da propriedade e descubra o que falta para certificar carbono.</p></a>
    </div>

    <h2 class="section-title">Pipeline</h2>
    <div class="pipeline">
      <div class="node">Frontend<small>HTML · CSS · JS</small></div><span>→</span>
      <div class="node strong">Backend NestJS<small>API REST · /api</small></div><span>→</span>
      <div class="node">NER<small>dicionário + regex</small></div><span>→</span>
      <div class="node">Motor de regras<small>ExportBot · CarbonBot</small></div><span>→</span>
      <div class="node">Respostas<small>PT ⇄ EN</small></div><span>→</span>
      <div class="node">PostgreSQL<small>Prisma</small></div>
    </div>
    <p class="note">NER, motor de regras, calculadora de carbono e chat rodam no backend NestJS; regras e dicionário ficam no PostgreSQL. Os dados de regras e os fatores de carbono são ilustrativos.</p>`;
}

/* ------------------------------------------------------------------- Laudo */
function renderLaudo() {
  view().innerHTML = `
    <header class="page-head"><h1>1 · Laudo fitossanitário</h1><p>Envie um arquivo <code>.txt</code>, cole o texto ou use o exemplo. O NER identifica as entidades que alimentam os dois bots.</p></header>
    <div class="grid2">
      <section class="card">
        <label class="drop" id="drop">
          <input type="file" id="file" accept=".txt,.pdf,.png,.jpg,.jpeg" hidden>
          <strong>Arraste o laudo aqui</strong><span>ou clique para escolher (.txt)</span>
        </label>
        <div class="row"><button class="btn small ghost" id="sample" type="button">Usar laudo de exemplo</button><button class="btn small ghost" id="clear" type="button">Limpar</button></div>
        <label class="field">Texto do laudo<textarea id="txt" rows="12" placeholder="Cole aqui o texto do laudo…">${escapeHtml(state.laudoText)}</textarea></label>
        <button class="btn" id="extract" type="button">Extrair entidades (NER)</button>
        <p class="hint" id="msg"></p>
      </section>
      <section class="card" id="result"></section>
    </div>`;

  const txt = $("#txt"), msg = $("#msg");
  const run = async () => {
    state.laudoText = txt.value.trim();
    state.laudoId = null;
    state.ent = null;
    if (state.laudoText) {
      try {
        const l = await api("/laudos", { texto: state.laudoText });
        state.laudoId = l.id;
        state.ent = l.entidades;
      } catch (e) { msg.textContent = `Falha ao processar o laudo: ${e.message}`; }
    }
    saveState();
    renderLaudoResult();
  };
  $("#extract").onclick = () => { if (!txt.value.trim()) { msg.textContent = "Cole um texto ou use o laudo de exemplo."; return; } msg.textContent = ""; run(); };
  $("#sample").onclick = () => { txt.value = LAUDO_EXEMPLO; msg.textContent = ""; run(); };
  $("#clear").onclick = () => { txt.value = ""; run(); };

  const handleFile = (f) => {
    if (!f) return;
    if (/\.txt$/i.test(f.name)) {
      const r = new FileReader();
      r.onload = () => { txt.value = String(r.result); msg.textContent = `Arquivo “${f.name}” carregado.`; run(); };
      r.readAsText(f);
    } else {
      txt.value = LAUDO_EXEMPLO;
      msg.textContent = "A leitura de PDF/imagem (OCR) ainda não é suportada. Por enquanto usamos o laudo de exemplo.";
      run();
    }
  };
  $("#file").onchange = (e) => handleFile(e.target.files[0]);
  const drop = $("#drop");
  ["dragover", "dragenter"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", (e) => handleFile(e.dataTransfer.files[0]));

  renderLaudoResult();
}

function renderLaudoResult() {
  const box = $("#result");
  if (!state.ent) {
    box.innerHTML = `<h3>Entidades extraídas</h3><p class="empty">Nenhum laudo processado ainda.</p>`;
    return;
  }
  const e = state.ent;
  const chips = (arr, cls) => arr.length ? arr.map((x) => `<span class="pill ent-${cls}">${escapeHtml(x)}</span>`).join("") : '<span class="muted">nenhuma</span>';
  box.innerHTML = `
    <h3>Entidades extraídas <small>${e.items.length} encontradas</small></h3>
    <div class="highlighted">${renderHighlight(state.laudoText, e.items)}</div>
    <dl class="summary">
      <dt>Nº do laudo</dt><dd>${e.laudoNumero ? escapeHtml(e.laudoNumero) : '<span class="muted">não encontrado</span>'}</dd>
      <dt>Culturas</dt><dd>${chips(e.culturas, "CULTURA")}</dd>
      <dt>Pragas</dt><dd>${chips(e.pragas, "PRAGA")}</dd>
      <dt>Doenças</dt><dd>${chips(e.doencas, "DOENCA")}</dd>
      <dt>Talhões</dt><dd>${chips(e.talhoes, "TALHAO")}</dd>
      <dt>Última inspeção</dt><dd>${e.ultimaInspecao ? fmtDate(e.ultimaInspecao) : '<span class="muted">não identificada</span>'}</dd>
    </dl>
    <div class="row"><a class="btn small" href="#/exportbot">Ir para o ExportBot →</a><a class="btn small ghost" href="#/carbonbot">CarbonBot</a></div>`;
}

/* --------------------------------------------------------------- ExportBot */
/* Contexto enviado ao backend (POST /api/export/avaliar e /api/export/chat). */
function exportCtx() {
  const prefix = `${state.destino}|${state.cultura}|`;
  return {
    laudoId: state.laudoId || undefined,
    destino: state.destino,
    cultura: state.cultura,
    embarque: state.embarque || undefined,
    docsConfirmados: Object.keys(state.docsOk).filter((k) => state.docsOk[k] && k.startsWith(prefix)).map((k) => k.slice(prefix.length)),
  };
}

function renderExport() {
  const L = I18N[state.lang];
  const opts = (list, sel) => list.map((v) => `<option value="${escapeHtml(v.id)}" ${v.id === sel ? "selected" : ""}>${escapeHtml(v.nome)}</option>`).join("");
  view().innerHTML = `
    <header class="page-head"><h1>2 · ExportBot</h1><p>Cruza as entidades do laudo com as exigências do destino e responde em linguagem natural.</p></header>
    <div class="grid2 wide-right">
      <section class="card">
        <div class="form-grid">
          <label class="field">Destino<select id="destino">${opts(REF.destinos, state.destino)}</select></label>
          <label class="field">Cultura<select id="cultura">${opts(REF.culturas, state.cultura)}</select></label>
          <label class="field">Embarque previsto<input type="date" id="embarque" value="${state.embarque}"></label>
          <label class="field">Idioma da resposta<select id="lang"><option value="pt" ${state.lang === "pt" ? "selected" : ""}>Português</option><option value="en" ${state.lang === "en" ? "selected" : ""}>English</option></select></label>
        </div>
        ${state.ent ? "" : `<p class="alert">Nenhum laudo carregado. <a href="#/laudo">Enviar laudo →</a></p>`}
        <div class="progress"><div id="bar"></div></div>
        <ul class="checklist" id="checklist"></ul>
        <p class="note">Regras ilustrativas do protótipo; a base real será curada de MAPA/T-Rex, USDA APHIS e UE.</p>
      </section>
      <section class="card chat" id="chat"></section>
    </div>`;

  const docKey = (doc) => `${state.destino}|${state.cultura}|${doc}`;
  const paint = async () => {
    let items;
    try {
      ({ items } = await api("/export/avaliar", exportCtx()));
    } catch (e) {
      $("#checklist").innerHTML = `<li class="alert">${escapeHtml(e.message)}</li>`;
      return;
    }
    const ok = items.filter((i) => i.status === "ok").length;
    $("#bar").style.width = `${Math.round((ok / items.length) * 100)}%`;
    $("#checklist").innerHTML = items.map((i) => `
      <li class="item ${i.status}">
        ${i.doc ? `<input type="checkbox" data-doc="${escapeHtml(docKey(i.doc))}" ${i.status === "ok" ? "checked" : ""} aria-label="${escapeHtml(i.label)}">` : `<span class="ico"></span>`}
        <div><strong>${escapeHtml(i.label)}</strong><small>${escapeHtml(i.note)}</small></div>
        <span class="status ${i.status}">${I18N[state.lang].st[i.status]}</span>
      </li>`).join("");
    document.querySelectorAll("[data-doc]").forEach((cb) => cb.onchange = () => { state.docsOk[cb.dataset.doc] = cb.checked; saveState(); paint(); });
  };

  ["destino", "cultura", "embarque"].forEach((id) => $("#" + id).onchange = (ev) => { state[id] = ev.target.value; saveState(); paint(); });
  $("#lang").onchange = (ev) => { state.lang = ev.target.value; saveState(); renderExport(); };

  paint();
  const chips = state.lang === "pt"
    ? ["O que está pendente?", "Quais pragas?", "Documentos", "Prazo da inspeção", "O que já está atendido?"]
    : ["What is pending?", "Which pests?", "Documents", "Inspection deadline", "What is already met?"];
  createChat($("#chat"), { botName: "ExportBot", greeting: L.greetExport, chips, respond: exportRespond });
}

async function exportRespond(text) {
  const { resposta } = await api("/export/chat", { ...exportCtx(), mensagem: text, lang: state.lang });
  return resposta;
}

/* --------------------------------------------------------------- CarbonBot */
/* Converte o estado do formulário no payload de POST /api/carbono/*. */
function carbonPayload() {
  const c = state.carbon;
  return {
    bioma: c.bioma, area: Number(c.area) || 0, rl: Number(c.rl) || 0,
    car: c.car === "sim", desmatamento: c.desmat === "sim",
    praticas: c.praticas, mrv: c.mrv, padrao: c.padrao,
  };
}

function renderCarbon() {
  const c = state.carbon;
  view().innerHTML = `
    <header class="page-head"><h1>3 · CarbonBot</h1><p>Avalia a elegibilidade da propriedade a créditos de carbono no mercado voluntário e estima o potencial de créditos.</p></header>
    <p class="alert info">A agropecuária está fora do mercado regulado (SBCE, Lei nº 15.042/2024); os créditos do setor seguem pelo <b>mercado voluntário</b> (ex.: Verra VCS, Gold Standard).</p>
    <div class="grid2 wide-right">
      <section class="card">
        <form id="cform">
          <div class="form-grid">
            <label class="field">Bioma<select name="bioma">${REF.biomas.map((v) => `<option value="${escapeHtml(v.id)}" ${v.id === c.bioma ? "selected" : ""}>${escapeHtml(v.nome)}</option>`).join("")}</select></label>
            <label class="field">Área total (ha)<input type="number" min="0" name="area" value="${c.area}"></label>
            <label class="field">Reserva Legal atual (%)<input type="number" min="0" max="100" name="rl" value="${c.rl}"></label>
            <label class="field">CAR/SICAR ativo<select name="car"><option value="sim" ${c.car === "sim" ? "selected" : ""}>Sim</option><option value="nao" ${c.car === "nao" ? "selected" : ""}>Não</option></select></label>
            <label class="field">Desmatamento recente<select name="desmat"><option value="nao" ${c.desmat === "nao" ? "selected" : ""}>Não</option><option value="sim" ${c.desmat === "sim" ? "selected" : ""}>Sim</option></select></label>
            <label class="field">Padrão de certificação<select name="padrao">${REF.padroes.map((p) => `<option ${p === c.padrao ? "selected" : ""}>${escapeHtml(p)}</option>`).join("")}</select></label>
          </div>
          <fieldset><legend>Práticas de baixo carbono adotadas</legend>
            ${REF.praticas.map((p) => `<label class="check"><input type="checkbox" name="pratica" value="${escapeHtml(p.id)}" ${c.praticas.includes(p.id) ? "checked" : ""}> ${escapeHtml(p.nome)}</label>`).join("")}
          </fieldset>
          <label class="check"><input type="checkbox" name="mrv" ${c.mrv ? "checked" : ""}> Possuo plano de monitoramento, relato e verificação (MRV)</label>
          <button class="btn" type="submit">Avaliar elegibilidade</button>
        </form>
        <div id="cresult"></div>
        <p class="note">Critérios e fatores de carbono ilustrativos; a base final será curada de CAR/SICAR, Plano ABC+ (MAPA), Verra VCS e Gold Standard.</p>
      </section>
      <section class="card chat" id="chat"></section>
    </div>`;

  const readForm = () => {
    const f = new FormData($("#cform"));
    Object.assign(state.carbon, {
      bioma: f.get("bioma"), area: Number(f.get("area")), rl: Number(f.get("rl")), car: f.get("car"),
      desmat: f.get("desmat"), padrao: f.get("padrao"), praticas: f.getAll("pratica"), mrv: f.get("mrv") === "on",
    });
  };
  const paint = async () => {
    let r;
    try {
      r = await api("/carbono/avaliar", carbonPayload());
    } catch (e) {
      $("#cresult").innerHTML = `<p class="alert">${escapeHtml(e.message)}</p>`;
      return;
    }
    const est = r.estimativa;
    $("#cresult").innerHTML = `
      <div class="score"><div class="ring" style="--p:${r.score}"><span>${r.score}%</span></div><div><strong>${r.ok} de ${r.items.length} critérios atendidos</strong><small>${r.score >= 80 ? "Boa chance de elegibilidade" : r.score >= 50 ? "Elegibilidade parcial — há ajustes" : "Elegibilidade baixa no momento"}</small></div></div>
      <p class="alert info">${est.praticaBase
        ? `Estimativa ilustrativa: <b>~${fmtNum(est.creditosAno)} crédito(s)/ano</b> — ${fmtNum(est.areaProdutivaHa)} ha produtivos × ${fmtNum(est.praticaBase.fatorTco2eHaAno)} tCO2e/ha/ano (${escapeHtml(est.praticaBase.nome)}) = ${fmtNum(est.potencialTco2eAno)} tCO2e/ano, menos ${est.bufferPct}% de buffer.`
        : "Selecione ao menos uma prática de baixo carbono para estimar os créditos."}</p>
      <ul class="checklist">${r.items.map((i) => `<li class="item ${i.status}"><span class="ico"></span><div><strong>${escapeHtml(i.label)}</strong><small>${escapeHtml(i.note)}</small></div><span class="status ${i.status}">${I18N.pt.st[i.status]}</span></li>`).join("")}</ul>`;
  };
  $("#cform").addEventListener("submit", (ev) => { ev.preventDefault(); readForm(); state.carbon.avaliado = true; saveState(); paint(); chat.ask("Resumo"); });
  $("#cform").addEventListener("change", () => { readForm(); saveState(); if (state.carbon.avaliado) paint(); });
  if (c.avaliado) paint();

  const chat = createChat($("#chat"), {
    botName: "CarbonBot",
    greeting: "Olá! Sou o CarbonBot. Preencha os dados da propriedade, clique em <b>Avaliar elegibilidade</b> e pergunte, por exemplo: “o que falta para me qualificar?” ou “quantos créditos posso gerar?”",
    chips: ["O que falta?", "Quantos créditos?", "Reserva Legal", "Práticas elegíveis", "Qual padrão escolher?", "Mercado regulado?"],
    respond: carbonRespond,
  });
}

async function carbonRespond(text) {
  const { resposta } = await api("/carbono/chat", { mensagem: text, propriedade: carbonPayload(), avaliado: state.carbon.avaliado });
  return resposta;
}

/* ------------------------------------------------------------------- Sobre */
function renderSobre() {
  const cron = [
    ["WK01–WK02", "Concepção", "Levantamento do problema e do escopo."],
    ["WK03–WK04", "Extração (NER)", "Entidades dos laudos: pragas, doenças, datas, talhões."],
    ["WK05", "Devolutiva", "Validação da arquitetura."],
    ["WK06–WK08", "ExportBot", "Motor de regras de exportação e chat."],
    ["WK09", "Apresentação UN01", "Entrega e demonstração do ExportBot."],
    ["WK10–WK11", "Curadoria de dados", "Base de elegibilidade de carbono."],
    ["WK12–WK14", "CarbonBot", "Motor de elegibilidade de créditos de carbono."],
    ["WK15–WK16", "Testes integrados", "ExportBot + CarbonBot no mesmo fluxo."],
    ["WK17", "Entrega final", "Apresentação final do AgroReady."],
  ];
  view().innerHTML = `
    <header class="page-head"><h1>Sobre o projeto</h1><p>Projeto 07 · OutTech — Analytics para Agronegócio · Processamento de Linguagem Natural · Fatec Cotia</p></header>
    <div class="grid2">
      <section class="card"><h3>Equipe</h3><ul class="plain"><li>Vitor Hugo Rodrigues dos Santos</li><li>Pedro Henrique Araujo</li></ul><p class="muted">Prof. Braz Izaias da Silva Junior</p>
        <h3>Motivação</h3><p>Exportar e acessar o mercado de carbono exigem checagens manuais, lentas e sujeitas a erro. O AgroReady automatiza as duas com o mesmo pipeline de PLN.</p>
        <h3>Tecnologias</h3><p><span class="pill">HTML5</span><span class="pill">CSS3</span><span class="pill">JavaScript</span><span class="pill">NestJS</span><span class="pill">Prisma</span><span class="pill">PostgreSQL</span></p></section>
      <section class="card"><h3>Roadmap das sprints</h3>
        <ol class="timeline"><li class="done"><b>Sprint Zero · 13/10</b><small>Front-end do protótipo (esta entrega)</small></li><li><b>Sprint Um · 20/10</b><small>Diagrama entidade-relacionamento e banco de dados com CRUD</small></li><li><b>Sprint Dois</b><small>Backend NestJS + NER + motor de regras e calculadora de carbono</small></li></ol></section>
    </div>
    <h2 class="section-title">Cronograma geral (17 semanas)</h2>
    <div class="table-wrap"><table><thead><tr><th>Semana</th><th>Fase</th><th>O que será feito</th></tr></thead><tbody>${cron.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join("")}</tbody></table></div>`;
}

/* ------------------------------------------------------------------ Router */
const ROUTES = { inicio: renderInicio, laudo: renderLaudo, exportbot: renderExport, carbonbot: renderCarbon, sobre: renderSobre };

function route() {
  const name = (location.hash.replace(/^#\//, "") || "inicio");
  const fn = ROUTES[name] || renderInicio;
  fn();
  document.querySelectorAll("#nav a").forEach((a) => a.classList.toggle("active", a.dataset.route === name));
  $("#sidebar").classList.remove("open");
  view().focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

$("#menuBtn").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
window.addEventListener("hashchange", route);
(async () => {
  try {
    REF = await api("/referencias");
  } catch (e) {
    view().innerHTML = `<p class="alert">Backend indisponível (${escapeHtml(e.message)}). Rode <code>npm run start:dev</code> em <code>backend/</code> e acesse http://localhost:3000.</p>`;
    return;
  }
  await loadState();
  route();
})();
