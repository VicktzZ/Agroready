/* ==========================================================================
   chat.js — componente de chat reutilizado pelo ExportBot e pelo CarbonBot.
   Na Sprint 2 o `respond` será substituído por uma chamada à API FastAPI.
   ========================================================================== */

function createChat(root, { botName, greeting, chips = [], respond }) {
  root.innerHTML = `
    <div class="chat-head"><span class="dot"></span><strong>${botName}</strong><small>assistente conversacional</small></div>
    <div class="chat-log" role="log" aria-live="polite"></div>
    <div class="chips"></div>
    <form class="chat-form" autocomplete="off">
      <input type="text" placeholder="Digite sua pergunta…" aria-label="Mensagem">
      <button type="submit">Enviar</button>
    </form>`;

  const log = root.querySelector(".chat-log");
  const chipsEl = root.querySelector(".chips");
  const form = root.querySelector("form");
  const input = form.querySelector("input");

  function add(who, html) {
    const el = document.createElement("div");
    el.className = `msg msg-${who}`;
    el.innerHTML = html;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function botSay(html, delay = 450) {
    const typing = add("bot", '<span class="typing"><i></i><i></i><i></i></span>');
    return new Promise((resolve) => {
      setTimeout(() => { typing.innerHTML = html; log.scrollTop = log.scrollHeight; resolve(); }, delay);
    });
  }

  function ask(text) {
    const t = text.trim();
    if (!t) return;
    add("user", escapeHtml(t));
    botSay(respond(t));
  }

  chips.forEach((label) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = label;
    b.addEventListener("click", () => ask(label));
    chipsEl.appendChild(b);
  });

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    ask(input.value);
    input.value = "";
    input.focus();
  });

  botSay(greeting, 200);
  return { botSay, ask };
}
