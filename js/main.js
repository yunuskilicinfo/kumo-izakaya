(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* -----------------------------------------------------------------
     Fonts: hold the wordmark hidden until the display face is ready.
     ----------------------------------------------------------------- */
  function markFontsLoaded() {
    document.documentElement.classList.add("fonts-loaded");
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(markFontsLoaded);
  }
  window.setTimeout(markFontsLoaded, 1200); // failsafe

  /* -----------------------------------------------------------------
     Scroll reveal (Zuma-style entrance). Elements only get the hidden
     "pre" state here, once we know motion isn't reduced — a no-JS or
     reduced-motion visitor just sees the finished page, never a section
     stuck invisible because an observer never ran.
     ----------------------------------------------------------------- */
  if (!reduceMotion && "IntersectionObserver" in window) {
    var revealEls = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
    revealEls.forEach(function (el) { el.classList.add("pre"); });

    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.remove("pre");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  }

  /* -----------------------------------------------------------------
     Topbar: flip contrast to match whichever section sits behind it.
     ----------------------------------------------------------------- */
  var topbar = document.getElementById("topbar");
  var grounds = Array.prototype.slice.call(document.querySelectorAll("[data-ground]"));

  function updateTopbarContrast() {
    if (!topbar || grounds.length === 0) return;
    var navH = topbar.getBoundingClientRect().height || 68;
    var probeY = navH / 2;
    var current = null;

    for (var i = 0; i < grounds.length; i++) {
      var rect = grounds[i].getBoundingClientRect();
      if (rect.top <= probeY && rect.bottom > probeY) {
        current = grounds[i];
        break;
      }
    }
    if (!current) return;
    var isLight = current.getAttribute("data-ground") === "light";
    topbar.setAttribute("data-on-light", isLight ? "true" : "false");
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      updateTopbarContrast();
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  updateTopbarContrast();

  /* -----------------------------------------------------------------
     Mobile nav toggle
     ----------------------------------------------------------------- */
  var navToggle = document.getElementById("nav-toggle");
  var topbarNav = document.getElementById("topbar-nav");

  function setNavOpen(open) {
    if (!navToggle || !topbarNav) return;
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    topbarNav.setAttribute("data-open", open ? "true" : "false");
    document.documentElement.classList.toggle("nav-open", open);
    document.documentElement.classList.toggle("is-locked", open);
  }

  if (navToggle && topbarNav) {
    navToggle.addEventListener("click", function () {
      var isOpen = navToggle.getAttribute("aria-expanded") === "true";
      setNavOpen(!isOpen);
    });
    topbarNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () { setNavOpen(false); });
    });
    document.addEventListener("keydown", function (evt) {
      if (evt.key === "Escape" && navToggle.getAttribute("aria-expanded") === "true") {
        setNavOpen(false);
        navToggle.focus();
      }
    });
  }

  /* -----------------------------------------------------------------
     Menu tabs — vertical tablist, roving tabindex, arrow/home/end nav,
     photo crossfade tied to the active category.
     ----------------------------------------------------------------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".menu-tab"));
  var panels = Array.prototype.slice.call(document.querySelectorAll(".menu-panel"));
  var photos = Array.prototype.slice.call(document.querySelectorAll(".menu-photo__img"));

  function activateTab(tab, moveFocus) {
    tabs.forEach(function (t) {
      var selected = t === tab;
      t.setAttribute("aria-selected", selected ? "true" : "false");
      t.tabIndex = selected ? 0 : -1;
    });
    panels.forEach(function (p) {
      var match = p.id === tab.getAttribute("aria-controls");
      if (match) {
        p.hidden = false;
        p.removeAttribute("data-active");
        // force reflow so the enter animation replays on repeated selection
        void p.offsetWidth;
        p.setAttribute("data-active", "");
      } else {
        p.hidden = true;
        p.removeAttribute("data-active");
      }
    });
    var key = tab.id.replace("tab-", "");
    photos.forEach(function (img) {
      var active = img.getAttribute("data-photo") === key;
      img.toggleAttribute("data-active", active);
      // Only the visible photo should be announced/crawled — the other four
      // are stacked underneath at opacity 0, not actually shown.
      img.setAttribute("aria-hidden", active ? "false" : "true");
    });
    if (moveFocus) tab.focus();
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () { activateTab(tab, false); });
    tab.addEventListener("keydown", function (evt) {
      var targetIndex = null;
      if (evt.key === "ArrowDown" || evt.key === "ArrowRight") targetIndex = (i + 1) % tabs.length;
      else if (evt.key === "ArrowUp" || evt.key === "ArrowLeft") targetIndex = (i - 1 + tabs.length) % tabs.length;
      else if (evt.key === "Home") targetIndex = 0;
      else if (evt.key === "End") targetIndex = tabs.length - 1;
      if (targetIndex !== null) {
        evt.preventDefault();
        activateTab(tabs[targetIndex], true);
      }
    });
  });

  /* -----------------------------------------------------------------
     Language switch — TR default, EN via toggle or ?lang=en. Applies
     window.KUMO_I18N (js/i18n.js) to every data-i18n[-aria-label|-content]
     element, updates <html lang>, and remembers the choice.
     ----------------------------------------------------------------- */
  var dict = window.KUMO_I18N || {};
  var LANG_KEY = "kumo-lang";

  function getStoredLang() {
    try { return window.localStorage.getItem(LANG_KEY); } catch (e) { return null; }
  }
  function storeLang(lang) {
    try { window.localStorage.setItem(LANG_KEY, lang); } catch (e) { /* private mode: ignore */ }
  }

  function applyLang(lang) {
    document.documentElement.lang = lang;

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      var entry = dict[key];
      if (entry && entry[lang] != null) el.innerHTML = entry[lang];
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-aria-label");
      var entry = dict[key];
      if (entry && entry[lang] != null) el.setAttribute("aria-label", entry[lang]);
    });
    document.querySelectorAll("[data-i18n-content]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-content");
      var entry = dict[key];
      if (entry && entry[lang] != null) el.setAttribute("content", entry[lang]);
    });

    document.querySelectorAll(".lang-switch button").forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-lang") === lang ? "true" : "false");
    });

    var toggleLabel = lang === "tr" ? "Menüyü aç" : "Open menu";
    if (navToggle) navToggle.setAttribute("aria-label", toggleLabel);
  }

  function resolveInitialLang() {
    var params = new URLSearchParams(window.location.search);
    var fromQuery = params.get("lang");
    if (fromQuery === "tr" || fromQuery === "en") return fromQuery;
    var stored = getStoredLang();
    if (stored === "tr" || stored === "en") return stored;
    return "tr";
  }

  document.querySelectorAll(".lang-switch button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var lang = btn.getAttribute("data-lang");
      applyLang(lang);
      storeLang(lang);
      refreshErrorSummary();
    });
  });

  applyLang(resolveInitialLang());

  /* -----------------------------------------------------------------
     Reservation dialog — opened from any [data-open-reserve] trigger
     (nav pill, the on-page CTA card) so the form never sits as a long
     block in the page flow.
     ----------------------------------------------------------------- */
  var dialog = document.getElementById("reserve-dialog");
  var dialogOpeners = document.querySelectorAll("[data-open-reserve]");
  var dialogClosers = document.querySelectorAll("[data-close-reserve]");
  var lastFocused = null;

  function openReserveDialog() {
    if (!dialog || typeof dialog.showModal !== "function") return;
    lastFocused = document.activeElement;
    var formEl = document.getElementById("reserve-form");
    var confirmEl = document.getElementById("reserve-confirm");
    if (formEl) formEl.hidden = false;
    if (confirmEl) confirmEl.hidden = true;
    document.documentElement.classList.add("is-locked");
    dialog.showModal();
    var firstField = dialog.querySelector("input, select");
    if (firstField) firstField.focus();
  }

  function closeReserveDialog() {
    if (dialog) dialog.close();
  }

  dialogOpeners.forEach(function (btn) { btn.addEventListener("click", openReserveDialog); });
  dialogClosers.forEach(function (btn) { btn.addEventListener("click", closeReserveDialog); });

  if (dialog) {
    dialog.addEventListener("close", function () {
      document.documentElement.classList.remove("is-locked");
      if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
    });
    dialog.addEventListener("click", function (evt) {
      var box = dialog.querySelector(".reserve-dialog__inner");
      var rect = box.getBoundingClientRect();
      var inside = evt.clientX >= rect.left && evt.clientX <= rect.right && evt.clientY >= rect.top && evt.clientY <= rect.bottom;
      if (!inside) closeReserveDialog();
    });
  }

  /* -----------------------------------------------------------------
     Reservation form. Blur validation, a focusable error summary on
     failed submit, then a confirm panel.
     ----------------------------------------------------------------- */
  var form = document.getElementById("reserve-form");
  var errorSummary = document.getElementById("form-error-summary");
  var errorList = document.getElementById("form-error-list");
  var confirmPanel = document.getElementById("reserve-confirm");
  var confirmHeading = document.getElementById("reserve-confirm-h");
  var confirmDetails = document.getElementById("reserve-confirm-details");

  var dateField = document.getElementById("r-date");
  if (dateField) {
    var today = new Date();
    var yyyy = today.getFullYear();
    var mm = String(today.getMonth() + 1).padStart(2, "0");
    var dd = String(today.getDate()).padStart(2, "0");
    dateField.min = yyyy + "-" + mm + "-" + dd;
  }

  function fieldWrap(input) {
    return input.closest(".field");
  }

  function validateField(input) {
    var wrap = fieldWrap(input);
    if (!wrap) return true;
    var valid = input.checkValidity();
    wrap.classList.toggle("field--invalid", !valid);
    return valid;
  }

  var lastInvalidFields = [];

  function renderErrorSummary(invalidFields) {
    errorList.innerHTML = "";
    invalidFields.forEach(function (input) {
      var wrap = fieldWrap(input);
      var label = wrap.querySelector("label");
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "#" + input.id;
      a.textContent = label ? label.textContent : input.name;
      a.addEventListener("click", function (e) {
        e.preventDefault();
        input.focus();
      });
      li.appendChild(a);
      errorList.appendChild(li);
    });
  }

  // Re-run after a language switch: the labels just changed, and a summary
  // built before that switch would otherwise be left showing stale text.
  function refreshErrorSummary() {
    if (errorSummary.getAttribute("data-show") === "true" && lastInvalidFields.length > 0) {
      renderErrorSummary(lastInvalidFields);
    }
  }

  if (form) {
    var requiredFields = Array.prototype.slice.call(form.querySelectorAll("[required]"));

    requiredFields.forEach(function (input) {
      input.addEventListener("blur", function () { validateField(input); });
      input.addEventListener("input", function () {
        if (fieldWrap(input).classList.contains("field--invalid")) validateField(input);
      });
    });

    form.addEventListener("submit", function (evt) {
      evt.preventDefault();

      var invalidFields = requiredFields.filter(function (input) { return !validateField(input); });
      lastInvalidFields = invalidFields;

      if (invalidFields.length > 0) {
        renderErrorSummary(invalidFields);
        errorSummary.setAttribute("data-show", "true");
        errorSummary.focus();
        return;
      }

      errorSummary.setAttribute("data-show", "false");

      var lang = document.documentElement.lang === "en" ? "en" : "tr";
      var party = document.getElementById("r-party").value;
      var date = dateField.value;
      var time = document.getElementById("r-time").value;
      var joiner = lang === "en" ? " on " + date + " at " + time : date + " tarihinde, " + time + " için " + party.toLowerCase();
      confirmDetails.textContent = lang === "en" ? party + joiner : joiner;

      form.hidden = true;
      confirmPanel.hidden = false;
      confirmHeading.focus();
    });
  }
})();
