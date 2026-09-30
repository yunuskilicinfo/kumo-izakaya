/* iptal.html — e-postadaki ?token=… bağlantısıyla rezervasyonu gösterir ve iptal eder. */
(function () {
  "use strict";
  var cfg = window.KUMO_CONFIG || {};
  var P = window.KumoPage;
  if (!cfg.apiBase || !P) return;

  var token = new URLSearchParams(window.location.search).get("token") || "";
  function $(id) { return document.getElementById(id); }
  var statusEl = $("c-status"), details = $("c-details"), result = $("c-result"), btn = $("c-confirm");
  var current = null;      // last reservation payload
  var view = "loading";    // loading | ready | notfound | done | already | past | failed

  function fmt(iso) {
    var loc = P.lang() === "en" ? "en-GB" : "tr-TR";
    return new Intl.DateTimeFormat(loc, { dateStyle: "full", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(new Date(iso));
  }

  function render() {
    statusEl.hidden = view !== "loading";
    details.hidden = view !== "ready";
    result.hidden = view === "loading" || view === "ready";
    result.className = "notice" + (view === "done" ? " notice--ok" : (view === "loading" || view === "ready") ? "" : " notice--error");
    if (view === "ready" && current) {
      $("c-code").textContent = current.code;
      $("c-when").textContent = fmt(current.starts_at);
      $("c-party").textContent = current.party_size;
      $("c-area").textContent = P.t(current.area === "private" ? "cancel-area-private" : "cancel-area-hall");
    }
    var msg = { notfound: "cancel-notfound", already: "cancel-already", past: "cancel-past", failed: "cancel-failed" }[view];
    if (view === "done") result.innerHTML = "<strong>" + P.t("cancel-done") + "</strong><br>" + P.t("cancel-done-p");
    else if (msg) result.textContent = P.t(msg);
  }

  function load() {
    if (!token) { view = "notfound"; render(); return; }
    fetch(cfg.apiBase + "/cancel?token=" + encodeURIComponent(token))
      .then(function (r) { return r.json().then(function (b) { return { ok: r.ok, body: b }; }); })
      .then(function (res) {
        if (!res.ok || res.body.error) view = "notfound";
        else if (res.body.status !== "confirmed") view = "already";
        else if (!res.body.cancellable) view = "past";
        else { current = res.body; view = "ready"; }
        render();
      })
      .catch(function () { view = "failed"; render(); });
  }

  btn.addEventListener("click", function () {
    btn.disabled = true;
    btn.textContent = P.t("cancel-working");
    fetch(cfg.apiBase + "/cancel", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: token })
    })
      .then(function (r) { return r.json().then(function (b) { return { ok: r.ok, body: b }; }); })
      .then(function (res) {
        if (res.ok && res.body.ok) view = "done";
        else if (res.body.error === "past") view = "past";
        else if (res.body.error === "not_active") view = "already";
        else view = "failed";
        render();
      })
      .catch(function () { view = "failed"; render(); })
      .then(function () { btn.disabled = false; btn.textContent = P.t("cancel-confirm"); });
  });

  document.addEventListener("kumo:lang", render);
  render();
  load();
})();
