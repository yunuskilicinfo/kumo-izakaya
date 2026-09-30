/* ==========================================================================
   KUMO IZAKAYA — rezervasyon formu
   Tarih / kişi sayısı / alan değişince canlı doluluğu getirir (Edge Function
   "booking" → /availability), saat listesini buna göre doldurur ve gönderimde
   /reserve'e yollar. Doğrulama, hata özeti ve dil değişimi davranışı eski
   formla aynı desendedir. API adresi js/config.js'dedir.
   ========================================================================== */
(function () {
  "use strict";

  var cfg = window.KUMO_CONFIG || {};
  var form = document.getElementById("reserve-form");
  if (!form || !cfg.apiBase) return;

  var dict = window.KUMO_I18N || {};
  function lang() { return document.documentElement.lang === "en" ? "en" : "tr"; }
  function t(key) { var e = dict[key]; return e && e[lang()] != null ? e[lang()] : key; }
  function $(id) { return document.getElementById(id); }

  var dateField = $("r-date"), partySel = $("r-party"), privateBox = $("r-private"), timeSel = $("r-time");
  var timeHint = $("time-hint"), partyHint = $("party-hint"), submitBtn = $("reserve-submit"), serverErr = $("form-server-error");
  var errorSummary = $("form-error-summary"), errorList = $("form-error-list");
  var confirmPanel = $("reserve-confirm"), confirmHeading = $("reserve-confirm-h");
  var confirmDetails = $("reserve-confirm-details"), confirmCode = $("reserve-confirm-code");
  var turnstileBox = $("turnstile-box");

  var state = {
    data: null, seq: 0, hintKey: null, partyMode: null, autoPrivate: false,
    serverErrKey: null, submitting: false, booked: null, lastInvalid: [],
    token: "", widgetId: null, tsLoading: false
  };

  /* ---- date bounds: today … +60 days (server enforces the same) ---- */
  function pad(n) { return String(n).padStart(2, "0"); }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  var now = new Date();
  dateField.min = iso(now);
  var maxDate = new Date(now); maxDate.setDate(maxDate.getDate() + 60);
  dateField.max = iso(maxDate);

  /* ---- small state helpers ---- */
  function partyNum() { var n = parseInt(partySel.value, 10); return isNaN(n) ? 0 : n; }
  function area() { return privateBox.checked ? "private" : "hall"; }
  function setTimeHint(key) { state.hintKey = key; timeHint.textContent = key ? t(key) : ""; }
  function setServerError(key) {
    state.serverErrKey = key;
    serverErr.hidden = !key;
    serverErr.textContent = key ? t(key) : "";
  }

  /* ---- time list ---- */
  function resetTime() {
    state.data = null;
    timeSel.innerHTML = "";
    var ph = new Option(t("form-time-first"), "", true, true);
    ph.disabled = true;
    timeSel.appendChild(ph);
    timeSel.disabled = true;
    setTimeHint(null);
  }

  function renderSlots(prev) {
    var data = state.data;
    timeSel.innerHTML = "";
    var ph = new Option(t("form-select"), "", true, true);
    ph.disabled = true;
    timeSel.appendChild(ph);
    if (!data) { timeSel.disabled = true; return; }
    if (data.closed) { timeSel.disabled = true; setTimeHint("form-time-closed"); return; }

    var anyOpen = false;
    data.slots.forEach(function (s) {
      // "lead" (too soon) / "horizon" (too far) slots are simply not offered
      if (s.reason !== "ok" && s.reason !== "full") return;
      var o = new Option(s.available ? s.time : s.time + " — " + t("form-time-full"), s.time);
      if (!s.available) o.disabled = true; else anyOpen = true;
      timeSel.appendChild(o);
    });
    timeSel.disabled = !anyOpen;
    setTimeHint(anyOpen ? null : "form-time-none");
    if (anyOpen && prev) {
      for (var i = 0; i < timeSel.options.length; i++) {
        if (timeSel.options[i].value === prev && !timeSel.options[i].disabled) { timeSel.value = prev; break; }
      }
    }
  }

  function refreshSlots() {
    var party = partyNum(), date = dateField.value;
    if (!date || !party) { resetTime(); return; }
    var seq = ++state.seq, prev = timeSel.value;
    timeSel.disabled = true;
    setTimeHint("form-time-loading");
    fetch(cfg.apiBase + "/availability?date=" + encodeURIComponent(date) + "&party=" + party + "&area=" + area())
      .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
      .then(function (data) { if (seq !== state.seq) return; state.data = data; renderSlots(prev); })
      .catch(function () {
        if (seq !== state.seq) return;
        state.data = null;
        renderSlots("");
        setTimeHint("form-time-failed");
      });
  }

  /* ---- party size → private room rules ---- */
  function renderPartyHint() {
    if (state.partyMode === "call") {
      partyHint.innerHTML = t("form-party-call") + ' <a class="text-link" href="tel:+902120000000">+90 212 000 00 00</a>';
    } else if (state.partyMode === "private") {
      partyHint.textContent = t("form-party-private");
    }
    partyHint.hidden = !state.partyMode;
  }

  function syncParty() {
    var n = partyNum();
    state.partyMode = partySel.value === "more" ? "call" : (n >= 7 ? "private" : null);
    renderPartyHint();
    if (n >= 7) {
      if (!privateBox.checked) state.autoPrivate = true;
      privateBox.checked = true;
      privateBox.disabled = true;
    } else {
      privateBox.disabled = false;
      if (state.autoPrivate) { privateBox.checked = false; state.autoPrivate = false; }
    }
    submitBtn.disabled = state.partyMode === "call";
    refreshSlots();
  }

  dateField.addEventListener("change", refreshSlots);
  partySel.addEventListener("change", syncParty);
  privateBox.addEventListener("change", function () { state.autoPrivate = false; refreshSlots(); });

  /* ---- validation (same pattern as before) ---- */
  function fieldWrap(input) { return input.closest(".field"); }
  function isValid(input) {
    // a disabled <select> is skipped by checkValidity(), so check the time list by hand
    if (input === timeSel) return !!timeSel.value;
    if (input.id === "r-phone") {
      var digits = input.value.replace(/\D/g, "").length;
      return digits >= 7 && digits <= 15;
    }
    return input.checkValidity();
  }
  function validateField(input) {
    var wrap = fieldWrap(input);
    if (!wrap) return true;
    var valid = isValid(input);
    wrap.classList.toggle("field--invalid", !valid);
    return valid;
  }

  function renderErrorSummary(invalidFields) {
    errorList.innerHTML = "";
    invalidFields.forEach(function (input) {
      var label = fieldWrap(input).querySelector("label");
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "#" + input.id;
      var named = label && (label.querySelector("[data-i18n]") || label);
      a.textContent = named ? named.textContent : input.name;
      a.addEventListener("click", function (e) { e.preventDefault(); input.focus(); });
      li.appendChild(a);
      errorList.appendChild(li);
    });
  }

  var requiredFields = Array.prototype.slice.call(form.querySelectorAll("[required]"));
  requiredFields.forEach(function (input) {
    input.addEventListener("blur", function () { validateField(input); });
    var revalidate = function () { if (fieldWrap(input).classList.contains("field--invalid")) validateField(input); };
    input.addEventListener("input", revalidate);
    input.addEventListener("change", revalidate);
  });

  /* ---- Cloudflare Turnstile (loaded lazily, only once the dialog opens) ---- */
  function loadTurnstile() {
    if (!cfg.turnstileSiteKey || state.tsLoading) return;
    state.tsLoading = true;
    var s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true; s.defer = true;
    s.onload = function () {
      if (!window.turnstile) return;
      state.widgetId = window.turnstile.render(turnstileBox, {
        sitekey: cfg.turnstileSiteKey, theme: "dark", language: lang(),
        callback: function (tk) { state.token = tk; },
        "expired-callback": function () { state.token = ""; },
        "error-callback": function () { state.token = ""; }
      });
    };
    document.head.appendChild(s);
  }
  function resetTurnstile() {
    state.token = "";
    if (window.turnstile && state.widgetId !== null) window.turnstile.reset(state.widgetId);
  }

  /* ---- confirm panel ---- */
  function renderConfirm() {
    var b = state.booked;
    if (!b) return;
    var day = new Intl.DateTimeFormat(lang() === "en" ? "en-GB" : "tr-TR", { weekday: "long", day: "numeric", month: "long" })
      .format(new Date(b.date + "T12:00:00"));
    confirmDetails.textContent = day + ", " + b.time + " · " + t("form-guests-" + b.party);
    confirmCode.textContent = b.code;
  }

  /* ---- submit ---- */
  function fail(res) {
    var body = res.body || {};
    if (res.status === 409 && body.error === "unavailable") {
      if (body.reason === "duplicate") { setServerError("err-duplicate"); }
      else { setServerError("err-slot-taken"); refreshSlots(); }
    } else if (res.status === 429) setServerError("err-rate");
    else if (res.status === 403) setServerError("err-captcha");
    else setServerError("err-server");
    resetTurnstile();
  }

  form.addEventListener("submit", function (evt) {
    evt.preventDefault();
    if (state.submitting || partySel.value === "more") return;
    setServerError(null);

    var invalid = requiredFields.filter(function (input) { return !validateField(input); });
    state.lastInvalid = invalid;
    if (invalid.length > 0) {
      renderErrorSummary(invalid);
      errorSummary.setAttribute("data-show", "true");
      errorSummary.focus();
      return;
    }
    errorSummary.setAttribute("data-show", "false");

    var payload = {
      date: dateField.value, time: timeSel.value, party: partyNum(), area: area(),
      name: $("r-name").value.trim(), phone: $("r-phone").value.trim(), email: $("r-email").value.trim(),
      note: $("r-note").value.trim(), lang: lang(), consent: $("r-consent").checked, turnstile: state.token
    };

    state.submitting = true;
    submitBtn.disabled = true;
    submitBtn.textContent = t("form-submitting");

    fetch(cfg.apiBase + "/reserve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (body) { return { status: r.status, body: body }; });
      })
      .then(function (res) {
        if (res.body && res.body.ok) {
          state.booked = { date: payload.date, time: payload.time, party: payload.party, code: res.body.code };
          renderConfirm();
          form.hidden = true;
          confirmPanel.hidden = false;
          confirmHeading.focus();
        } else {
          fail(res);
        }
      })
      .catch(function () { setServerError("err-network"); resetTurnstile(); })
      .then(function () {
        state.submitting = false;
        submitBtn.textContent = t("form-submit");
        submitBtn.disabled = state.partyMode === "call";
      });
  });

  /* ---- dialog lifecycle + language ---- */
  document.addEventListener("kumo:reserve-open", function () {
    loadTurnstile();
    if (state.booked) {
      // reopening after a finished booking: start from a clean form
      state.booked = null;
      form.reset();
      requiredFields.forEach(function (i) { var w = fieldWrap(i); if (w) w.classList.remove("field--invalid"); });
      errorSummary.setAttribute("data-show", "false");
      setServerError(null);
      state.partyMode = null; state.autoPrivate = false;
      partyHint.hidden = true;
      privateBox.disabled = false;
      submitBtn.disabled = false;
      resetTime();
      resetTurnstile();
    } else if (dateField.value && partyNum()) {
      refreshSlots(); // availability may have changed since the dialog was last open
    }
  });

  window.KumoReserve = {
    onLangChange: function () {
      renderPartyHint();
      if (state.data) renderSlots(timeSel.value);
      else if (!dateField.value || !partyNum()) resetTime();
      setTimeHint(state.hintKey);
      setServerError(state.serverErrKey);
      renderConfirm();
      if (state.submitting) submitBtn.textContent = t("form-submitting");
      if (errorSummary.getAttribute("data-show") === "true" && state.lastInvalid.length > 0) renderErrorSummary(state.lastInvalid);
    }
  };

  resetTime();
})();
