/* İkincil sayfalar (iptal.html, kvkk.html) için dil desteği: js/i18n.js sözlüğünü uygular,
   TR/EN düğmesini yönetir, seçimi ana sayfayla paylaşır (aynı localStorage anahtarı). */
(function () {
  "use strict";
  var dict = window.KUMO_I18N || {};
  var KEY = "kumo-lang";

  function stored() { try { return window.localStorage.getItem(KEY); } catch (e) { return null; } }
  function store(l) { try { window.localStorage.setItem(KEY, l); } catch (e) { /* gizli sekme */ } }
  function lang() { return document.documentElement.lang === "en" ? "en" : "tr"; }
  function t(key) { var e = dict[key]; return e && e[lang()] != null ? e[lang()] : key; }

  function apply(l) {
    document.documentElement.lang = l;
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var e = dict[el.getAttribute("data-i18n")];
      if (e && e[l] != null) el.innerHTML = e[l];
    });
    document.querySelectorAll(".lang-switch button").forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-lang") === l ? "true" : "false");
    });
    document.dispatchEvent(new Event("kumo:lang"));
  }

  var q = new URLSearchParams(window.location.search).get("lang");
  var initial = q === "en" || q === "tr" ? q : (stored() === "en" ? "en" : "tr");

  document.querySelectorAll(".lang-switch button").forEach(function (b) {
    b.addEventListener("click", function () { var l = b.getAttribute("data-lang"); apply(l); store(l); });
  });

  window.KumoPage = { t: t, lang: lang };
  apply(initial);
})();
