/* ==========================================================================
   KUMO IZAKAYA — üye oturumu (Supabase Auth)
   supabase-js yalnızca gerektiğinde yüklenir: tarayıcıda kayıtlı bir oturum
   varsa, Google dönüşünde (?code=…) ya da kullanıcı giriş yapmak istediğinde.
   Misafirin ana sayfası bu yüzden ağırlaşmaz.
   Kullanım: KumoAuth.session() · KumoAuth.api(path, opts) · KumoAuth.signInGoogle()
             KumoAuth.sendCode(email) · KumoAuth.verifyCode(email, code) · KumoAuth.signOut()
   ========================================================================== */
(function () {
  "use strict";

  var cfg = window.KUMO_CONFIG || {};
  var SDK = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
  var ref = (cfg.supabaseUrl || "").replace(/^https?:\/\//, "").split(".")[0];
  var KEY = "sb-" + ref + "-auth-token";
  var clientP = null;

  function stored() {
    try { return !!window.localStorage.getItem(KEY); } catch (e) { return false; }
  }
  function returning() { return /[?&](code|error)=/.test(window.location.search); }

  function client() {
    if (clientP) return clientP;
    clientP = new Promise(function (resolve, reject) {
      if (window.supabase) { resolve(); return; }
      var s = document.createElement("script");
      s.src = SDK; s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error("supabase-js")); };
      document.head.appendChild(s);
    }).then(function () {
      return window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
        auth: { flowType: "pkce", detectSessionInUrl: true, persistSession: true, autoRefreshToken: true }
      });
    });
    clientP.catch(function () { clientP = null; });
    return clientP;
  }

  // Oturum yoksa (ve Google'dan dönmüyorsak) SDK'yı hiç indirmeden null döner.
  function session() {
    if (!stored() && !returning()) return Promise.resolve(null);
    return client()
      .then(function (c) { return c.auth.getSession(); })
      .then(function (r) { return (r.data && r.data.session) || null; })
      .catch(function () { return null; });
  }

  // Edge Function "booking" çağrısı; oturum varsa Authorization eklenir.
  // Döner: { status, body }
  function api(path, opts) {
    opts = opts || {};
    return session().then(function (s) {
      var headers = { "Content-Type": "application/json" };
      if (s) headers.Authorization = "Bearer " + s.access_token;
      return fetch(cfg.apiBase + "/" + path, {
        method: opts.method || (opts.body ? "POST" : "GET"),
        headers: headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined
      });
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (b) { return { status: res.status, body: b }; });
    });
  }

  function accountUrl() {
    return new URL(cfg.accountPath || "hesap.html", window.location.href).href.split("?")[0].split("#")[0];
  }

  function signInGoogle() {
    return client().then(function (c) {
      return c.auth.signInWithOAuth({ provider: "google", options: { redirectTo: accountUrl() } });
    });
  }
  function sendCode(email) {
    return client().then(function (c) {
      return c.auth.signInWithOtp({ email: email, options: { shouldCreateUser: true, emailRedirectTo: accountUrl() } });
    });
  }
  function verifyCode(email, code) {
    return client().then(function (c) { return c.auth.verifyOtp({ email: email, token: code, type: "email" }); });
  }
  function signOut() {
    return client().then(function (c) { return c.auth.signOut(); }).catch(function () {
      try { window.localStorage.removeItem(KEY); } catch (e) { /* yok say */ }
    });
  }

  window.KumoAuth = {
    session: session, api: api, client: client,
    signInGoogle: signInGoogle, sendCode: sendCode, verifyCode: verifyCode, signOut: signOut
  };
})();
