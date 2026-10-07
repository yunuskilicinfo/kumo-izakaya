/* ==========================================================================
   KUMO IZAKAYA — üye hesabı (hesap.html)
   Giriş: Google ya da (cfg.emailOtp açıksa) e-postaya gelen 6 haneli kod.
   Tüm veriler Edge Function "booking" üzerinden gelir (/me, /me-update,
   /me-cancel, /me-delete, /event-book, /event-cancel); tarayıcı tablolara
   doğrudan erişmez. Kullanıcı/etkinlik metinleri DOM'a yalnızca textContent
   ile basılır; innerHTML yalnızca js/i18n.js'deki sabit metinler içindir.
   ========================================================================== */
(function () {
  "use strict";

  var cfg = window.KUMO_CONFIG || {};
  var P = window.KumoPage, A = window.KumoAuth;
  var root = document.getElementById("acc");
  if (!root || !P || !A || !cfg.apiBase) return;
  var TZ = "Europe/Istanbul";

  // view: loading | out | in | error | deleted
  var state = { view: "loading", data: null, email: "", codeSent: false, msg: null };

  /* ------------------------------------------------------------ helpers */
  function t(key, vars) {
    var s = P.t(key);
    if (vars) Object.keys(vars).forEach(function (k) { s = s.split("{" + k + "}").join(vars[k]); });
    return s;
  }
  function lang() { return P.lang(); }
  function append(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { append(el, x); }); return; }
    el.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
  }
  function h(tag, props) {
    var el = document.createElement(tag), later = null;
    if (props) Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v == null || v === false) return;
      if (k === "text") el.textContent = v;
      else if (k === "html") el.innerHTML = v;            // yalnızca i18n.js'deki sabit metinler
      else if (k === "class") el.className = v;
      else if (k === "value") later = v;
      else if (k === "checked") el.checked = !!v;
      else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    });
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    if (later != null) el.value = later;
    return el;
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function field(label, input, id, hint) {
    input.id = id;
    return h("div", { class: "acc-field" }, h("label", { for: id, text: label }), input, hint || null);
  }
  function fmtWhen(iso) {
    var d = new Date(iso), loc = lang() === "en" ? "en-GB" : "tr-TR";
    return new Intl.DateTimeFormat(loc, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: TZ }).format(d) +
      " · " + new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ }).format(d);
  }
  function digits(s) { return String(s || "").replace(/\D/g, "").length; }
  function say(key, kind) { state.msg = key ? { key: key, kind: kind || "ok" } : null; }
  function errKey(res) {
    if (res && res.status === 429) return "acc-err-rate";
    return "acc-err-generic";
  }
  function scrollTop() { try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) { window.scrollTo(0, 0); } }

  /* ------------------------------------------------------------ data */
  function load() {
    return A.api("me").then(function (r) {
      if (r.status === 401) {
        return A.signOut().then(function () { state.view = "out"; render(); });
      }
      if (r.status !== 200 || !r.body || r.body.error) { state.view = "error"; render(); return; }
      state.data = r.body; state.view = "in"; render();
    }).catch(function () { state.view = "error"; render(); });
  }

  /* ------------------------------------------------------------ render */
  function render() {
    clear(root);
    if (state.view === "loading") {
      root.appendChild(h("h1", { text: t("acc-title") }));
      root.appendChild(h("p", { text: t("acc-loading") }));
      return;
    }
    if (state.view === "error") {
      root.appendChild(h("h1", { text: t("acc-title") }));
      root.appendChild(h("div", { class: "notice notice--error", role: "alert", text: t("acc-err-load") }));
      return;
    }
    if (state.view === "deleted") {
      root.appendChild(h("h1", { text: t("acc-title") }));
      root.appendChild(h("div", { class: "notice notice--ok", role: "status", text: t("acc-deleted") }));
      return;
    }
    if (state.view === "out") renderOut(); else renderIn();
  }

  function notice() {
    if (!state.msg) return null;
    var err = state.msg.kind === "error";
    return h("div", { class: "notice acc-notice " + (err ? "notice--error" : "notice--ok"), role: err ? "alert" : "status", text: t(state.msg.key) });
  }

  /* ---------- signed out ---------- */
  function renderOut() {
    root.appendChild(h("h1", { text: t("acc-title") }));
    append(root, notice());
    root.appendChild(h("p", { class: "acc-lead", text: t("acc-intro") }));
    root.appendChild(h("ul", { class: "acc-perks" },
      ["acc-perk-1", "acc-perk-2", "acc-perk-3", "acc-perk-4", "acc-perk-5"].map(function (k) { return h("li", { text: t(k) }); })));

    var card = h("div", { class: "card acc-login" });
    var google = h("button", { class: "btn-solid acc-google", type: "button", onclick: function () {
      google.disabled = true;
      A.signInGoogle().then(function (r) {
        if (r && r.error) { google.disabled = false; say("acc-err-oauth", "error"); render(); }
      }).catch(function () { google.disabled = false; say("acc-err-oauth", "error"); render(); });
    } }, googleMark(), h("span", { text: t("acc-google") }));
    card.appendChild(google);

    if (cfg.emailOtp) {
      card.appendChild(h("p", { class: "acc-or", text: t("acc-or") }));
      card.appendChild(state.codeSent ? codeForm() : emailForm());
    }
    card.appendChild(h("p", { class: "acc-legal", html: t("acc-legal") }));
    root.appendChild(card);
  }

  function googleMark() {
    var ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 48 48"); svg.setAttribute("aria-hidden", "true"); svg.setAttribute("class", "acc-google__g");
    [["#FFC107", "M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"],
     ["#FF3D00", "M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"],
     ["#4CAF50", "M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"],
     ["#1976D2", "M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"]]
      .forEach(function (p) { var path = document.createElementNS(ns, "path"); path.setAttribute("fill", p[0]); path.setAttribute("d", p[1]); svg.appendChild(path); });
    return svg;
  }

  function emailForm() {
    var email = h("input", { type: "email", autocomplete: "email", required: true, maxlength: 200, value: state.email });
    var btn = h("button", { class: "btn-solid btn-solid--quiet", type: "submit", text: t("acc-send-code") });
    return h("form", { class: "acc-otp", novalidate: true, onsubmit: function (e) {
      e.preventDefault();
      var v = email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { say("acc-err-email", "error"); render(); return; }
      btn.disabled = true;
      A.sendCode(v).then(function (r) {
        if (r && r.error) { say(r.error.status === 429 ? "acc-err-rate" : "acc-err-send", "error"); render(); return; }
        state.email = v; state.codeSent = true; say("acc-code-sent"); render();
      }).catch(function () { say("acc-err-send", "error"); render(); });
    } }, field(t("acc-email"), email, "acc-email"), btn);
  }

  function codeForm() {
    var code = h("input", { type: "text", inputmode: "numeric", autocomplete: "one-time-code", required: true, maxlength: 10, pattern: "[0-9]*" });
    var btn = h("button", { class: "btn-solid", type: "submit", text: t("acc-verify") });
    var back = h("button", { class: "acc-linkbtn", type: "button", text: t("acc-change-email"), onclick: function () {
      state.codeSent = false; say(null); render();
    } });
    window.setTimeout(function () { code.focus(); }, 0);
    return h("form", { class: "acc-otp", onsubmit: function (e) {
      e.preventDefault();
      var v = code.value.replace(/\D/g, "");
      if (v.length < 6) { say("acc-err-code", "error"); render(); return; }
      btn.disabled = true;
      A.verifyCode(state.email, v).then(function (r) {
        if (r && r.error) { say("acc-err-code", "error"); render(); return; }
        state.codeSent = false; say(null); state.view = "loading"; render(); load();
      }).catch(function () { say("acc-err-code", "error"); render(); });
    } }, h("p", { class: "acc-muted", text: state.email }), field(t("acc-code"), code, "acc-code"), h("div", { class: "acc-actions" }, btn, back));
  }

  /* ---------- signed in ---------- */
  function renderIn() {
    var d = state.data, p = d.profile || {};
    var complete = !!(p.full_name && p.phone);

    root.appendChild(h("div", { class: "acc-top" },
      h("div", null,
        h("h1", { text: t("acc-hello") + (p.full_name ? ", " + p.full_name.split(" ")[0] : "") }),
        h("p", { class: "acc-muted", text: d.email || "" })),
      h("button", { class: "btn-solid btn-solid--quiet", type: "button", text: t("acc-signout"), onclick: function () {
        A.signOut().then(function () { state.data = null; state.view = "out"; say(null); render(); scrollTop(); });
      } })));
    append(root, notice());
    if (!complete) root.appendChild(h("div", { class: "notice acc-notice" }, h("a", { href: "#acc-profile", text: t("acc-incomplete") })));

    root.appendChild(loyaltySection(d));
    root.appendChild(eventsSection(d, complete));
    root.appendChild(reservationsSection(d));
    root.appendChild(profileSection(p));
    root.appendChild(deleteSection());
  }

  function section(title, id) {
    return h("section", { class: "acc-sec", id: id || null }, h("h2", { text: title }));
  }

  function loyaltySection(d) {
    var l = d.loyalty, sec = section(t("acc-card-h"), "acc-card");
    var n = Math.min(l.stamps, l.per_reward);
    var row = h("div", { class: "acc-stamps", role: "img", "aria-label": t("acc-card-progress", { n: n, total: l.per_reward }) });
    for (var i = 0; i < l.per_reward; i++) {
      row.appendChild(h("span", { class: "acc-stamp" + (i < n ? " is-on" : ""), "aria-hidden": "true", text: i < n ? "雲" : "" }));
    }
    var card = h("div", { class: "card acc-loyalty" },
      row,
      h("p", { class: "acc-loyalty__count", text: t("acc-card-progress", { n: n, total: l.per_reward }) }),
      h("p", null, h("span", { class: "acc-muted", text: t("acc-card-reward") + " " }), h("strong", { text: l.reward_text[lang()] || l.reward_text.tr })),
      h("p", { class: "acc-muted acc-small", text: t("acc-card-how") }));
    sec.appendChild(card);

    var ready = (d.rewards || []).filter(function (r) { return r.status === "issued"; });
    if (ready.length) {
      sec.appendChild(h("h3", { text: t("acc-rewards-h") }));
      sec.appendChild(h("div", { class: "acc-list" }, ready.map(function (r) {
        return h("div", { class: "acc-item acc-reward" },
          h("div", null, h("div", { class: "acc-reward__code", text: r.code }), h("div", { class: "acc-muted acc-small", text: t("acc-reward-hint") })),
          h("div", { class: "acc-reward__what", text: l.reward_text[lang()] || l.reward_text.tr }));
      })));
    }
    return sec;
  }

  function eventsSection(d, complete) {
    var sec = section(t("acc-events-h"), "acc-events");
    var list = d.events || [];
    if (!list.length) { sec.appendChild(h("p", { class: "acc-muted", text: t("acc-events-none") })); return sec; }
    sec.appendChild(h("div", { class: "acc-list" }, list.map(function (e) {
      var en = lang() === "en";
      var title = (en && e.title_en) || e.title_tr, body = (en && e.body_en) || e.body_tr, price = (en && e.price_note_en) || e.price_note_tr;
      var foot;
      if (e.mine) {
        foot = h("div", { class: "acc-actions" },
          h("span", { class: "acc-badge acc-badge--ok", text: t("acc-events-mine", { n: e.mine.party_size }) }),
          h("button", { class: "btn-solid btn-solid--quiet", type: "button", text: t("acc-events-cancel"), onclick: function (ev) {
            if (!window.confirm(t("acc-events-cancel-q"))) return;
            ev.target.disabled = true;
            A.api("event-cancel", { body: { id: e.mine.id } }).then(function (r) {
              if (r.body && r.body.ok) { say("acc-events-cancelled"); load(); }
              else { ev.target.disabled = false; say(errKey(r), "error"); render(); }
            }).catch(function () { ev.target.disabled = false; say("acc-err-generic", "error"); render(); });
          } }));
      } else if (e.seats_left <= 0) {
        foot = h("span", { class: "acc-badge", text: t("acc-events-full") });
      } else if (!complete) {
        foot = h("a", { href: "#acc-profile", class: "acc-small", text: t("acc-incomplete") });
      } else {
        var max = Math.min(e.max_party, e.seats_left), pid = "ev-party-" + e.id, party = h("select", { id: pid });
        for (var i = 1; i <= max; i++) party.appendChild(h("option", { value: String(i), text: String(i) }));
        foot = h("form", { class: "acc-actions", onsubmit: function (ev) {
          ev.preventDefault();
          var btn = ev.target.querySelector("button");
          btn.disabled = true;
          A.api("event-book", { body: { id: e.id, party: +party.value } }).then(function (r) {
            if (r.body && r.body.ok) { say("acc-events-booked"); load(); return; }
            var reason = r.body && r.body.reason;
            var err = r.body && r.body.error;
            say(err === "profile_incomplete" ? "acc-incomplete" : reason === "full" || reason === "party" ? "acc-events-err-full" : reason === "duplicate" ? "acc-events-err-dup" : errKey(r), "error");
            load();
          }).catch(function () { btn.disabled = false; say("acc-err-generic", "error"); render(); });
        } },
          h("label", { class: "acc-inline", for: pid }, t("acc-events-party")), party,
          h("button", { class: "btn-solid", type: "submit", text: t("acc-events-book") }),
          h("span", { class: "acc-muted acc-small", text: t("acc-events-left", { n: e.seats_left }) }));
      }
      return h("article", { class: "card acc-event" },
        h("p", { class: "acc-event__when", text: fmtWhen(e.starts_at) }),
        h("h3", { text: title }),
        body ? h("p", { class: "acc-event__body", text: body }) : null,
        price ? h("p", { class: "acc-muted", text: price }) : null,
        foot);
    })));
    return sec;
  }

  function reservationsSection(d) {
    var sec = section(t("acc-res-h"), "acc-res");
    sec.appendChild(h("p", null, h("a", { class: "btn-solid", href: "index.html?reserve=1", text: t("acc-res-new") })));
    var now = Date.now(), rows = d.reservations || [];
    var up = rows.filter(function (r) { return r.status === "confirmed" && Date.parse(r.starts_at) > now; }).reverse();
    var past = rows.filter(function (r) { return up.indexOf(r) < 0; });
    if (!rows.length) { sec.appendChild(h("p", { class: "acc-muted", text: t("acc-res-none") })); return sec; }
    function item(r, cancellable) {
      return h("div", { class: "acc-item" },
        h("div", null,
          h("div", { class: "acc-item__title", text: fmtWhen(r.starts_at) }),
          h("div", { class: "acc-muted acc-small", text: [t("acc-guests", { n: r.party_size }), t(r.area === "private" ? "cancel-area-private" : "cancel-area-hall"), r.code].join(" · ") })),
        cancellable
          ? h("button", { class: "btn-solid btn-solid--quiet", type: "button", text: t("acc-res-cancel"), onclick: function (ev) {
              if (!window.confirm(t("acc-res-cancel-q"))) return;
              ev.target.disabled = true;
              A.api("me-cancel", { body: { id: r.id } }).then(function (x) {
                if (x.body && x.body.ok) { say("acc-res-cancelled"); load(); }
                else { ev.target.disabled = false; say(errKey(x), "error"); load(); }
              }).catch(function () { ev.target.disabled = false; say("acc-err-generic", "error"); render(); });
            } })
          : h("span", { class: "acc-badge acc-badge--" + r.status, text: t("acc-status-" + r.status) }));
    }
    if (up.length) {
      sec.appendChild(h("h3", { text: t("acc-res-upcoming") }));
      sec.appendChild(h("div", { class: "acc-list" }, up.map(function (r) { return item(r, true); })));
    }
    if (past.length) {
      sec.appendChild(h("h3", { text: t("acc-res-past") }));
      sec.appendChild(h("div", { class: "acc-list" }, past.map(function (r) { return item(r, false); })));
    }
    return sec;
  }

  function profileSection(p) {
    var sec = section(t("acc-profile-h"), "acc-profile");
    var name = h("input", { type: "text", autocomplete: "name", maxlength: 100, value: p.full_name || "" });
    var phone = h("input", { type: "tel", autocomplete: "tel", inputmode: "tel", maxlength: 30, placeholder: "+90 5XX XXX XX XX", value: p.phone || "" });
    var day = h("select", { "aria-label": t("acc-bday-day") }, h("option", { value: "", text: t("acc-bday-day") }));
    for (var i = 1; i <= 31; i++) day.appendChild(h("option", { value: String(i), text: String(i) }));
    var month = h("select", { "aria-label": t("acc-bday-month") }, h("option", { value: "", text: t("acc-bday-month") }));
    var mf = new Intl.DateTimeFormat(lang() === "en" ? "en-GB" : "tr-TR", { month: "long", timeZone: "UTC" });
    for (var m = 1; m <= 12; m++) month.appendChild(h("option", { value: String(m), text: mf.format(new Date(Date.UTC(2024, m - 1, 1))) }));
    day.value = p.birth_day ? String(p.birth_day) : "";
    month.value = p.birth_month ? String(p.birth_month) : "";
    var mailLang = h("select", null, h("option", { value: "tr", text: "Türkçe" }), h("option", { value: "en", text: "English" }));
    mailLang.value = p.lang === "en" ? "en" : "tr";
    var mkt = h("input", { type: "checkbox", id: "acc-mkt", checked: !!p.marketing });
    var btn = h("button", { class: "btn-solid", type: "submit", text: t("acc-save") });

    var form = h("form", { class: "card acc-form", novalidate: true, onsubmit: function (e) {
      e.preventDefault();
      if (phone.value.trim() && (digits(phone.value) < 7 || digits(phone.value) > 15)) { say("acc-err-phone", "error"); render(); scrollTop(); return; }
      if (!day.value !== !month.value) { say("acc-err-bday", "error"); render(); scrollTop(); return; }
      btn.disabled = true;
      A.api("me-update", { body: {
        full_name: name.value.trim(), phone: phone.value.trim(),
        birth_day: day.value ? +day.value : null, birth_month: month.value ? +month.value : null,
        lang: mailLang.value, marketing: mkt.checked
      } }).then(function (r) {
        if (r.body && r.body.ok) { say("acc-saved"); load().then(scrollTop); return; }
        btn.disabled = false;
        var f = r.body && r.body.field;
        say(f === "phone" ? "acc-err-phone" : f === "birthday" ? "acc-err-bday" : errKey(r), "error"); render(); scrollTop();
      }).catch(function () { btn.disabled = false; say("acc-err-generic", "error"); render(); scrollTop(); });
    } },
      field(t("acc-name"), name, "acc-name"),
      field(t("acc-phone"), phone, "acc-phone"),
      h("div", { class: "acc-field" }, h("span", { class: "acc-label", text: t("acc-bday") }), h("div", { class: "acc-row" }, day, month)),
      field(t("acc-lang"), mailLang, "acc-lang"),
      h("div", { class: "field-check acc-check" }, mkt, h("label", { for: "acc-mkt", text: t("acc-marketing") })),
      btn);
    sec.appendChild(form);
    return sec;
  }

  function deleteSection() {
    var sec = section(t("acc-delete-h"), "acc-delete");
    sec.appendChild(h("p", { class: "acc-muted", text: t("acc-delete-p") }));
    sec.appendChild(h("button", { class: "btn-solid btn-solid--quiet acc-danger", type: "button", text: t("acc-delete"), onclick: function (ev) {
      if (!window.confirm(t("acc-delete-q"))) return;
      ev.target.disabled = true;
      A.api("me-delete", { body: { confirm: true } }).then(function (r) {
        if (r.body && r.body.ok) {
          return A.signOut().then(function () { state.data = null; state.view = "deleted"; render(); scrollTop(); });
        }
        ev.target.disabled = false; say(errKey(r), "error"); render(); scrollTop();
      }).catch(function () { ev.target.disabled = false; say("acc-err-generic", "error"); render(); });
    } }));
    return sec;
  }

  /* ------------------------------------------------------------ boot */
  var q = new URLSearchParams(window.location.search);
  var returning = q.has("code") || q.has("error");
  var oauthError = q.has("error");

  document.addEventListener("kumo:lang", render);
  render();

  A.session().then(function (s) {
    if (returning) {
      // ?code=… / ?error=… adres çubuğunda kalmasın
      try { window.history.replaceState(null, "", window.location.pathname + window.location.hash); } catch (e) { /* yok say */ }
    }
    if (!s) {
      if (oauthError || returning) say("acc-err-oauth", "error");
      state.view = "out"; render(); return;
    }
    load();
  });
})();
