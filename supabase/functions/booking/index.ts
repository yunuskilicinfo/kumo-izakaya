// Kumo Izakaya — rezervasyon API'si (Supabase Edge Function).
// Rotalar (son path parçası): availability · reserve · cancel · admin · reminders · daily
// Üye rotaları (Supabase Auth oturumu ile): me · me-update · me-cancel · me-delete · event-book · event-cancel
// Gizli anahtarlar Supabase → Edge Functions → Secrets'tan gelir (README'ye bakın).
import { createClient } from "npm:@supabase/supabase-js@2";

const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(Deno.env.get("SUPABASE_URL")!, SRK, { auth: { persistSession: false } });
const env = (k: string) => Deno.env.get(k) ?? "";
const TZ = "Europe/Istanbul"; // Türkiye sabit UTC+3 (yaz saati yok)
const AREAS = ["hall", "private"];

// ---------------------------------------------------------------- http
function corsFor(req: Request) {
  const o = req.headers.get("origin") ?? "";
  const extra = env("ALLOWED_ORIGINS").split(",").map((s) => s.trim()).filter(Boolean);
  const ok = !!o && (extra.includes(o) || /^https?:\/\/localhost(:\d+)?$/.test(o) ||
    /^https:\/\/kumo-izakaya[a-z0-9-]*\.vercel\.app$/.test(o));
  const h: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
    "Vary": "Origin",
  };
  if (ok) h["Access-Control-Allow-Origin"] = o;
  return { origin: ok ? o : "", h };
}
const reply = (cors: Record<string, string>, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

// ---------------------------------------------------------------- crypto
async function sha256hex(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
// İptal token'ı rezervasyon id'sinden türetilir; böylece hatırlatma e-postası da aynı linki üretebilir.
async function tokenFor(id: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env("CANCEL_SECRET") || SRK),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(id));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function ipKey(req: Request, prefix: string) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  return `${prefix}:${(await sha256hex(ip + ":kumo")).slice(0, 24)}`;
}
async function allowed(key: string, seconds: number, max: number) {
  const { data, error } = await db.rpc("rate_limit_hit", { p_key: key, p_window_seconds: seconds, p_max: max });
  return error ? true : data === true; // sayaç hatasında müşteriyi engelleme
}

// ---------------------------------------------------------------- formatting
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
function when(iso: string, lang: string) {
  const d = new Date(iso);
  return {
    date: new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "tr-TR", { dateStyle: "full", timeZone: TZ }).format(d),
    time: new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ }).format(d),
  };
}
const L = {
  tr: {
    hall: "Salon", private: "Özel oda", guests: (n: number) => `${n} kişi`,
    code: "Rezervasyon kodu", when: "Tarih ve saat", party: "Kişi sayısı", area: "Alan",
    confirm: { s: "Rezervasyonunuz onaylandı", h: "Masanız hazır", p: (n: string) => `Merhaba ${n}, rezervasyonunuz onaylandı. Sizi bekliyoruz.` },
    remind: { s: "Rezervasyonunuza 24 saat kaldı", h: "Sizi yakında bekliyoruz", p: (n: string) => `Merhaba ${n}, yaklaşan rezervasyonunuzu hatırlatmak isteriz.` },
    cancel: { s: "Rezervasyonunuz iptal edildi", h: "Rezervasyon iptal edildi", p: (n: string) => `Merhaba ${n}, aşağıdaki rezervasyonunuz iptal edildi. Tekrar bekleriz.` },
    btn: "Rezervasyonu iptal et", hint: "Planınız değişirse lütfen önceden iptal edin; masayı başka bir misafire açabilelim.",
    addr: "Bulut Sokak No. 7, Beşiktaş, İstanbul",
    stamp: "Üye rezervasyonu: ziyaretiniz tamamlanınca sadakat kartınıza bir damga eklenir.",
    evt: {
      confirm: { s: "Yeriniz ayrıldı", h: "Üyelere özel akşam", p: (n: string) => `Merhaba ${n}, aşağıdaki akşam için yeriniz ayrıldı. Hesabınızdan iptal edebilirsiniz.` },
      cancel: { s: "Etkinlik kaydınız iptal edildi", h: "Kayıt iptal edildi", p: (n: string) => `Merhaba ${n}, aşağıdaki akşam için kaydınız iptal edildi.` },
      off: { s: "Etkinlik iptal edildi", h: "Akşam iptal edildi", p: (n: string) => `Merhaba ${n}, üzgünüz; aşağıdaki akşam restoran tarafından iptal edildi.` },
      event: "Etkinlik", price: "Ücret",
    },
  },
  en: {
    hall: "Main hall", private: "Private room", guests: (n: number) => `${n} guest${n > 1 ? "s" : ""}`,
    code: "Booking code", when: "Date & time", party: "Party size", area: "Area",
    confirm: { s: "Your reservation is confirmed", h: "Your table is ready", p: (n: string) => `Hello ${n}, your reservation is confirmed. We look forward to seeing you.` },
    remind: { s: "Your reservation is in 24 hours", h: "We'll see you soon", p: (n: string) => `Hello ${n}, a quick reminder about your upcoming reservation.` },
    cancel: { s: "Your reservation was cancelled", h: "Reservation cancelled", p: (n: string) => `Hello ${n}, the reservation below has been cancelled. We hope to welcome you another time.` },
    btn: "Cancel reservation", hint: "If your plans change, please cancel in advance so we can offer the table to another guest.",
    addr: "Bulut Sokak No. 7, Beşiktaş, Istanbul",
    stamp: "Member booking: once your visit is completed, a stamp is added to your loyalty card.",
    evt: {
      confirm: { s: "Your seat is reserved", h: "Members' evening", p: (n: string) => `Hello ${n}, your seat for the evening below is reserved. You can cancel from your account.` },
      cancel: { s: "Your event booking was cancelled", h: "Booking cancelled", p: (n: string) => `Hello ${n}, your booking for the evening below has been cancelled.` },
      off: { s: "Event cancelled", h: "Evening cancelled", p: (n: string) => `Hello ${n}, we're sorry — the evening below has been cancelled by the restaurant.` },
      event: "Event", price: "Price",
    },
  },
} as const;

