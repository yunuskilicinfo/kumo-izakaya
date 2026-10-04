/* ==========================================================================
   KUMO IZAKAYA — yönetim paneli
   Giriş: Supabase Auth (e-posta + şifre). Okuma/ayar/kapalı gün işlemleri RLS
   ile doğrudan tablolara, e-posta gönderen işlemler (iptal, durum, manuel
   rezervasyon) Edge Function'ın /admin rotasına gider.
   Müşteri girdisi (ad, not…) DOM'a yalnızca textContent ile basılır.
   ========================================================================== */
(function () {
  "use strict";

  var cfg = window.KUMO_CONFIG || {};
  var app = document.getElementById("app");
  var nav = document.getElementById("admin-nav");
  if (!window.supabase || !cfg.supabaseUrl) {
    app.textContent = "Yönetim paneli yüklenemedi (supabase-js). Sayfayı yenileyin.";
    return;
  }
  var sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
  var TZ = "Europe/Istanbul";

  var STATUS = { confirmed: "Onaylı", cancelled: "İptal", no_show: "Gelmedi", completed: "Tamamlandı" };
  var AREA = { hall: "Salon", private: "Özel oda" };
  var WEEKDAYS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
  var REASONS = {
    full: "Bu saatte kapasite dolu. Yine de eklemek için “Kapasiteyi aş” seçin.",
    closed: "O gün/saat kapalı. Yine de eklemek için “Kapasiteyi aş” seçin.",
    party: "Kişi sayısı bu alanın sınırını aşıyor. Yine de eklemek için “Kapasiteyi aş” seçin.",
    lead: "Çok yakın bir saat. Yine de eklemek için “Kapasiteyi aş” seçin.",
    horizon: "Çok ileri bir tarih. Yine de eklemek için “Kapasiteyi aş” seçin.",
    duplicate: "Aynı telefonla o gün için zaten bir rezervasyon var. “Kapasiteyi aş” ile yine de ekleyebilirsiniz."
  };

  var state = { tab: window.location.hash === "#chats" ? "chats" : "day", chat: null, date: todayIst(), rows: [], settings: null, hours: [], closures: [], banner: null };

  /* ------------------------------------------------------------ DOM helpers */
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
      else if (k === "class") el.className = v;
      else if (k === "value") later = v;          // <select> needs its options first
      else if (k === "checked") el.checked = !!v;
      else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    });
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    if (later != null) el.value = later;
    return el;
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function field(label, input, id) {
    input.id = id;
    return h("div", { class: "a-field" }, h("label", { for: id, text: label }), input);
  }

  /* ------------------------------------------------------------ time helpers */
  function pad(n) { return String(n).padStart(2, "0"); }
  function todayIst() { return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date()); }
  function shiftDate(date, days) {
    var d = new Date(date + "T12:00:00+03:00");
    d.setUTCDate(d.getUTCDate() + days);
    return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
  }
  function dayBounds(date) {
    var a = new Date(date + "T00:00:00+03:00");
    return [a.toISOString(), new Date(a.getTime() + 864e5).toISOString()];
  }
  function fmtTime(iso) {
    return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ }).format(new Date(iso));
  }
  function fmtDay(date) {
    return new Intl.DateTimeFormat("tr-TR", { dateStyle: "full", timeZone: TZ }).format(new Date(date + "T12:00:00+03:00"));
  }
  function weekday(date) { return new Date(date + "T12:00:00+03:00").getUTCDay(); }
  function toMin(t) { var p = String(t).split(":"); return +p[0] * 60 + +p[1]; }
  function hhmm(m) { return pad(Math.floor(m / 60)) + ":" + pad(m % 60); }

  /* ------------------------------------------------------------ feedback */
  var bannerEl = null;
  function banner(msg, kind) {
    if (bannerEl && bannerEl.parentNode) bannerEl.parentNode.removeChild(bannerEl);
    if (!msg) return;
    var mine = bannerEl = h("div", { class: "a-banner a-banner--" + (kind || "ok"), role: kind === "error" ? "alert" : "status", text: msg });
    app.insertBefore(mine, app.firstChild);
    if (kind !== "error") window.setTimeout(function () {
      if (mine.parentNode) mine.parentNode.removeChild(mine);
      if (bannerEl === mine) bannerEl = null;
    }, 5000);
  }

  function callAdmin(payload) {
    return sb.auth.getSession().then(function (r) {
      var session = r.data && r.data.session;
      if (!session) throw new Error("no session");
      return fetch(cfg.apiBase + "/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
        body: JSON.stringify(payload)
      });
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (b) { return { status: res.status, body: b }; });
    });
  }

  /* ------------------------------------------------------------ auth */
  function showLogin(message) {
    nav.hidden = true;
    clear(app);
    var email = h("input", { type: "email", autocomplete: "username", required: true });
    var pass = h("input", { type: "password", autocomplete: "current-password", required: true });
    var btn = h("button", { class: "btn-solid", type: "submit", text: "Giriş yap" });
    var form = h("form", { class: "a-login", onsubmit: function (e) {
      e.preventDefault();
      btn.disabled = true;
      sb.auth.signInWithPassword({ email: email.value.trim(), password: pass.value }).then(function (r) {
        if (r.error) { btn.disabled = false; banner("E-posta veya şifre hatalı.", "error"); return; }
        start();
      });
    } },
      h("h1", { text: "Yönetim girişi" }),
      field("E-posta", email, "l-email"), field("Şifre", pass, "l-pass"), btn);
    app.appendChild(form);
    if (message) banner(message, "error");
  }

  function start() {
    sb.auth.getSession().then(function (r) {
      if (!r.data.session) { showLogin(); return; }
      sb.from("admin_users").select("user_id").maybeSingle().then(function (a) {
        if (a.error || !a.data) {
          sb.auth.signOut().then(function () { showLogin("Bu hesabın yönetici yetkisi yok."); });
          return;
        }
        Promise.all([
          sb.from("settings").select("*").eq("id", 1).single(),
          sb.from("opening_hours").select("*").order("weekday")
        ]).then(function (res) {
          if (res[0].error || res[1].error) { showLogin("Ayarlar okunamadı."); return; }
          state.settings = res[0].data; state.hours = res[1].data;
          nav.hidden = false;
          render();
        });
      });
    });
  }

  nav.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    if (b.id === "logout") { sb.auth.signOut().then(function () { showLogin(); }); return; }
    state.tab = b.getAttribute("data-tab");
    render();
  });

  function render() {
    Array.prototype.forEach.call(nav.querySelectorAll("[data-tab]"), function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-tab") === state.tab ? "true" : "false");
    });
    stopChatTimer();
    clear(app);
    if (bannerEl) app.appendChild(bannerEl);   // keep the last message across a re-render
    if (state.tab === "day") renderDay();
    else if (state.tab === "closures") renderClosures();
    else if (state.tab === "chats") renderChats();
    else renderSettings();
  }

  /* ------------------------------------------------------------ day view */
  function renderDay() {
    var box = h("div");
    app.appendChild(box);
    var bounds = dayBounds(state.date);
    box.appendChild(h("p", { text: "Yükleniyor…" }));
    sb.from("reservations").select("*").gte("starts_at", bounds[0]).lt("starts_at", bounds[1]).order("starts_at").then(function (r) {
      if (r.error) { clear(box); banner("Rezervasyonlar okunamadı: " + r.error.message, "error"); return; }
      state.rows = r.data;
      drawDay(box);
    });
  }

  function drawDay(box) {
    clear(box);
    var dateInput = h("input", { type: "date", value: state.date, "aria-label": "Tarih", onchange: function () {
      if (dateInput.value) { state.date = dateInput.value; render(); }
    } });
    box.appendChild(h("div", { class: "a-bar" },
      h("button", { class: "btn-sm", type: "button", text: "← Önceki", onclick: function () { state.date = shiftDate(state.date, -1); render(); } }),
      dateInput,
      h("button", { class: "btn-sm", type: "button", text: "Sonraki →", onclick: function () { state.date = shiftDate(state.date, 1); render(); } }),
      h("button", { class: "btn-sm", type: "button", text: "Bugün", onclick: function () { state.date = todayIst(); render(); } })));

    var active = state.rows.filter(function (r) { return r.status === "confirmed"; });
    var guests = active.reduce(function (n, r) { return n + r.party_size; }, 0);
    box.appendChild(h("h1", { class: "a-day-title", text: fmtDay(state.date) }));
    box.appendChild(h("p", { class: "a-res__meta", text: active.length + " onaylı rezervasyon · " + guests + " misafir" }));

    box.appendChild(addForm());
    box.appendChild(loadGrid());

    box.appendChild(h("h2", { text: "Rezervasyonlar" }));
    if (state.rows.length === 0) { box.appendChild(h("p", { class: "a-empty", text: "Bu gün için rezervasyon yok." })); return; }
    box.appendChild(h("div", { class: "a-list" }, state.rows.map(resCard)));
  }

  function loadGrid() {
    var s = state.settings, oh = state.hours.filter(function (x) { return x.weekday === weekday(state.date); })[0];
    var wrap = h("div");
    if (!oh || oh.is_closed || !oh.first_seating) {
      wrap.appendChild(h("p", { class: "a-empty", text: "Bu gün normalde kapalı." }));
      return wrap;
    }
    wrap.appendChild(h("h2", { text: "Doluluk" }));
    var grid = h("div", { class: "a-load" }, h("span"), h("span", { class: "a-load__head", text: "Salon / " + s.hall_capacity }),
      h("span", { class: "a-load__head", text: "Özel oda / " + s.private_capacity }));
    for (var t = toMin(oh.first_seating); t <= toMin(oh.last_seating); t += s.slot_minutes) {
      var at = new Date(state.date + "T" + hhmm(t) + ":00+03:00").getTime(), hall = 0, priv = 0;
      state.rows.forEach(function (r) {
        if (r.status !== "confirmed") return;
        if (Date.parse(r.starts_at) <= at && at < Date.parse(r.ends_at)) { if (r.area === "private") priv += r.party_size; else hall += r.party_size; }
      });
      grid.appendChild(h("span", { text: hhmm(t) }));
      grid.appendChild(meter(hall, s.hall_capacity));
      grid.appendChild(meter(priv, s.private_capacity));
    }
    wrap.appendChild(grid);
    return wrap;
  }
  function meter(n, cap) {
    var fill = h("span", { class: "a-meter__fill" });
    fill.style.width = Math.min(100, (n / cap) * 100) + "%";
    return h("div", { class: "a-meter" + (n >= cap ? " a-meter--full" : "") }, fill, h("span", { class: "a-meter__text", text: n + " / " + cap }));
  }

  function resCard(r) {
    var actions = [];
    function act(label, payload, danger, confirmMsg) {
      return h("button", { class: "btn-sm" + (danger ? " btn-sm--danger" : ""), type: "button", text: label, onclick: function (e) {
        if (confirmMsg && !window.confirm(confirmMsg)) return;
        e.target.disabled = true;
        payload.id = r.id;
        callAdmin(payload).then(function (res) {
          if (res.body && res.body.ok) { banner(r.code + " güncellendi."); render(); }
          else { e.target.disabled = false; banner("İşlem başarısız (" + ((res.body && res.body.error) || res.status) + ").", "error"); }
        }).catch(function () { e.target.disabled = false; banner("Bağlantı hatası.", "error"); });
      } });
    }
    if (r.status === "confirmed") {
      actions.push(act("Tamamlandı", { action: "set_status", status: "completed" }));
      actions.push(act("Gelmedi", { action: "set_status", status: "no_show" }, false, r.name + " için “gelmedi” işaretlensin mi?"));
      actions.push(act("İptal et", { action: "cancel" }, true, r.code + " rezervasyonu iptal edilsin mi? Müşteriye e-posta gider."));
    } else {
      actions.push(act("Onaylıya al", { action: "set_status", status: "confirmed" }));
    }
    var meta = [AREA[r.area] || r.area, r.party_size + " kişi"];
    return h("article", { class: "a-res" + (r.status === "confirmed" ? "" : " a-res--off") },
      h("div", { class: "a-res__time", text: fmtTime(r.starts_at) }),
      h("div", null,
        h("div", null, h("span", { class: "a-res__name", text: r.name }), h("span", { class: "a-badge a-badge--" + r.status, text: STATUS[r.status] || r.status })),
        h("div", { class: "a-res__meta" }, meta.join(" · ") + " · ", h("a", { href: "tel:" + r.phone.replace(/[^\d+]/g, ""), text: r.phone }),
          r.email ? " · " : null, r.email ? h("a", { href: "mailto:" + r.email, text: r.email }) : null),
        h("div", { class: "a-res__meta", text: r.code + (r.source === "admin" ? " · elle eklendi" : "") }),
        r.note ? h("div", { class: "a-res__note", text: "“" + r.note + "”" }) : null),
      h("div", { class: "a-res__actions" }, actions));
  }

  function addForm() {
    var s = state.settings, oh = state.hours.filter(function (x) { return x.weekday === weekday(state.date); })[0];
    var times = [];
    if (oh && oh.first_seating) for (var t = toMin(oh.first_seating); t <= toMin(oh.last_seating); t += s.slot_minutes) times.push(hhmm(t));
    if (times.length === 0) for (var q = 18 * 60; q <= 22 * 60; q += s.slot_minutes) times.push(hhmm(q));

    var time = h("select", null, times.map(function (x) { return h("option", { value: x, text: x }); }));
    var party = h("input", { type: "number", min: 1, max: 60, value: 2, required: true });
    var area = h("select", null, h("option", { value: "hall", text: "Salon" }), h("option", { value: "private", text: "Özel oda" }));
    var name = h("input", { type: "text", required: true, maxlength: 100 });
    var phone = h("input", { type: "tel", required: true, maxlength: 30 });
    var email = h("input", { type: "email", maxlength: 200 });
    var note = h("textarea", { maxlength: 500 });
    var force = h("input", { type: "checkbox", id: "a-force" });
    var btn = h("button", { class: "btn-solid", type: "submit", text: "Rezervasyonu ekle" });

    var form = h("form", { onsubmit: function (e) {
      e.preventDefault();
      btn.disabled = true;
      callAdmin({ action: "create", date: state.date, time: time.value, party: +party.value, area: area.value, name: name.value, phone: phone.value,
        email: email.value, note: note.value, force: force.checked, lang: "tr" }).then(function (res) {
        btn.disabled = false;
        if (res.body && res.body.ok) { banner("Eklendi: " + res.body.code); render(); }
        else if (res.body && res.body.error === "unavailable") banner(REASONS[res.body.reason] || "Bu saat uygun değil.", "error");
        else banner("Eklenemedi (" + ((res.body && res.body.error) || res.status) + ").", "error");
      }).catch(function () { btn.disabled = false; banner("Bağlantı hatası.", "error"); });
    } },
      h("div", { class: "a-row" }, field("Saat", time, "n-time"), field("Kişi", party, "n-party"), field("Alan", area, "n-area")),
      h("div", { class: "a-row" }, field("Ad soyad", name, "n-name"), field("Telefon", phone, "n-phone"), field("E-posta (opsiyonel)", email, "n-email")),
      field("Not", note, "n-note"),
      h("div", { class: "a-check" }, force, h("label", { for: "a-force", text: "Kapasiteyi/kuralları aş (bilerek fazla ekle)" })),
      btn);
    return h("details", { class: "a-add" }, h("summary", { text: "+ Telefonla gelen rezervasyon ekle" }), form);
  }

  /* ------------------------------------------------------------ closures */
  /* ------------------------------------------------------------ chats */
  var chatTimer = null;
  function stopChatTimer() { if (chatTimer) { window.clearInterval(chatTimer); chatTimer = null; } }

  function renderChats() {
    var box = h("div"), listEl = h("div", { class: "a-list" }), thread = h("div", { class: "a-chat" });
    var msgsEl = h("div", { class: "a-chat__msgs", "aria-live": "polite" });
    var ta = h("textarea", { rows: "3", maxlength: "1000", "aria-label": "Cevap" });
    var sendB = h("button", { class: "btn-sm", type: "submit", text: "Gönder" });
    var closeB = h("button", { class: "btn-sm btn-sm--danger", type: "button", text: "Görüşmeyi kapat" });
    var titleEl = h("div", { class: "a-day-title" });
    var form = h("form", { class: "a-chat__form", onsubmit: function (e) {
      e.preventDefault();
      var body = ta.value.trim();
      if (!body || !state.chat) return;
      sendB.disabled = true;
      sb.from("chat_messages").insert({ handoff_id: state.chat, sender: "staff", body: body }).then(function (r) {
        sendB.disabled = false;
        if (r.error) { banner("Gönderilemedi.", "error"); return; }
        ta.value = ""; refresh();
      });
    } }, ta, h("div", { class: "a-chat__actions" }, sendB, closeB));
    closeB.addEventListener("click", function () {
      if (!state.chat || !window.confirm("Görüşme kapatılsın mı? Müşteri yeni mesaj yazamaz.")) return;
      sb.from("chat_handoffs").update({ status: "closed" }).eq("id", state.chat).then(function (r) {
        if (r.error) { banner("Kapatılamadı.", "error"); return; }
        state.chat = null; refresh();
      });
    });
    thread.appendChild(titleEl); thread.appendChild(msgsEl); thread.appendChild(form);
    box.appendChild(h("p", { class: "a-empty", text: "Personele devredilen sohbetler 24 saat sonra otomatik silinir." }));
    box.appendChild(h("div", { class: "a-chats" }, listEl, thread));
    app.appendChild(box);

    function stamp(iso) {
      return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(iso));
    }
    function drawList(rows) {
      clear(listEl);
      if (!rows.length) { listEl.appendChild(h("p", { class: "a-empty", text: "Açık sohbet yok." })); return; }
      rows.forEach(function (c) {
        var waiting = !c.last_staff_at || c.last_customer_at > c.last_staff_at;
        listEl.appendChild(h("button", { type: "button", class: "a-chatrow" + (c.id === state.chat ? " is-active" : ""),
          onclick: function () { state.chat = c.id; refresh(); } },
          h("span", { text: stamp(c.created_at) + " · " + c.lang.toUpperCase() }),
          waiting ? h("span", { class: "a-badge a-badge--confirmed", text: "Cevap bekliyor" }) : null));
      });
    }
    function drawThread(msgs) {
      thread.hidden = !state.chat;
      if (!state.chat) return;
      var atEnd = msgsEl.scrollTop + msgsEl.clientHeight >= msgsEl.scrollHeight - 20;
      clear(msgsEl);
      msgs.forEach(function (m) {
        msgsEl.appendChild(h("div", { class: "a-chat__msg a-chat__msg--" + m.sender },
          h("span", { class: "a-chat__who", text: (m.sender === "staff" ? "Siz" : m.sender === "bot" ? "Bot" : "Müşteri") + " · " + stamp(m.created_at) }),
          h("div", { text: m.body })));
      });
      if (atEnd) msgsEl.scrollTop = msgsEl.scrollHeight;
    }
    function refresh() {
      sb.from("chat_handoffs").select("*").eq("status", "open").order("created_at", { ascending: false }).then(function (r) {
        if (state.tab !== "chats") return;
        if (r.error) { banner("Sohbetler okunamadı.", "error"); return; }
        var rows = r.data || [];
        if (state.chat && !rows.some(function (c) { return c.id === state.chat; })) state.chat = null;
        drawList(rows);
        if (!state.chat) { drawThread([]); return; }
        var cur = rows.filter(function (c) { return c.id === state.chat; })[0];
        titleEl.textContent = stamp(cur.created_at) + " · " + cur.lang.toUpperCase();
        sb.from("chat_messages").select("*").eq("handoff_id", state.chat).order("id").then(function (m) {
          if (state.tab === "chats" && !m.error) drawThread(m.data || []);
        });
      });
    }
    refresh();
    stopChatTimer();
    chatTimer = window.setInterval(refresh, 10000);
  }

  function renderClosures() {
    var box = h("div", null, h("p", { text: "Yükleniyor…" }));
    app.appendChild(box);
    sb.from("closures").select("*").gte("date", todayIst()).order("date").then(function (r) {
      clear(box);
      if (r.error) { banner("Okunamadı: " + r.error.message, "error"); return; }
      box.appendChild(h("h1", { text: "Kapalı günler" }));
      box.appendChild(h("p", { class: "a-res__meta", text: "Pazar ve Pazartesi zaten kapalıdır (Ayarlar). Tatil ya da özel etkinlik günlerini buradan kapatın; o günler formda seçilemez." }));

      var date = h("input", { type: "date", required: true, min: todayIst() });
      var area = h("select", null, h("option", { value: "all", text: "Tüm alanlar" }), h("option", { value: "hall", text: "Yalnız salon" }), h("option", { value: "private", text: "Yalnız özel oda" }));
      var reason = h("input", { type: "text", maxlength: 200, placeholder: "örn. Özel etkinlik" });
      var btn = h("button", { class: "btn-solid", type: "submit", text: "Günü kapat" });
      box.appendChild(h("form", { class: "a-add", style: "margin-top:1rem", onsubmit: function (e) {
        e.preventDefault(); btn.disabled = true;
        sb.from("closures").insert({ date: date.value, area: area.value, reason: reason.value.trim() || null }).then(function (x) {
          btn.disabled = false;
          if (x.error) banner("Eklenemedi: " + x.error.message, "error"); else { banner("Gün kapatıldı."); render(); }
        });
      } }, h("div", { class: "a-row" }, field("Tarih", date, "c-date"), field("Alan", area, "c-area"), field("Sebep", reason, "c-reason")), btn));

      box.appendChild(h("h2", { text: "Yaklaşan kapalı günler" }));
      if (r.data.length === 0) { box.appendChild(h("p", { class: "a-empty", text: "Planlı kapalı gün yok." })); return; }
      box.appendChild(h("div", { class: "a-list" }, r.data.map(function (c) {
        return h("article", { class: "a-res", style: "grid-template-columns:1fr auto" },
          h("div", null, h("div", { class: "a-res__name", text: fmtDay(c.date) }),
            h("div", { class: "a-res__meta", text: ({ all: "Tüm alanlar", hall: "Yalnız salon", private: "Yalnız özel oda" })[c.area] + (c.reason ? " · " + c.reason : "") })),
          h("button", { class: "btn-sm btn-sm--danger", type: "button", text: "Kaldır", onclick: function () {
            sb.from("closures").delete().eq("id", c.id).then(function (x) {
              if (x.error) banner("Silinemedi: " + x.error.message, "error"); else render();
            });
          } }));
      })));
    });
  }

  /* ------------------------------------------------------------ settings */
  function renderSettings() {
    var s = state.settings;
    function num(key, label, min) {
      return field(label, h("input", { type: "number", min: min, value: s[key], required: true, "data-key": key }), "s-" + key);
    }
    var email = h("input", { type: "email", value: s.restaurant_email || "", maxlength: 200 });
    var btn = h("button", { class: "btn-solid", type: "submit", text: "Kaydet" });

    var hourRows = [1, 2, 3, 4, 5, 6, 0].map(function (wd) {
      var oh = state.hours.filter(function (x) { return x.weekday === wd; })[0] || { is_closed: true };
      var closed = h("input", { type: "checkbox", checked: oh.is_closed, "aria-label": WEEKDAYS[wd] + " kapalı" });
      var first = h("input", { type: "time", value: oh.first_seating ? oh.first_seating.slice(0, 5) : "18:00", "aria-label": WEEKDAYS[wd] + " ilk oturuş" });
      var last = h("input", { type: "time", value: oh.last_seating ? oh.last_seating.slice(0, 5) : "22:00", "aria-label": WEEKDAYS[wd] + " son oturuş" });
      function sync() { first.disabled = last.disabled = closed.checked; }
      closed.addEventListener("change", sync); sync();
      return { wd: wd, closed: closed, first: first, last: last,
        tr: h("tr", null, h("th", { scope: "row", text: WEEKDAYS[wd] }), h("td", null, closed), h("td", null, first), h("td", null, last)) };
    });

    var form = h("form", { onsubmit: function (e) {
      e.preventDefault(); btn.disabled = true;
      var patch = { restaurant_email: email.value.trim() || null };
      Array.prototype.forEach.call(form.querySelectorAll("[data-key]"), function (i) { patch[i.getAttribute("data-key")] = +i.value; });
      for (var i = 0; i < hourRows.length; i++) {
        var hr = hourRows[i];
        if (!hr.closed.checked && (!hr.first.value || !hr.last.value || hr.first.value > hr.last.value)) {
          btn.disabled = false; banner(WEEKDAYS[hr.wd] + ": ilk oturuş son oturuştan sonra olamaz.", "error"); return;
        }
      }
      var jobs = [sb.from("settings").update(patch).eq("id", 1).select().single()];
      hourRows.forEach(function (hr) {
        jobs.push(sb.from("opening_hours").update({
          is_closed: hr.closed.checked,
          first_seating: hr.closed.checked ? null : hr.first.value,
          last_seating: hr.closed.checked ? null : hr.last.value
        }).eq("weekday", hr.wd));
      });
      Promise.all(jobs).then(function (res) {
        btn.disabled = false;
        var bad = res.filter(function (x) { return x.error; })[0];
        if (bad) { banner("Kaydedilemedi: " + bad.error.message, "error"); return; }
        state.settings = res[0].data;
        sb.from("opening_hours").select("*").order("weekday").then(function (o) { if (o.data) state.hours = o.data; });
        banner("Ayarlar kaydedildi.");
      });
    } },
      h("h1", { text: "Ayarlar" }),
      h("h2", { text: "Kapasite ve kurallar" }),
      h("div", { class: "a-row" }, num("hall_capacity", "Salon kapasitesi (kişi)", 1), num("private_capacity", "Özel oda kapasitesi (kişi)", 1), num("seating_minutes", "Oturma süresi (dk)", 30)),
      h("div", { class: "a-row" }, num("slot_minutes", "Slot aralığı (dk)", 15), num("min_lead_minutes", "En az önceden (dk)", 0), num("horizon_days", "En fazla ileri (gün)", 1)),
      h("div", { class: "a-row" }, num("max_party_hall", "Salonda en çok kişi", 1), num("max_party_private", "Özel odada en çok kişi", 1)),
      field("Restoran e-postası (yeni rezervasyon bildirimi)", email, "s-email"),
      h("h2", { text: "Çalışma saatleri" }),
      h("table", { class: "a-hours" },
        h("thead", null, h("tr", null, h("th", { text: "Gün" }), h("th", { text: "Kapalı" }), h("th", { text: "İlk oturuş" }), h("th", { text: "Son oturuş" }))),
        h("tbody", null, hourRows.map(function (r) { return r.tr; }))),
      h("p", { class: "a-res__meta", style: "margin:1rem 0", text: "Değişiklikler yalnızca yeni rezervasyonları etkiler; mevcut rezervasyonlar olduğu gibi kalır." }),
      btn);
    app.appendChild(form);
  }

  sb.auth.onAuthStateChange(function (event) { if (event === "SIGNED_OUT") showLogin(); });
  start();
})();
