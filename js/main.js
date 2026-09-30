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
     Lazy background photos — see css/base.css [data-lazy-bg] rule.
     Reveals each off-screen photo (menu's inactive dish shots, the venue
     gallery, the chef portrait) shortly before it scrolls into view,
     instead of loading all photography on first paint.
     ----------------------------------------------------------------- */
  var lazyBgEls = Array.prototype.slice.call(document.querySelectorAll("[data-lazy-bg]"));
  if (lazyBgEls.length > 0 && "IntersectionObserver" in window) {
    var lazyBgObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("bg-in");
            lazyBgObserver.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "400px 0px" }
    );
    lazyBgEls.forEach(function (el) { lazyBgObserver.observe(el); });
  } else {
    lazyBgEls.forEach(function (el) { el.classList.add("bg-in"); });
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
    if (open) {
      var firstLink = topbarNav.querySelector("a, button");
      if (firstLink) firstLink.focus();
    }
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

    // On the phone pill-scroller (see css/layout.css), keep the active
    // pill centered in view — including when Home/End/arrow keys jump
    // straight to a tab that's currently scrolled off-screen.
    if (window.innerWidth <= 640) {
      tab.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        inline: "center",
        block: "nearest"
      });
    }
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
    document.querySelectorAll("[data-i18n-title]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-title");
      var entry = dict[key];
      if (entry && entry[lang] != null) el.setAttribute("title", entry[lang]);
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
      if (window.KumoReserve) window.KumoReserve.onLangChange();
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
    document.dispatchEvent(new Event("kumo:reserve-open"));
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
})();