type Res = { id: string; code: string; starts_at: string; party_size: number; area: string; name: string; phone?: string; email?: string | null; note?: string | null; lang: string; member?: boolean };

const mrow = (a: string, b: string) => `<tr><td style="padding:6px 0;color:#6B6760;font-size:13px">${a}</td><td style="padding:6px 0;text-align:right;font-size:15px">${esc(b)}</td></tr>`;
function mailShell(lang: "tr" | "en", h: string, p: string, rows: string, after = "") {
  return `<!doctype html><html lang="${lang}"><body style="margin:0;background:#F7F6F3;font-family:Helvetica,Arial,sans-serif;color:#232220">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:520px" cellpadding="0" cellspacing="0">
<tr><td style="background:#1B1A18;color:#F7F6F3;padding:26px 32px;font-family:Georgia,serif;font-size:22px;letter-spacing:.06em">Kumo Izakaya</td></tr>
<tr><td style="background:#fff;padding:32px">
<h1 style="font-family:Georgia,serif;font-weight:500;font-size:24px;margin:0 0 12px">${h}</h1>
<p style="margin:0 0 20px;line-height:1.6">${p}</p>
<table role="presentation" width="100%" style="border-top:1px solid #ECEAE5;border-bottom:1px solid #ECEAE5;margin:0 0 4px">
${rows}
</table>${after}
</td></tr>
<tr><td style="padding:18px 32px;font-size:12px;color:#6B6760">${L[lang].addr}<br>Kumo Izakaya</td></tr>
</table></td></tr></table></body></html>`;
}

function mailHtml(r: Res, kind: "confirm" | "remind" | "cancel", cancelUrl?: string) {
  const lang = r.lang === "en" ? "en" : "tr";
  const t = L[lang], k = t[kind], w = when(r.starts_at, lang);
  const btn = kind !== "cancel" && cancelUrl
    ? `<p style="margin:28px 0 8px"><a href="${esc(cancelUrl)}" style="display:inline-block;padding:12px 26px;border:1px solid #1B1A18;border-radius:999px;color:#1B1A18;text-decoration:none;font-size:14px">${t.btn}</a></p><p style="font-size:12px;color:#6B6760;margin:0">${t.hint}</p>` : "";
  const stamp = kind === "confirm" && r.member ? `<p style="font-size:13px;color:#6B6760;margin:20px 0 0">${t.stamp}</p>` : "";
  return mailShell(lang, k.h, k.p(esc(r.name)),
    mrow(t.code, r.code) + mrow(t.when, `${w.date}, ${w.time}`) + mrow(t.party, t.guests(r.party_size)) + mrow(t.area, t[r.area === "private" ? "private" : "hall"]),
    btn + stamp);
}

type Evt = { title_tr: string; title_en?: string | null; price_note_tr?: string | null; price_note_en?: string | null; starts_at: string };
function eventMailHtml(lang: "tr" | "en", name: string, e: Evt, party: number, kind: "confirm" | "cancel" | "off") {
  const t = L[lang], k = t.evt[kind], w = when(e.starts_at, lang);
  const title = (lang === "en" && e.title_en) || e.title_tr;
  const price = (lang === "en" && e.price_note_en) || e.price_note_tr;
  return mailShell(lang, k.h, k.p(esc(name)),
    mrow(t.evt.event, title) + mrow(t.when, `${w.date}, ${w.time}`) + mrow(t.party, t.guests(party)) + (price ? mrow(t.evt.price, price) : ""));
}

