/* ==========================================================================
   KUMO IZAKAYA — chatbot ("Kumo Asistan")
   Bot sohbeti yalnızca bu sekmenin sessionStorage'ında durur, sunucuya kaydedilmez.
   Personele devir: sohbet 24 saat sunucuda tutulur; devir token'ı localStorage'dadır.
   Mesajlar DOM'a yalnızca textContent ile basılır.
   ========================================================================== */
(function () {
  "use strict";

  var cfg = window.KUMO_CONFIG || {};
  var dict = window.KUMO_I18N || {};
  var api = cfg.chatApiBase;
  var root = document.getElementById("chat");
  if (!api || !root) return;

  var HIST_KEY = "kumo-chat-hist", TOKEN_KEY = "kumo-chat-token";
  var fab = root.querySelector(".chat__fab");
  var panel = root.querySelector(".chat__panel");
  var log = root.querySelector(".chat__log");
  var form = root.querySelector(".chat__form");
  var input = root.querySelector(".chat__input");
  var sendBtn = root.querySelector(".chat__send");
  var live = root.querySelector(".chat__live");
  var consentBox = root.querySelector(".chat__consent");
  var consentCheck = root.querySelector("#chat-consent");
  var handoffLink = root.querySelector(".chat__handoff-link");

  var hist = [];          // bot modu: [{role, content}]
  var token = null;       // devir modu
  var lastId = 0;         // devirde görülen son personel mesajı id'si
  var busy = false, pollTimer = null, greeted = false, restoring = false;

  function lang() { return document.documentElement.lang === "en" ? "en" : "tr"; }
  function t(key) { var e = dict[key]; return e ? (e[lang()] != null ? e[lang()] : e.tr) : key; }
  function store(area, op, k, v) {
    try { var s = window[area]; return op === "get" ? s.getItem(k) : op === "set" ? s.setItem(k, v) : s.removeItem(k); } catch (e) { return null; }
  }

  /* ------------------------------------------------------------ rendering */
  function bubble(kind, text) {
    var el = document.createElement("div");
    el.className = "chat__msg chat__msg--" + kind;
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }
  function actionButton(label, fn) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "chat__action"; b.textContent = label;
    b.addEventListener("click", fn);
    log.appendChild(b);
    log.scrollTop = log.scrollHeight;
    return b;
  }
  function note(text) {
    var el = document.createElement("p");
    el.className = "chat__note"; el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
  }
  function setBusy(v) {
    busy = v; sendBtn.disabled = v; root.classList.toggle("is-busy", v);
  }
  function announce(s) { live.textContent = ""; window.setTimeout(function () { live.textContent = s; }, 50); }

  function greet() {
    if (greeted) return;
    greeted = true;
    bubble("bot", t("chat-greeting"));
  }

  function replay() {
    log.textContent = ""; greeted = false;
    greet();
    hist.forEach(function (m) { bubble(m.role === "user" ? "user" : "bot", m.content); });
  }

  /* ------------------------------------------------------------ bot mode */
  function post(path, body) {
    return fetch(api + "/" + path, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (b) { return { status: res.status, body: b }; });
    });
  }
  function fail(res) {
    if (res && res.status === 429) return t("chat-err-rate");
    return t("chat-err-down");
  }

  function sendBot(text) {
    hist.push({ role: "user", content: text });
    store("sessionStorage", "set", HIST_KEY, JSON.stringify(hist.slice(-20)));
    bubble("user", text);
    setBusy(true);
    var typing = bubble("bot", "…"); typing.classList.add("is-typing");
    post("message", { messages: hist.slice(-10), lang: lang() }).then(function (res) {
      typing.remove();
      if (res.status !== 200 || !res.body.text) { bubble("bot", fail(res)); hist.pop(); return; }
      hist.push({ role: "assistant", content: res.body.text });
      store("sessionStorage", "set", HIST_KEY, JSON.stringify(hist.slice(-20)));
      bubble("bot", res.body.text);
      announce(res.body.text);
      var acts = res.body.actions || [];
      if (acts.indexOf("reserve") > -1) {
        actionButton(t("chat-act-reserve"), function () {
          closePanel();
          if (window.KumoOpenReserve) window.KumoOpenReserve();
        });
      }
      if (acts.indexOf("handoff") > -1) offerHandoff();
    }).catch(function () {
      typing.remove(); hist.pop(); bubble("bot", t("chat-err-down"));
    }).then(function () { setBusy(false); input.focus(); });
  }

  /* ------------------------------------------------------------ handoff */
  function offerHandoff() {
    actionButton(t("chat-act-handoff"), function () { consentBox.hidden = false; consentCheck.focus(); });
  }
  root.querySelector(".chat__consent-go").addEventListener("click", function () {
    if (!consentCheck.checked) { consentCheck.focus(); return; }
    if (!hist.length) hist.push({ role: "user", content: t("chat-handoff-default") });
    setBusy(true);
    post("handoff", { messages: hist.slice(-10), lang: lang(), consent: true }).then(function (res) {
      if (res.status !== 200 || !res.body.token) { bubble("bot", fail(res)); return; }
      token = res.body.token; lastId = 0;
      store("localStorage", "set", TOKEN_KEY, token);
      store("sessionStorage", "remove", HIST_KEY);
      consentBox.hidden = true; consentCheck.checked = false;
      enterHandoff();
      note(t("chat-handoff-started"));
    }).catch(function () { bubble("bot", t("chat-err-down")); }).then(function () { setBusy(false); });
  });
  root.querySelector(".chat__consent-cancel").addEventListener("click", function () { consentBox.hidden = true; });
  handoffLink.addEventListener("click", function () { consentBox.hidden = false; consentCheck.focus(); });

  function enterHandoff() {
    root.classList.add("is-handoff");
    handoffLink.hidden = true;
    root.querySelector(".chat__status").textContent = t("chat-status-staff");
    startPolling();
  }
  function leaveHandoff() {
    token = null; lastId = 0; stopPolling();
    store("localStorage", "remove", TOKEN_KEY);
    root.classList.remove("is-handoff");
    handoffLink.hidden = false;
    root.querySelector(".chat__status").textContent = t("chat-status-bot");
  }

  function sendStaff(text) {
    bubble("user", text);
    setBusy(true);
    post("send", { token: token, body: text }).then(function (res) {
      if (res.status === 404) { note(t("chat-handoff-gone")); leaveHandoff(); }
      else if (res.status === 409) { note(t("chat-handoff-closed")); leaveHandoff(); }
      else if (res.status !== 200) bubble("bot", fail(res));
    }).catch(function () { bubble("bot", t("chat-err-down")); }).then(function () { setBusy(false); input.focus(); });
  }

  function pollOnce() {
    if (!token) return;
    fetch(api + "/poll?token=" + encodeURIComponent(token) + "&after=" + lastId)
      .then(function (r) { return r.json(); })
      .then(function (b) {
        if (!token) return;
        if (b.status === "gone") { note(t("chat-handoff-gone")); leaveHandoff(); return; }
        var first = lastId === 0;
        (b.messages || []).forEach(function (m) {
          lastId = Math.max(lastId, m.id);
          if (m.sender === "staff") { bubble("staff", m.body); if (!first) announce(m.body); }
          else if (first && restoring) bubble("user", m.body);
        });
        if (first) restoring = false;
        if (b.status === "closed") { note(t("chat-handoff-closed")); leaveHandoff(); }
      }).catch(function () { /* sonraki turda yeniden dene */ });
  }
  function startPolling() {
    stopPolling();
    pollOnce();
    var tick = 0;
    pollTimer = window.setInterval(function () {
      tick++;
      // Panel açıkken 5 sn'de bir, kapalı veya sekme gizliyken 30 sn'de bir.
      if ((!root.classList.contains("is-open") || document.hidden) && tick % 6 !== 0) return;
      pollOnce();
    }, 5000);
  }
  function stopPolling() { if (pollTimer) { window.clearInterval(pollTimer); pollTimer = null; } }

  /* ------------------------------------------------------------ panel */
  var lastFocus = null;
  function openPanel() {
    lastFocus = document.activeElement;
    root.classList.add("is-open");
    panel.hidden = false;
    fab.setAttribute("aria-expanded", "true");
    document.documentElement.classList.add("chat-open");
    greet();
    input.focus();
  }
  function closePanel() {
    root.classList.remove("is-open");
    panel.hidden = true;
    fab.setAttribute("aria-expanded", "false");
    document.documentElement.classList.remove("chat-open");
    if (lastFocus && lastFocus.focus) lastFocus.focus(); else fab.focus();
  }
  fab.addEventListener("click", function () { if (root.classList.contains("is-open")) closePanel(); else openPanel(); });
  root.querySelector(".chat__close").addEventListener("click", closePanel);
  root.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && root.classList.contains("is-open")) { e.stopPropagation(); closePanel(); }
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text || busy) return;
    input.value = ""; autosize();
    if (token) sendStaff(text); else sendBot(text);
  });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
  });
  function autosize() { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 110) + "px"; }
  input.addEventListener("input", autosize);

  /* ------------------------------------------------------------ language */
  function applyStatic() {
    root.querySelectorAll("[data-chat-i18n]").forEach(function (el) { el.textContent = t(el.getAttribute("data-chat-i18n")); });
    input.placeholder = t("chat-placeholder");
    input.setAttribute("aria-label", t("chat-placeholder"));
    fab.setAttribute("aria-label", t("chat-open"));
    root.querySelector(".chat__close").setAttribute("aria-label", t("chat-close"));
    panel.setAttribute("aria-label", t("chat-title"));
    root.querySelector(".chat__status").textContent = t(token ? "chat-status-staff" : "chat-status-bot");
  }

  window.KumoChat = {
    onLangChange: function () {
      applyStatic();
      if (!token) replay();
    }
  };

  /* ------------------------------------------------------------ init */
  try { hist = JSON.parse(store("sessionStorage", "get", HIST_KEY) || "[]") || []; } catch (e) { hist = []; }
  if (!Array.isArray(hist)) hist = [];
  applyStatic();
  var saved = store("localStorage", "get", TOKEN_KEY);
  if (saved) { token = saved; greeted = true; restoring = true; enterHandoff(); }
  else if (hist.length) replay();
})();
