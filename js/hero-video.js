/* ---------------------------------------------------------------------
   Hero video — a still first frame until the visitor's first scroll,
   then it plays and loops for good. The page scrolls normally (hero is
   one screen tall); scrolling never controls the video.

   - The first frame comes straight from the <video> (no poster image).
   - iOS Safari won't paint a muted video that was never play()ed, so on
     mount we "prime" it (play, then pause) — see prime() below.
   - Under prefers-reduced-motion it never plays: one still frame.
   --------------------------------------------------------------------- */
(function () {
  "use strict";

  var section = document.querySelector(".hero");
  var video = section && section.querySelector(".hero__video");
  if (!section || !video) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var phone = window.matchMedia("(max-width: 768px)");

  var started = false;

  /* ---------- source: phone gets the portrait crop ---------- */
  var desktopSrc = video.getAttribute("data-src");
  var mobileSrc = video.getAttribute("data-src-mobile");
  var triedFallback = false;
  video.muted = true;               // attribute alone isn't always honoured on iOS
  video.loop = true;
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  video.src = (phone.matches && mobileSrc) ? mobileSrc : desktopSrc;

  /* ---------- iOS priming: play once, pause at once ---------- */
  function prime() {
    var p = video.play();
    var settle = function () {
      if (started && !reduceMotion) return;   // visitor already scrolled: keep playing
      video.pause();
      video.currentTime = 0;
    };
    if (p && p.then) p.then(settle).catch(function () {});
    else settle();
  }

  /* ---------- ready handling: check readyState BEFORE listening ---------- */
  function onLoadedMetadata() { prime(); }
  function onLoadedData() { section.classList.add("is-ready"); }
  function onError() {
    if (!triedFallback && mobileSrc && video.getAttribute("src") === mobileSrc && desktopSrc) {
      triedFallback = true;
      video.src = desktopSrc;
      return;
    }
    section.classList.add("is-ready"); // give up gracefully: the dark ground stays
  }

  if (video.readyState >= 1) onLoadedMetadata();
  else video.addEventListener("loadedmetadata", onLoadedMetadata, { once: true });

  if (video.readyState >= 2) onLoadedData();
  else video.addEventListener("loadeddata", onLoadedData, { once: true });

  video.addEventListener("error", onError);

  if (reduceMotion) return; // still frame only

  /* ---------- first scroll starts it, for good ---------- */
  var events = ["scroll", "wheel", "touchmove", "keydown"];
  function start(evt) {
    if (evt && evt.type === "keydown" &&
        [" ", "PageDown", "ArrowDown", "End"].indexOf(evt.key) === -1) return;
    if (started) return;
    started = true;
    events.forEach(function (name) { window.removeEventListener(name, start); });
    section.classList.add("is-playing");
    var p = video.play();
    if (p && p.catch) p.catch(function () { started = false; });
    watchVisibility();
  }

  /* Browsers pause a muted video that scrolls out of view and don't
     always resume it. Pause it ourselves off-screen (saves CPU/battery)
     and start it again whenever the hero is visible. */
  function watchVisibility() {
    if (!("IntersectionObserver" in window)) return;
    new IntersectionObserver(function (entries) {
      var visible = entries[entries.length - 1].isIntersecting;
      if (visible && video.paused) {
        var p = video.play();
        if (p && p.catch) p.catch(function () {});
      } else if (!visible && !video.paused) {
        video.pause();
      }
    }, { threshold: 0.05 }).observe(section);
  }
  events.forEach(function (name) { window.addEventListener(name, start, { passive: true }); });
  if (window.scrollY > 0) start(); // reloaded mid-page
})();