// ---------------------------------------------------------------- outbound channels (hepsi hata-toleranslı)
async function sendMail(to: string | null | undefined, subject: string, html: string) {
  const key = env("RESEND_API_KEY");
  if (!key || !to) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env("MAIL_FROM") || "Kumo Izakaya <onboarding@resend.dev>", to: [to], subject, html }),
    });
    if (!res.ok) console.error("resend", res.status, await res.text());
    return res.ok;
  } catch (e) { console.error("resend", e); return false; }
}
async function sendTelegram(html: string, button?: { text: string; url: string }) {
  const token = env("TELEGRAM_BOT_TOKEN"), chat = env("TELEGRAM_CHAT_ID");
  if (!token || !chat) return false;
  try {
    const body: Record<string, unknown> = { chat_id: chat, text: html, parse_mode: "HTML", disable_web_page_preview: true };
    if (button && /^https:\/\//.test(button.url)) body.reply_markup = { inline_keyboard: [[button]] };
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (!r.ok) console.error("telegram", r.status, await r.text());
    return r.ok;
  } catch (e) { console.error("telegram", e); return false; }
}
function adminButton() {
  const base = env("SITE_URL").replace(/\/$/, "");
  return base ? { text: "Yönetim paneli", url: `${base}/admin.html` } : undefined;
}
function staffTelegram(title: string, r: Res) {
  const w = when(r.starts_at, "tr");
  return [
    `<b>${title}</b>`,
    `<b>${esc(r.code)}</b> · ${esc(w.date)} · <b>${esc(w.time)}</b>`,
    `👥 ${r.party_size} kişi · ${L.tr[r.area === "private" ? "private" : "hall"]}`,
    `👤 ${esc(r.name)}`,
    ...(r.phone ? [`📞 <code>${esc(r.phone)}</code>`] : []),
    ...(r.email ? [`✉️ ${esc(r.email)}`] : []),
    ...(r.note ? [`📝 Not: ${esc(r.note)}`] : []),
  ].join("\n");
}
async function notifyStaff(subject: string, r: Res) {
  const lines = staffLines(r);
  const text = [subject, ...lines].join("\n");
  const jobs: Promise<unknown>[] = [];
  const to = env("RESTAURANT_EMAIL") || (await db.from("settings").select("restaurant_email").eq("id", 1).single()).data?.restaurant_email;
  jobs.push(sendMail(to, subject, `<pre style="font:15px/1.6 Helvetica,Arial,sans-serif">${esc(lines.join("\n"))}</pre>`));
  jobs.push(sendTelegram(staffTelegram(esc(subject), r), adminButton()));
  if (env("WHATSAPP_TOKEN") && env("WHATSAPP_PHONE_ID") && env("WHATSAPP_TO")) {
    // İş başlatan mesajlar Meta'da onaylı bir şablon ister: gövdesinde tek {{1}} parametresi olan bir şablon.
    jobs.push(fetch(`https://graph.facebook.com/v20.0/${env("WHATSAPP_PHONE_ID")}/messages`, {
      method: "POST", headers: { Authorization: `Bearer ${env("WHATSAPP_TOKEN")}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp", to: env("WHATSAPP_TO"), type: "template",
        template: { name: env("WHATSAPP_TEMPLATE") || "rezervasyon_bildirimi", language: { code: "tr" },
          components: [{ type: "body", parameters: [{ type: "text", text: text.replace(/\n+/g, " · ").slice(0, 900) }] }] },
      }),
    }).then(async (r) => { if (!r.ok) console.error("whatsapp", r.status, await r.text()); }));
  }
  await Promise.allSettled(jobs);
}
function staffLines(r: Res) {
  const w = when(r.starts_at, "tr");
  return [`${r.code} · ${w.date} ${w.time}`, `${r.party_size} kişi · ${L.tr[r.area === "private" ? "private" : "hall"]}`,
    `${r.name} · ${r.phone ?? ""}`, ...(r.note ? [`Not: ${r.note}`] : [])];
}
const background = (p: Promise<unknown>) => {
  // deno-lint-ignore no-explicit-any
  try { (globalThis as any).EdgeRuntime.waitUntil(p); } catch { /* yerelde bekle */ }
};
async function cancelLink(id: string, origin: string) {
  const base = (env("SITE_URL") || origin).replace(/\/$/, "");
  return base ? `${base}/iptal.html?token=${await tokenFor(id)}` : undefined;
}

// ---------------------------------------------------------------- validation
const isDate = (s: unknown) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
const isTime = (s: unknown) => typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const isEmail = (s: unknown) => typeof s === "string" && s.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const digits = (s: string) => s.replace(/\D/g, "");
const toStart = (d: string, t: string) => new Date(`${d}T${t}:00+03:00`).toISOString();

async function verifyTurnstile(token: unknown, req: Request) {
  const secret = env("TURNSTILE_SECRET");
  if (!secret) return true; // anahtar girilene kadar doğrulama atlanır
  if (typeof token !== "string" || !token) return false;
  const body = new URLSearchParams({ secret, response: token, remoteip: (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() });
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    return (await r.json()).success === true;
  } catch { return false; }
}

// ---------------------------------------------------------------- handlers
async function availability(req: Request, cors: Record<string, string>) {
  const u = new URL(req.url);
  const date = u.searchParams.get("date"), party = Number(u.searchParams.get("party")), area = u.searchParams.get("area") ?? "hall";
  if (!isDate(date) || !Number.isInteger(party) || party < 1 || !AREAS.includes(area)) return reply(cors, { error: "invalid" }, 400);
  if (!(await allowed(await ipKey(req, "avail"), 60, 60))) return reply(cors, { error: "rate_limited" }, 429);
  const member = !!(await userFrom(req));
  const { data, error } = await db.rpc("get_availability", { p_date: date, p_party: party, p_area: area, p_member: member });
  if (error) { console.error(error); return reply(cors, { error: "server" }, 500); }
  return reply(cors, data);
}

async function reserve(req: Request, cors: Record<string, string>, origin: string) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return reply(cors, { error: "invalid" }, 400);
  const name = String(b.name ?? "").trim(), phone = String(b.phone ?? "").trim(), email = String(b.email ?? "").trim();
  const note = String(b.note ?? "").trim(), lang = b.lang === "en" ? "en" : "tr", party = Number(b.party), area = String(b.area ?? "hall");
  const bad = (field: string) => reply(cors, { error: "invalid", field }, 400);
  if (!isDate(b.date)) return bad("date");
  if (!isTime(b.time)) return bad("time");
  if (!Number.isInteger(party) || party < 1) return bad("party");
  if (!AREAS.includes(area)) return bad("area");
  if (!name || name.length > 100) return bad("name");
  if (digits(phone).length < 7 || digits(phone).length > 15 || phone.length > 30) return bad("phone");
  if (!isEmail(email)) return bad("email");
  if (note.length > 500) return bad("note");
  if (b.consent !== true) return bad("consent");

  if (!(await allowed(await ipKey(req, "reserve"), 3600, 5))) return reply(cors, { error: "rate_limited" }, 429);
  if (!(await verifyTurnstile(b.turnstile, req))) return reply(cors, { error: "captcha" }, 403);

  const user = await userFrom(req); // giriş yapmış üye → rezervasyon hesabına bağlanır
  const { data, error } = await db.rpc("create_reservation", {
    p_start: toStart(b.date, b.time), p_party: party, p_area: area, p_name: name, p_phone: phone, p_email: email,
    p_note: note, p_lang: lang, p_token_hash: null, p_source: "web", p_force: false, p_consent: true,
    p_user_id: user?.id ?? null,
  });
  if (error) { console.error(error); return reply(cors, { error: "server" }, 500); }
  if (!data.ok) return reply(cors, { error: "unavailable", reason: data.reason }, 409);

  await db.from("reservations").update({ cancel_token_hash: await sha256hex(await tokenFor(data.id)) }).eq("id", data.id);
  const r: Res = { id: data.id, code: data.code, starts_at: data.starts_at, party_size: party, area, name, phone, email, note, lang, member: !!user };
  background((async () => {
    const link = await cancelLink(r.id, origin);
    await Promise.allSettled([
      sendMail(email, L[lang].confirm.s, mailHtml(r, "confirm", link)),
      notifyStaff(user ? "🍶 Yeni rezervasyon (üye)" : "🍶 Yeni rezervasyon", r),
    ]);
  })());
  return reply(cors, { ok: true, code: r.code, starts_at: r.starts_at, party_size: party, area, member: !!user });
}

async function cancel(req: Request, cors: Record<string, string>) {
  if (!(await allowed(await ipKey(req, "cancel"), 600, 30))) return reply(cors, { error: "rate_limited" }, 429);
  if (req.method === "GET") {
    const token = new URL(req.url).searchParams.get("token") ?? "";
    const { data } = await db.rpc("get_reservation_by_token", { p_hash: token ? await sha256hex(token) : "" });
    return reply(cors, data ?? { error: "not_found" }, data?.error ? 404 : 200);
  }
  const b = await req.json().catch(() => ({}));
  const token = String(b?.token ?? "");
  const { data, error } = await db.rpc("cancel_reservation_by_token", { p_hash: token ? await sha256hex(token) : "" });
  if (error) { console.error(error); return reply(cors, { error: "server" }, 500); }
  if (!data.ok) return reply(cors, { error: data.reason }, data.reason === "not_found" ? 404 : 409);
  background(notifyCustomerCancel({ ...data, lang: data.lang }));
  return reply(cors, { ok: true, code: data.code });
}

function notifyCustomerCancel(r: Res) {
  return Promise.allSettled([
    sendMail(r.email, L[r.lang === "en" ? "en" : "tr"].cancel.s, mailHtml(r, "cancel")),
    notifyStaff("❌ Rezervasyon iptal (müşteri)", r),
  ]);
}

// Supabase Auth oturumu (Authorization: Bearer <access_token>). Yoksa / geçersizse null = misafir.
async function userFrom(req: Request) {
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer /i, "").trim();
  if (!jwt) return null;
  const { data, error } = await db.auth.getUser(jwt);
  return error || !data.user ? null : data.user;
}
async function requireAdmin(req: Request) {
  const user = await userFrom(req);
  if (!user) return null;
  const { data: a } = await db.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
  return a ? user : null;
}

async function admin(req: Request, cors: Record<string, string>, origin: string) {
  if (!(await requireAdmin(req))) return reply(cors, { error: "forbidden" }, 403);
  const b = await req.json().catch(() => null);
  if (!b) return reply(cors, { error: "invalid" }, 400);

  if (b.action === "cancel" || b.action === "set_status") {
    const status = b.action === "cancel" ? "cancelled" : String(b.status);
    if (!["cancelled", "no_show", "completed", "confirmed"].includes(status)) return reply(cors, { error: "invalid" }, 400);
    const patch: Record<string, unknown> = { status };
    if (status === "cancelled") Object.assign(patch, { cancelled_at: new Date().toISOString(), cancelled_by: "admin" });
    const { data, error } = await db.from("reservations").update(patch).eq("id", b.id).select().single();
    if (error || !data) return reply(cors, { error: "not_found" }, 404);
    if (status === "cancelled") background(sendMail(data.email, L[data.lang === "en" ? "en" : "tr"].cancel.s, mailHtml(data, "cancel")));
    return reply(cors, { ok: true });
  }

  if (b.action === "create") {
    const party = Number(b.party), area = String(b.area ?? "hall"), lang = b.lang === "en" ? "en" : "tr";
    const name = String(b.name ?? "").trim(), phone = String(b.phone ?? "").trim(), email = String(b.email ?? "").trim();
    if (!isDate(b.date) || !isTime(b.time) || !Number.isInteger(party) || party < 1 || !AREAS.includes(area) || !name || digits(phone).length < 7)
      return reply(cors, { error: "invalid" }, 400);
    if (email && !isEmail(email)) return reply(cors, { error: "invalid", field: "email" }, 400);
    const { data, error } = await db.rpc("create_reservation", {
      p_start: toStart(b.date, b.time), p_party: party, p_area: area, p_name: name, p_phone: phone, p_email: email || null,
      p_note: String(b.note ?? "").slice(0, 500), p_lang: lang, p_token_hash: null, p_source: "admin", p_force: b.force === true, p_consent: false,
    });
    if (error) { console.error(error); return reply(cors, { error: "server" }, 500); }
    if (!data.ok) return reply(cors, { error: "unavailable", reason: data.reason }, 409);
    await db.from("reservations").update({ cancel_token_hash: await sha256hex(await tokenFor(data.id)) }).eq("id", data.id);
    if (email) {
      const r: Res = { id: data.id, code: data.code, starts_at: data.starts_at, party_size: party, area, name, email, lang };
      background((async () => sendMail(email, L[lang].confirm.s, mailHtml(r, "confirm", await cancelLink(r.id, origin))))());
    }
    return reply(cors, { ok: true, code: data.code });
  }

  if (b.action === "redeem_reward") {
    const { data, error } = await db.from("rewards")
      .update({ status: "redeemed", redeemed_at: new Date().toISOString(), redeemed_reservation_id: b.reservation_id || null })
      .eq("id", b.id).eq("status", "issued").select("id").maybeSingle();
    if (error) { console.error(error); return reply(cors, { error: "server" }, 500); }
    if (!data) return reply(cors, { error: "not_found" }, 404);
    return reply(cors, { ok: true });
  }

  if (b.action === "cancel_event") {
    const { data: e, error } = await db.from("events").update({ status: "cancelled" }).eq("id", b.id).neq("status", "cancelled").select().maybeSingle();
    if (error) { console.error(error); return reply(cors, { error: "server" }, 500); }
    if (!e) return reply(cors, { error: "not_found" }, 404);
    const { data: bookings } = await db.from("event_bookings").select("party_size, profiles(email, full_name, lang)")
      .eq("event_id", e.id).eq("status", "confirmed");
    if (e.starts_at > new Date().toISOString()) {
      background(Promise.allSettled((bookings ?? []).map((x) => {
        // deno-lint-ignore no-explicit-any
        const p = (x as any).profiles, lang = p?.lang === "en" ? "en" : "tr";
        return sendMail(p?.email, L[lang].evt.off.s, eventMailHtml(lang, p?.full_name || "", e, x.party_size, "off"));
      })));
    }
    return reply(cors, { ok: true, notified: bookings?.length ?? 0 });
  }
  return reply(cors, { error: "invalid" }, 400);
}

// ---------------------------------------------------------------- members
const isConsented = (p: { marketing_consent_at: string | null; marketing_revoked_at: string | null }) =>
  !!p.marketing_consent_at && (!p.marketing_revoked_at || p.marketing_revoked_at < p.marketing_consent_at);

async function me(req: Request, cors: Record<string, string>) {
  const u = await userFrom(req);
  if (!u) return reply(cors, { error: "unauthorized" }, 401);
  if (!(await allowed(`me:${u.id}`, 60, 60))) return reply(cors, { error: "rate_limited" }, 429);
  // Profil tetikleyiciyle açılır; yine de yoksa burada oluşur. last_seen_at 24 ay hareketsizlik silmesi içindir.
  const prof = await db.from("profiles").upsert({ id: u.id, email: u.email, last_seen_at: new Date().toISOString() }, { onConflict: "id" })
    .select("full_name, phone, birth_month, birth_day, lang, marketing_consent_at, marketing_revoked_at, created_at").single();
  if (prof.error) { console.error(prof.error); return reply(cors, { error: "server" }, 500); }
  const [st, res, stamps, rewards, events] = await Promise.all([
    db.from("settings").select("horizon_days, member_horizon_days, stamps_per_reward, reward_text_tr, reward_text_en").eq("id", 1).single(),
    db.from("reservations").select("id, code, status, area, starts_at, party_size").eq("user_id", u.id).order("starts_at", { ascending: false }).limit(50),
    db.from("loyalty_stamps").select("id", { count: "exact", head: true }).eq("user_id", u.id).is("reward_id", null),
    db.from("rewards").select("id, code, status, issued_at, redeemed_at").eq("user_id", u.id).order("issued_at", { ascending: false }).limit(20),
    db.rpc("member_events", { p_user: u.id }),
  ]);
  const bad = [st, res, stamps, rewards, events].find((x) => x.error);
  if (bad) { console.error(bad.error); return reply(cors, { error: "server" }, 500); }
  const s = st.data!, p = prof.data;
  // Sonradan Google'a bağlanan hesaplarda ad profile tetikleyiciyle yazılmamış olabilir: ilk açılışta kaydet.
  const metaName = String(u.user_metadata?.full_name || u.user_metadata?.name || "").trim().slice(0, 100);
  if (!p.full_name && metaName) {
    const { error } = await db.from("profiles").update({ full_name: metaName }).eq("id", u.id).is("full_name", null);
    if (!error) p.full_name = metaName;
  }
  return reply(cors, {
    email: u.email, provider: u.app_metadata?.provider ?? "email",
    profile: { ...p, marketing: isConsented(p) },
    horizon_days: Math.max(s.member_horizon_days, s.horizon_days),
    loyalty: { stamps: stamps.count ?? 0, per_reward: s.stamps_per_reward, reward_text: { tr: s.reward_text_tr, en: s.reward_text_en } },
    rewards: rewards.data, reservations: res.data, events: events.data,
  });
}

async function meUpdate(req: Request, cors: Record<string, string>) {
  const u = await userFrom(req);
  if (!u) return reply(cors, { error: "unauthorized" }, 401);
  if (!(await allowed(`me-up:${u.id}`, 3600, 30))) return reply(cors, { error: "rate_limited" }, 429);
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return reply(cors, { error: "invalid" }, 400);
  const bad = (field: string) => reply(cors, { error: "invalid", field }, 400);
  const name = String(b.full_name ?? "").trim(), phone = String(b.phone ?? "").trim();
  if (name.length > 100) return bad("full_name");
  if (phone && (digits(phone).length < 7 || digits(phone).length > 15 || phone.length > 30)) return bad("phone");
  const bm = b.birth_month == null || b.birth_month === "" ? null : Number(b.birth_month);
  const bd = b.birth_day == null || b.birth_day === "" ? null : Number(b.birth_day);
  if ((bm === null) !== (bd === null)) return bad("birthday");
  if (bm !== null && bd !== null && (!Number.isInteger(bm) || bm < 1 || bm > 12 || !Number.isInteger(bd) || bd < 1 ||
      bd > new Date(Date.UTC(2024, bm, 0)).getUTCDate())) return bad("birthday");
  const patch: Record<string, unknown> = { full_name: name || null, phone: phone || null, birth_month: bm, birth_day: bd, lang: b.lang === "en" ? "en" : "tr" };
  if (typeof b.marketing === "boolean") {
    const { data: cur } = await db.from("profiles").select("marketing_consent_at, marketing_revoked_at").eq("id", u.id).single();
    const on = cur ? isConsented(cur) : false, now = new Date().toISOString();
    if (b.marketing && !on) Object.assign(patch, { marketing_consent_at: now, marketing_revoked_at: null });
    if (!b.marketing && on) patch.marketing_revoked_at = now;
  }
  const { error } = await db.from("profiles").update(patch).eq("id", u.id);
  if (error) { console.error(error); return reply(cors, { error: "server" }, 500); }
  return reply(cors, { ok: true });
}

async function meCancel(req: Request, cors: Record<string, string>) {
  const u = await userFrom(req);
  if (!u) return reply(cors, { error: "unauthorized" }, 401);
  if (!(await allowed(`me-cancel:${u.id}`, 3600, 20))) return reply(cors, { error: "rate_limited" }, 429);
  const b = await req.json().catch(() => ({}));
  const { data: r } = await db.from("reservations").select("*").eq("id", String(b?.id ?? "")).eq("user_id", u.id).maybeSingle();
  if (!r) return reply(cors, { error: "not_found" }, 404);
  if (r.status !== "confirmed") return reply(cors, { error: "not_active" }, 409);
  if (r.starts_at <= new Date().toISOString()) return reply(cors, { error: "past" }, 409);
  const { data, error } = await db.from("reservations").update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancelled_by: "customer" })
    .eq("id", r.id).eq("status", "confirmed").select("id").maybeSingle();
  if (error) { console.error(error); return reply(cors, { error: "server" }, 500); }
  if (!data) return reply(cors, { error: "not_active" }, 409);
  background(notifyCustomerCancel(r));
  return reply(cors, { ok: true, code: r.code });
}

async function meDelete(req: Request, cors: Record<string, string>) {
  const u = await userFrom(req);
  if (!u) return reply(cors, { error: "unauthorized" }, 401);
  const b = await req.json().catch(() => ({}));
  if (b?.confirm !== true) return reply(cors, { error: "invalid" }, 400);
  const { data: a } = await db.from("admin_users").select("user_id").eq("user_id", u.id).maybeSingle();
  if (a) return reply(cors, { error: "admin" }, 409); // yönetici hesabı buradan silinmez
  // Gelecekteki rezervasyonlar geçerli kalır (hesap bağı kopar); profil, damga, ödül ve etkinlik kayıtları silinir.
  const { error } = await db.auth.admin.deleteUser(u.id);
  if (error) { console.error(error); return reply(cors, { error: "server" }, 500); }
  return reply(cors, { ok: true });
}

async function eventBook(req: Request, cors: Record<string, string>) {
  const u = await userFrom(req);
  if (!u) return reply(cors, { error: "unauthorized" }, 401);
  if (!(await allowed(`evt:${u.id}`, 3600, 10))) return reply(cors, { error: "rate_limited" }, 429);
  const b = await req.json().catch(() => null);
  const party = Number(b?.party), note = String(b?.note ?? "").trim();
  if (!b || typeof b.id !== "string" || !/^[0-9a-f-]{36}$/i.test(b.id) || !Number.isInteger(party) || party < 1 || note.length > 300)
    return reply(cors, { error: "invalid" }, 400);
  const { data: p } = await db.from("profiles").select("full_name, phone, lang").eq("id", u.id).single();
  if (!p?.full_name || !p?.phone) return reply(cors, { error: "profile_incomplete" }, 409);
  const { data, error } = await db.rpc("book_event", { p_event: b.id, p_user: u.id, p_party: party, p_note: note });
  if (error) { console.error(error); return reply(cors, { error: "server" }, 500); }
  if (!data.ok) return reply(cors, { error: "unavailable", reason: data.reason }, 409);
  const { data: e } = await db.from("events").select("*").eq("id", b.id).single();
  const lang = p.lang === "en" ? "en" : "tr", w = when(e.starts_at, "tr");
  background(Promise.allSettled([
    sendMail(u.email, L[lang].evt.confirm.s, eventMailHtml(lang, p.full_name, e, party, "confirm")),
    sendTelegram([`<b>🎟 Etkinlik kaydı</b>`, `<b>${esc(e.title_tr)}</b> · ${esc(w.date)} ${esc(w.time)}`,
      `👥 ${party} kişi · 👤 ${esc(p.full_name)}`, `📞 <code>${esc(p.phone)}</code>`, ...(note ? [`📝 ${esc(note)}`] : [])].join("\n"), adminButton()),
  ]));
  return reply(cors, { ok: true });
}

async function eventCancel(req: Request, cors: Record<string, string>) {
  const u = await userFrom(req);
  if (!u) return reply(cors, { error: "unauthorized" }, 401);
  if (!(await allowed(`evt:${u.id}`, 3600, 10))) return reply(cors, { error: "rate_limited" }, 429);
  const b = await req.json().catch(() => ({}));
  const id = String(b?.id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return reply(cors, { error: "invalid" }, 400);
  const { data: bk } = await db.from("event_bookings").select("id, party_size, status, events(*)").eq("id", id).eq("user_id", u.id).maybeSingle();
  // deno-lint-ignore no-explicit-any
  const e = (bk as any)?.events;
  if (!bk || !e) return reply(cors, { error: "not_found" }, 404);
  if (bk.status !== "confirmed") return reply(cors, { error: "not_active" }, 409);
  if (e.starts_at <= new Date().toISOString()) return reply(cors, { error: "past" }, 409);
  const { error } = await db.from("event_bookings").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", bk.id);
  if (error) { console.error(error); return reply(cors, { error: "server" }, 500); }
  const { data: p } = await db.from("profiles").select("full_name, lang").eq("id", u.id).single();
  const lang = p?.lang === "en" ? "en" : "tr", w = when(e.starts_at, "tr");
  background(Promise.allSettled([
    sendMail(u.email, L[lang].evt.cancel.s, eventMailHtml(lang, p?.full_name || "", e, bk.party_size, "cancel")),
    sendTelegram([`<b>❌ Etkinlik kaydı iptal</b>`, `<b>${esc(e.title_tr)}</b> · ${esc(w.date)} ${esc(w.time)}`,
      `👥 ${bk.party_size} kişi · 👤 ${esc(p?.full_name || u.email || "")}`].join("\n"), adminButton()),
  ]));
  return reply(cors, { ok: true });
}

async function reminders(req: Request, cors: Record<string, string>) {
  const secret = env("CRON_SECRET");
  if (!secret) return reply(cors, { error: "not_configured" }, 503);
  if (req.headers.get("x-cron-secret") !== secret) return reply(cors, { error: "forbidden" }, 403);
  const { data, error } = await db.rpc("claim_reminders");
  if (error) { console.error(error); return reply(cors, { error: "server" }, 500); }
  let sent = 0;
  for (const r of (data ?? []) as Res[]) {
    const lang = r.lang === "en" ? "en" : "tr";
    const ok = await sendMail(r.email, L[lang].remind.s, mailHtml(r, "remind", await cancelLink(r.id, "")));
    if (ok) sent++; else await db.from("reservations").update({ reminder_sent_at: null }).eq("id", r.id); // sonraki turda yeniden dene
  }
  return reply(cors, { claimed: data?.length ?? 0, sent });
}

async function daily(req: Request, cors: Record<string, string>) {
  const secret = env("CRON_SECRET");
  if (!secret) return reply(cors, { error: "not_configured" }, 503);
  if (req.headers.get("x-cron-secret") !== secret) return reply(cors, { error: "forbidden" }, 403);
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(new Date()); // YYYY-MM-DD
  const from = new Date(toStart(today, "00:00"));
  const to = new Date(from.getTime() + 24 * 3600 * 1000);
  const { data, error } = await db.from("reservations").select("code,starts_at,party_size,area,name")
    .eq("status", "confirmed").gte("starts_at", from.toISOString()).lt("starts_at", to.toISOString()).order("starts_at");
  if (error) { console.error(error); return reply(cors, { error: "server" }, 500); }
  const rows = data ?? [];
  if (!rows.length) return reply(cors, { count: 0, sent: false });
  const guests = rows.reduce((n, r) => n + r.party_size, 0);
  const hall = rows.filter((r) => r.area !== "private").reduce((n, r) => n + r.party_size, 0);
  const head = [
    `<b>📋 Bugün — ${esc(when(from.toISOString(), "tr").date)}</b>`,
    `${rows.length} rezervasyon · ${guests} kişi (Salon ${hall} · Özel oda ${guests - hall})`,
  ].join("\n");
  const items = rows.map((r) => `${when(r.starts_at, "tr").time} · ${r.party_size} kişi · ${L.tr[r.area === "private" ? "private" : "hall"]} · ${esc(r.name)} · ${esc(r.code)}`);
  let text = head, shown = 0;
  for (const it of items) {
    if ((text + "\n" + it).length > 3800) break;
    text += "\n" + it; shown++;
  }
  if (shown < items.length) text += `\n+${items.length - shown} daha`;
  const sent = await sendTelegram(text, adminButton());
  return reply(cors, { count: rows.length, sent });
}

// ---------------------------------------------------------------- router
Deno.serve(async (req) => {
  const { origin, h: cors } = corsFor(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  const route = new URL(req.url).pathname.split("/").filter(Boolean).pop();
  try {
    if (route === "availability" && req.method === "GET") return await availability(req, cors);
    if (route === "reserve" && req.method === "POST") return await reserve(req, cors, origin);
    if (route === "cancel" && (req.method === "GET" || req.method === "POST")) return await cancel(req, cors);
    if (route === "admin" && req.method === "POST") return await admin(req, cors, origin);
    if (route === "reminders" && req.method === "POST") return await reminders(req, cors);
    if (route === "daily" && req.method === "POST") return await daily(req, cors);
    if (route === "me" && req.method === "GET") return await me(req, cors);
    if (route === "me-update" && req.method === "POST") return await meUpdate(req, cors);
    if (route === "me-cancel" && req.method === "POST") return await meCancel(req, cors);
    if (route === "me-delete" && req.method === "POST") return await meDelete(req, cors);
    if (route === "event-book" && req.method === "POST") return await eventBook(req, cors);
    if (route === "event-cancel" && req.method === "POST") return await eventCancel(req, cors);
    return reply(cors, { error: "not_found" }, 404);
  } catch (e) {
    console.error(e);
    return reply(cors, { error: "server" }, 500);
  }
});
