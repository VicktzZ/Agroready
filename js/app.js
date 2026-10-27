/* ==========================================================================
   app.js — roteamento (hash), estado e telas do AgroReady
   ========================================================================== */

const STORE_KEY = "agroready-state-v1";
const state = {
  laudoText: "",
  ent: null,            // resultado de extractEntities()
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
function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (raw) Object.assign(state, raw);
    if (state.laudoText) state.ent = extractEntities(state.laudoText);
  } catch (e) { /* ignora */ }
}

const $ = (sel, root = document) => root.querySelector(sel);
const view = () => $("#view");
const fmtDate = (d) => d.toLocaleDateString("pt-BR");
const normTxt = (s) => normChars(s);

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
      <div class="node strong">Backend FastAPI<small>Sprint 2</small></div><span>→</span>
      <div class="node">NER · spaCy<small>simulado aqui</small></div><span>→</span>
      <div class="node">Motor de regras<small>simulado aqui</small></div><span>→</span>
      <div class="node">Tradução<small>PT ⇄ EN</small></div><span>→</span>
      <div class="node">PostgreSQL<small>Sprint 1 · 20/10</small></div>
    </div>
    <p class="note">Nesta entrega as etapas de NER, regras e tradução rodam no navegador para validar a experiência do usuário. Os dados de regras são ilustrativos.</p>`;
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
  const run = () => {
    state.laudoText = txt.value.trim();
    state.ent = state.laudoText ? extractEntities(state.laudoText) : null;
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
      msg.textContent = "A leitura de PDF/imagem será feita pelo backend (Sprint 2). Por enquanto usamos o laudo de exemplo.";
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
function evalExport() {
  const key = `${state.destino}|${state.cultura}`;
  const regra = REGRAS_EXPORT[key];
  const e = state.ent;
  const items = [];

  items.push(e
    ? { id: "laudo", label: "Laudo fitossanitário emitido", status: e.laudoNumero ? "ok" : "pendente", note: e.laudoNumero ? `Nº ${e.laudoNumero}` : "Número do laudo não identificado no texto." }
    : { id: "laudo", label: "Laudo fitossanitário emitido", status: "pendente", note: "Nenhum laudo carregado." });

  items.push(!e
    ? { id: "cultura", label: `Laudo cobre a cultura (${CULTURAS[state.cultura].nome})`, status: "pendente", note: "Aguardando laudo." }
    : e.culturas.includes(state.cultura)
      ? { id: "cultura", label: `Laudo cobre a cultura (${CULTURAS[state.cultura].nome})`, status: "ok", note: "Cultura encontrada no laudo." }
      : { id: "cultura", label: `Laudo cobre a cultura (${CULTURAS[state.cultura].nome})`, status: "risco", note: "O laudo não menciona esta cultura." });

  let dias = null;
  if (!e || !e.ultimaInspecao) {
    items.push({ id: "prazo", label: `Inspeção até ${regra.maxDias} dias antes do embarque`, status: "pendente", note: e ? "Data de inspeção não identificada." : "Aguardando laudo." });
  } else if (!state.embarque) {
    items.push({ id: "prazo", label: `Inspeção até ${regra.maxDias} dias antes do embarque`, status: "pendente", note: "Informe a data prevista de embarque." });
  } else {
    dias = Math.round((new Date(state.embarque + "T00:00:00") - e.ultimaInspecao) / 86400000);
    const okPrazo = dias >= 0 && dias <= regra.maxDias;
    items.push({ id: "prazo", label: `Inspeção até ${regra.maxDias} dias antes do embarque`, status: okPrazo ? "ok" : "risco", note: dias < 0 ? "Embarque anterior à inspeção." : `Inspeção há ${dias} dia(s) do embarque.` });
  }

  regra.bloqueio.forEach((p) => {
    if (!e) { items.push({ id: "b-" + p, label: `Ausência de ${p}`, status: "pendente", note: "Aguardando laudo." }); return; }
    const achou = e.pragas.includes(p) || e.doencas.includes(p);
    items.push({ id: "b-" + p, label: `Ausência de ${p}`, status: achou ? "risco" : "ok", note: achou ? "Detectado no laudo — tratar e comprovar antes do embarque." : "Não detectado no laudo." });
  });

  regra.docs.forEach((d) => {
    const k = `${key}|${d}`;
    items.push({ id: "doc", doc: d, docKey: k, label: d, status: state.docsOk[k] ? "ok" : "pendente", note: state.docsOk[k] ? "Confirmado pelo produtor." : "Confirmação manual pendente." });
  });

  return { items, regra, dias };
}

function renderExport() {
  const L = I18N[state.lang];
  view().innerHTML = `
    <header class="page-head"><h1>2 · ExportBot</h1><p>Cruza as entidades do laudo com as exigências do destino e responde em linguagem natural.</p></header>
    <div class="grid2 wide-right">
      <section class="card">
        <div class="form-grid">
          <label class="field">Destino<select id="destino">${Object.entries(DESTINOS).map(([k, v]) => `<option value="${k}" ${k === state.destino ? "selected" : ""}>${v.nome}</option>`).join("")}</select></label>
          <label class="field">Cultura<select id="cultura">${Object.entries(CULTURAS).map(([k, v]) => `<option value="${k}" ${k === state.cultura ? "selected" : ""}>${v.nome}</option>`).join("")}</select></label>
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

  const paint = () => {
    const { items } = evalExport();
    const ok = items.filter((i) => i.status === "ok").length;
    $("#bar").style.width = `${Math.round((ok / items.length) * 100)}%`;
    $("#checklist").innerHTML = items.map((i) => `
      <li class="item ${i.status}">
        ${i.docKey ? `<input type="checkbox" data-doc="${escapeHtml(i.docKey)}" ${i.status === "ok" ? "checked" : ""} aria-label="${escapeHtml(i.label)}">` : `<span class="ico"></span>`}
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

function exportRespond(text) {
  const L = I18N[state.lang];
  const t = normTxt(text);
  if (!state.ent) return L.noLaudo;
  const { items, regra, dias } = evalExport();
  const dest = state.lang === "pt" ? DESTINOS[state.destino].nome : DESTINOS[state.destino].nomeEn;
  const cult = state.lang === "pt" ? CULTURAS[state.cultura].nome : CULTURAS[state.cultura].nomeEn;
  const by = (s) => items.filter((i) => i.status === s);
  const li = (arr) => `<ul>${arr.map((i) => `<li>${escapeHtml(i.label)} — <small>${escapeHtml(i.note)}</small></li>`).join("")}</ul>`;
  const summary = L.summary(by("ok").length, by("pendente").length, by("risco").length, dest, cult);

  if (/pendent|falta|risco|pending|missing|risk/.test(t)) {
    const bad = [...by("risco"), ...by("pendente")];
    return `${summary}<br>${bad.length ? `<b>${L.pendHeader}</b>${li(bad)}` : L.nothingPending}`;
  }
  if (/prag|doenc|entidad|pest|disease|entit/.test(t)) {
    const e = state.ent;
    const j = (a) => a.length ? a.join(", ") : "—";
    return `<b>${L.pragasHeader}</b><ul><li>Pragas / pests: ${j(e.pragas)}</li><li>Doenças / diseases: ${j(e.doencas)}</li><li>Talhões / plots: ${j(e.talhoes)}</li></ul>`;
  }
  if (/document|doc\b|docs/.test(t)) {
    return `<b>${L.docsHeader}</b>${li(items.filter((i) => i.docKey))}`;
  }
  if (/prazo|data|inspec|deadline|date/.test(t)) {
    if (!state.embarque) return L.noEmbarque;
    return L.prazoLine(dias, regra.maxDias);
  }
  if (/atendid|\bok\b|met\b|tudo|already/.test(t)) {
    return by("ok").length ? `<b>${L.okHeader}</b>${li(by("ok"))}` : "—";
  }
  if (/resumo|summary|status/.test(t)) return summary;
  if (/ajuda|help|oi|ola|hello|hi\b/.test(t)) return L.help;
  return L.fallback;
}

/* --------------------------------------------------------------- CarbonBot */
function evalCarbon() {
  const c = state.carbon;
  const bioma = BIOMAS[c.bioma];
  const items = [];
  items.push({ label: "Inscrição ativa no CAR/SICAR", status: c.car === "sim" ? "ok" : "pendente", note: c.car === "sim" ? "Cadastro Ambiental Rural informado." : "A inscrição no CAR é pré-requisito para qualquer projeto." });
  const deficit = bioma.rl - Number(c.rl || 0);
  items.push({ label: `Reserva Legal ≥ ${bioma.rl}% (${bioma.nome})`, status: deficit <= 0 ? "ok" : "risco", note: deficit <= 0 ? `Atual: ${c.rl}% — em conformidade.` : `Déficit de ${deficit} p.p.; regularize via PRA antes de certificar.` });
  items.push({ label: "Sem supressão recente de vegetação nativa", status: c.desmat === "nao" ? "ok" : "risco", note: c.desmat === "nao" ? "Sem desmatamento recente declarado." : "Supressão recente pode inviabilizar o projeto em padrões voluntários." });
  items.push({ label: "Prática de baixo carbono adotada (Plano ABC+)", status: c.praticas.length ? "ok" : "pendente", note: c.praticas.length ? `${c.praticas.length} prática(s) selecionada(s).` : "Adote ao menos uma prática elegível (ex.: ILPF, plantio direto)." });
  items.push({ label: "Plano de monitoramento (MRV)", status: c.mrv ? "ok" : "pendente", note: c.mrv ? "Plano de MRV confirmado." : "Defina como emissões/remoções serão medidas e verificadas." });
  items.push({ label: "Escala mínima recomendada (≥ 30 ha)", status: Number(c.area) >= 30 ? "ok" : "pendente", note: Number(c.area) >= 30 ? `${c.area} ha.` : "Área pequena: considere projeto agrupado com outras propriedades." });
  const ok = items.filter((i) => i.status === "ok").length;
  return { items, score: Math.round((ok / items.length) * 100), ok };
}

function renderCarbon() {
  const c = state.carbon;
  view().innerHTML = `
    <header class="page-head"><h1>3 · CarbonBot</h1><p>Avalia a elegibilidade da propriedade a créditos de carbono no mercado voluntário.</p></header>
    <p class="alert info">A agropecuária está fora do mercado regulado (SBCE, Lei nº 15.042/2024); os créditos do setor seguem pelo <b>mercado voluntário</b> (ex.: Verra VCS, Gold Standard).</p>
    <div class="grid2 wide-right">
      <section class="card">
        <form id="cform">
          <div class="form-grid">
            <label class="field">Bioma<select name="bioma">${Object.entries(BIOMAS).map(([k, v]) => `<option value="${k}" ${k === c.bioma ? "selected" : ""}>${v.nome}</option>`).join("")}</select></label>
            <label class="field">Área total (ha)<input type="number" min="0" name="area" value="${c.area}"></label>
            <label class="field">Reserva Legal atual (%)<input type="number" min="0" max="100" name="rl" value="${c.rl}"></label>
            <label class="field">CAR/SICAR ativo<select name="car"><option value="sim" ${c.car === "sim" ? "selected" : ""}>Sim</option><option value="nao" ${c.car === "nao" ? "selected" : ""}>Não</option></select></label>
            <label class="field">Desmatamento recente<select name="desmat"><option value="nao" ${c.desmat === "nao" ? "selected" : ""}>Não</option><option value="sim" ${c.desmat === "sim" ? "selected" : ""}>Sim</option></select></label>
            <label class="field">Padrão de certificação<select name="padrao">${["Verra VCS", "Gold Standard"].map((p) => `<option ${p === c.padrao ? "selected" : ""}>${p}</option>`).join("")}</select></label>
          </div>
          <fieldset><legend>Práticas de baixo carbono adotadas</legend>
            ${PRATICAS_CARBONO.map((p) => `<label class="check"><input type="checkbox" name="pratica" value="${p.id}" ${c.praticas.includes(p.id) ? "checked" : ""}> ${p.nome}</label>`).join("")}
          </fieldset>
          <label class="check"><input type="checkbox" name="mrv" ${c.mrv ? "checked" : ""}> Possuo plano de monitoramento, relato e verificação (MRV)</label>
          <button class="btn" type="submit">Avaliar elegibilidade</button>
        </form>
        <div id="cresult"></div>
        <p class="note">Critérios ilustrativos; a base final será curada de CAR/SICAR, Plano ABC+ (MAPA), Verra VCS e Gold Standard.</p>
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
  const paint = () => {
    const r = evalCarbon();
    $("#cresult").innerHTML = `
      <div class="score"><div class="ring" style="--p:${r.score}"><span>${r.score}%</span></div><div><strong>${r.ok} de ${r.items.length} critérios atendidos</strong><small>${r.score >= 80 ? "Boa chance de elegibilidade" : r.score >= 50 ? "Elegibilidade parcial — há ajustes" : "Elegibilidade baixa no momento"}</small></div></div>
      <ul class="checklist">${r.items.map((i) => `<li class="item ${i.status}"><span class="ico"></span><div><strong>${escapeHtml(i.label)}</strong><small>${escapeHtml(i.note)}</small></div><span class="status ${i.status}">${I18N.pt.st[i.status]}</span></li>`).join("")}</ul>`;
  };
  $("#cform").addEventListener("submit", (ev) => { ev.preventDefault(); readForm(); state.carbon.avaliado = true; saveState(); paint(); chat.ask("Resumo"); });
  $("#cform").addEventListener("change", () => { readForm(); saveState(); if (state.carbon.avaliado) paint(); });
  if (c.avaliado) paint();

  const chat = createChat($("#chat"), {
    botName: "CarbonBot",
    greeting: "Olá! Sou o CarbonBot. Preencha os dados da propriedade, clique em <b>Avaliar elegibilidade</b> e pergunte, por exemplo: “o que falta para me qualificar?”",
    chips: ["O que falta?", "Reserva Legal", "Práticas elegíveis", "Qual padrão escolher?", "Mercado regulado?"],
    respond: carbonRespond,
  });
}

function carbonRespond(text) {
  const t = normTxt(text);
  const r = evalCarbon();
  const c = state.carbon;
  const li = (arr) => `<ul>${arr.map((i) => `<li>${escapeHtml(i.label)} — <small>${escapeHtml(i.note)}</small></li>`).join("")}</ul>`;
  const bad = r.items.filter((i) => i.status !== "ok");
  if (/regulad|sbce|obrigat/.test(t)) return "O SBCE (Lei nº 15.042/2024) cria o mercado regulado brasileiro, mas <b>exclui a agropecuária</b> das obrigações. Para o produtor rural, o caminho é o <b>mercado voluntário</b>, com certificação por padrões como Verra VCS ou Gold Standard.";
  if (/padrao|verra|gold|certific/.test(t)) return `Você selecionou <b>${c.padrao}</b>. O <b>Verra VCS</b> é o mais usado em projetos agrícolas e florestais; o <b>Gold Standard</b> dá ênfase a cobenefícios sociais e ambientais. A escolha depende do tipo de projeto e do comprador dos créditos.`;
  if (/reserva|legal|\brl\b/.test(t)) { const i = r.items[1]; return `<b>${escapeHtml(i.label)}</b>: ${escapeHtml(i.note)}`; }
  if (/pratica|abc|ilpf|manejo/.test(t)) return `Práticas do Plano ABC+ consideradas: <ul>${PRATICAS_CARBONO.map((p) => `<li>${p.nome}${c.praticas.includes(p.id) ? " ✓" : ""}</li>`).join("")}</ul>`;
  if (/falta|pendent|qualific|risco|elegi/.test(t)) {
    if (!c.avaliado) return "Clique em <b>Avaliar elegibilidade</b> para eu analisar os dados da propriedade.";
    return bad.length ? `Para se qualificar, ajuste:${li(bad)}` : "Todos os critérios avaliados estão atendidos. 🎉 O próximo passo é estruturar o projeto junto a uma certificadora.";
  }
  if (/resumo|summary|status|avali/.test(t)) {
    if (!c.avaliado) return "Clique em <b>Avaliar elegibilidade</b> para gerar o resumo.";
    return `<b>${r.ok}</b> de <b>${r.items.length}</b> critérios atendidos (<b>${r.score}%</b>) para o padrão <b>${c.padrao}</b>.${bad.length ? ` Pendências: ${bad.length}.` : ""}`;
  }
  if (/ajuda|help|oi|ola/.test(t)) return "Posso falar sobre: <b>o que falta</b>, <b>Reserva Legal</b>, <b>práticas elegíveis</b>, <b>padrão de certificação</b> e <b>mercado regulado</b>.";
  return "Não entendi bem. Tente: “o que falta?”, “Reserva Legal”, “práticas elegíveis” ou “mercado regulado?”.";
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
        <h3>Tecnologias</h3><p><span class="pill">HTML5</span><span class="pill">CSS3</span><span class="pill">JavaScript</span><span class="pill">FastAPI (Sprint 2)</span><span class="pill">spaCy (Sprint 2)</span><span class="pill">PostgreSQL (Sprint 1)</span></p></section>
      <section class="card"><h3>Roadmap das sprints</h3>
        <ol class="timeline"><li class="done"><b>Sprint Zero · 13/10</b><small>Front-end do protótipo (esta entrega)</small></li><li><b>Sprint Um · 20/10</b><small>Diagrama entidade-relacionamento e banco de dados com CRUD</small></li><li><b>Sprint Dois</b><small>Backend FastAPI + NER (spaCy) + motor de regras reais</small></li></ol></section>
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
loadState();
route();
