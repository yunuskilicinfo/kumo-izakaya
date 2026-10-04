/* ==========================================================================
   KUMO IZAKAYA — istemci ayarları (hepsi herkese açık değerlerdir; gizli anahtar YOK)
   apiBase          Supabase Edge Function "booking" adresi
   turnstileSiteKey Cloudflare Turnstile SITE key. Aşağıdaki değer Cloudflare'in
                    herkese açık TEST anahtarıdır (her zaman geçer) — yayına almadan
                    önce kendi widget'ınızın site key'iyle değiştirin (README).
   supabaseUrl/Key  Yalnızca admin.html girişi için (publishable key herkese açıktır)
   ========================================================================== */
window.KUMO_CONFIG = {
  apiBase: "https://qcvcvbugvbpxyimeonuf.supabase.co/functions/v1/booking",
  chatApiBase: "https://qcvcvbugvbpxyimeonuf.supabase.co/functions/v1/chat",
  turnstileSiteKey: "1x00000000000000000000AA",
  supabaseUrl: "https://qcvcvbugvbpxyimeonuf.supabase.co",
  supabaseKey: "sb_publishable_7PN2arFuDfP2evTRtip5RA_4la9d3r5"
};
