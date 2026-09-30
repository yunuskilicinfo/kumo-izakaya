// Kumo Izakaya — rezervasyon API'si (Supabase Edge Function).
// Rotalar (son path parçası): availability · reserve · cancel · admin · reminders
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
  },
  en: {
    hall: "Main hall", private: "Private room", guests: (n: number) => `${n} guest${n > 1 ? "s" : ""}`,
    code: "Booking code", when: "Date & time", party: "Party size", area: "Area",
    confirm: { s: "Your reservation is confirmed", h: "Your table is ready", p: (n: string) => `Hello ${n}, your reservation is confirmed. We look forward to seeing you.` },
    remind: { s: "Your reservation is in 24 hours", h: "We'll see you soon", p: (n: string) => `Hello ${n}, a quick reminder about your upcoming reservation.` },
    cancel: { s: "Your reservation was cancelled", h: "Reservation cancelled", p: (n: string) => `Hello ${n}, the reservation below has been cancelled. We hope to welcome you another time.` },
    btn: "Cancel reservation", hint: "If your plans change, please cancel in advance so we can offer the table to another guest.",
    addr: "Bulut Sokak No. 7, Beşiktaş, Istanbul",
  },
} as const;

type Res = { id: string; code: string; starts_at: string; party_size: number; area: string; name: string; phone?: string; email?: string | null; note?: string | null; lang: string };

function mailHtml(r: Res, kind: "confirm" | "remind" | "cancel", cancelUrl?: string) {
  const lang = r.lang === "en" ? "en" : "tr";
  const t = L[lang], k = t[kind], w = when(r.starts_at, lang);
  const row = (a: string, b: string) => `<tr><td style="padding:6px 0;color:#6B6760;font-size:13px">${a}</td><td style="padding:6px 0;text-align:right;font-size:15px">${esc(b)}</td></tr>`;
  const btn = kind !== "cancel" && cancelUrl
    ? `<p style="margin:28px 0 8px"><a href="${esc(cancelUrl)}" style="display:inline-block;padding:12px 26px;border:1px solid #1B1A18;border-radius:999px;color:#1B1A18;text-decoration:none;font-size:14px">${t.btn}</a></p><p style="font-size:12px;color:#6B6760;margin:0">${t.hint}</p>` : "";
  return `<!doctype html><html lang="${lang}"><body style="margin:0;background:#F7F6F3;font-family:Helvetica,Arial,sans-serif;color:#232220">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:520px" cellpadding="0" cellspacing="0">
<tr><td style="background:#1B1A18;color:#F7F6F3;padding:26px 32px;font-family:Georgia,serif;font-size:22px;letter-spacing:.06em">Kumo Izakaya</td></tr>
<tr><td style="background:#fff;padding:32px">
<h1 style="font-family:Georgia,serif;font-weight:500;font-size:24px;margin:0 0 12px">${k.h}</h1>
<p style="margin:0 0 20px;line-height:1.6">${k.p(esc(r.name))}</p>
<table role="presentation" width="100%" style="border-top:1px solid #ECEAE5;border-bottom:1px solid #ECEAE5;margin:0 0 4px">
${row(t.code, r.code)}${row(t.when, `${w.date}, ${w.time}`)}${row(t.party, t.guests(r.party_size))}${row(t.area, t[r.area === "private" ? "private" : "hall"])}
</table>${btn}
</td></tr>
<tr><td style="padding:18px 32px;font-size:12px;color:#6B6760">${t.addr}<br>Kumo Izakaya</td></tr>
</table></td></tr></table></body></html>`;
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
async function notifyStaff(subject: string, lines: string[]) {
  const text = [subject, ...lines].join("\n");
  const jobs: Promise<unknown>[] = [];
  const to = env("RESTAURANT_EMAIL") || (await db.from("settings").select("restaurant_email").eq("id", 1).single()).data?.restaurant_email;
  jobs.push(sendMail(to, subject, `<pre style="font:15px/1.6 Helvetica,Arial,sans-serif">${esc(lines.join("\n"))}</pre>`));
  if (env("TELEGRAM_BOT_TOKEN") && env("TELEGRAM_CHAT_ID")) {
    jobs.push(fetch(`https://api.telegram.org/bot${env("TELEGRAM_BOT_TOKEN")}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: env("TELEGRAM_CHAT_ID"), text: esc(text), parse_mode: "HTML" }),
    }).then(async (r) => { if (!r.ok) console.error("telegram", r.status, await r.text()); }));
  }
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
  const { data, error } = await db.rpc("get_availability", { p_date: date, p_party: party, p_area: area });
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

  const { data, error } = await db.rpc("create_reservation", {
    p_start: toStart(b.date, b.time), p_party: party, p_area: area, p_name: name, p_phone: phone, p_email: email,
    p_note: note, p_lang: lang, p_token_hash: null, p_source: "web", p_force: false, p_consent: true,
  });
  if (error) { console.error(error); return reply(cors, { error: "server" }, 500); }
  if (!data.ok) return reply(cors, { error: "unavailable", reason: data.reason }, 409);

  await db.from("reservations").update({ cancel_token_hash: await sha256hex(await tokenFor(data.id)) }).eq("id", data.id);
  const r: Res = { id: data.id, code: data.code, starts_at: data.starts_at, party_size: party, area, name, phone, email, note, lang };
  background((async () => {
    const link = await cancelLink(r.id, origin);
    await Promise.allSettled([
      sendMail(email, L[lang].confirm.s, mailHtml(r, "confirm", link)),
      notifyStaff("🍶 Yeni rezervasyon", staffLines(r)),
    ]);
  })());
  return reply(cors, { ok: true, code: r.code, starts_at: r.starts_at, party_size: party, area });
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
  const r: Res = { ...data, lang: data.lang };
  background(Promise.allSettled([
    sendMail(r.email, L[r.lang === "en" ? "en" : "tr"].cancel.s, mailHtml(r, "cancel")),
    notifyStaff("❌ Rezervasyon iptal (müşteri)", staffLines(r)),
  ]));
  return reply(cors, { ok: true, code: r.code });
}

async function requireAdmin(req: Request) {
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer /i, "");
  if (!jwt) return null;
  const { data, error } = await db.auth.getUser(jwt);
  if (error || !data.user) return null;
  const { data: a } = await db.from("admin_users").select("user_id").eq("user_id", data.user.id).maybeSingle();
  return a ? data.user : null;
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
  return reply(cors, { error: "invalid" }, 400);
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
    return reply(cors, { error: "not_found" }, 404);
  } catch (e) {
    console.error(e);
    return reply(cors, { error: "server" }, 500);
  }
});
