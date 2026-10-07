// Kumo Izakaya — Gmail günlük özeti → Telegram (Google Apps Script).
// Her sabah son 24 saatte gelen mailleri önem sırasına dizip Telegram'a gönderir.
// Gmail'i yalnızca OKUR. Kurulum: README "Gmail günlük özeti".
// Gizli değerler Script Properties'te: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID.

const AYARLAR = {
  SAAT: 9, // her gün bu saatte (±15 dk), Europe/Istanbul
  PENCERE_SAAT: 24, // kaç saat geriye bakılır
  MAKS_MAIL: 200,
  ACIL_KELIMELER: ["acil", "şikayet", "sikayet", "iade", "alerji", "zehirlen", "denetim", "tebligat", "haciz", "son gün", "ihtar", "urgent", "complaint", "refund", "allergy"],
  ONEMLI_KELIMELER: ["rezervasyon", "grup", "organizasyon", "etkinlik", "catering", "teklif", "fatura", "sipariş", "siparis", "tedarik", "ödeme", "odeme", "sözleşme", "sozlesme", "booking", "invoice", "event", "quote", "payment"],
  VIP_GONDERENLER: [], // tam adres veya "@alanadi.com" — örn. ["@muhasebeci.com", "tedarikci@firma.com"]
  YOKSAY: ["yeni rezervasyon", "rezervasyon iptal"], // sitenin kendi bildirimleri: zaten Telegram'a düşüyor
  GURULTU_GONDEREN: /no-?reply|donotreply|bildirim|newsletter|mailer-daemon|notifications?@/i,
};

// ---------------------------------------------------------------- saf fonksiyonlar (Apps Script dışında da test edilebilir)
function esc_(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function kes_(s, n) {
  s = String(s || "").replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
function gonderenAdi_(from) {
  const m = String(from || "").match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>/);
  return kes_((m && m[1].trim()) || (m && m[2]) || from || "?", 40);
}
function gonderenAdresi_(from) {
  const m = String(from || "").match(/<([^>]+)>/);
  return (m ? m[1] : String(from || "")).trim().toLowerCase();
}

// m: { from, subject, snippet, labels:[], bulk:bool, ts:number, threadId }
function puanla_(m, a) {
  a = a || AYARLAR;
  const metin = (m.subject + " " + m.snippet).toLowerCase();
  const adres = gonderenAdresi_(m.from);
  const has = (list) => list.some((k) => metin.includes(k.toLowerCase()));
  let p = 0;
  if (has(a.ACIL_KELIMELER)) p += 50;
  if (a.VIP_GONDERENLER.some((v) => adres === v.toLowerCase() || (v[0] === "@" && adres.endsWith(v.toLowerCase())))) p += 40;
  if (has(a.ONEMLI_KELIMELER)) p += 25;
  if (m.labels.includes("IMPORTANT")) p += 15;
  if (m.labels.includes("STARRED")) p += 15;
  if (m.labels.includes("UNREAD")) p += 5;
  if (m.bulk || a.GURULTU_GONDEREN.test(adres)) p -= 40;
  return p;
}
function kova_(p) { return p >= 50 ? 0 : p >= 25 ? 1 : p >= 0 ? 2 : 3; }
const KOVA_BASLIK = ["🔴 <b>Acil</b>", "🟠 <b>Önemli</b>", "🟢 <b>Bilgi</b>", "⚪ <b>Önemsiz</b>"];

function ayikla_(liste, a) {
  a = a || AYARLAR;
  return liste.filter((m) => !a.YOKSAY.some((k) => (m.subject || "").toLowerCase().includes(k)));
}

// Telegram sınırı 4096 karakter; satırları bölmeden mesajlara paylaştırır.
function ozetMetni_(liste, tarihMetni, a) {
  a = a || AYARLAR;
  if (!liste.length) return ["📭 <b>Mail özeti — " + esc_(tarihMetni) + "</b>\nSon " + a.PENCERE_SAAT + " saatte yeni mail yok."];
  const sirali = liste.map((m) => Object.assign({}, m, { puan: puanla_(m, a) }))
    .sort((x, y) => y.puan - x.puan || y.ts - x.ts);
  const kovalar = [[], [], [], []];
  sirali.forEach((m) => kovalar[kova_(m.puan)].push(m));
  const satirlar = ["📬 <b>Mail özeti — " + esc_(tarihMetni) + "</b> · " + liste.length + " mail"];
  kovalar.forEach((k, i) => {
    if (!k.length) return;
    satirlar.push("", KOVA_BASLIK[i] + " (" + k.length + ")");
    if (i === 3) {
      const adlar = [...new Set(k.map((m) => gonderenAdi_(m.from)))].slice(0, 6).map(esc_).join(", ");
      satirlar.push(adlar + (k.length > 6 ? " …" : ""));
      return;
    }
    k.forEach((m) => {
      const link = "https://mail.google.com/mail/u/0/#all/" + encodeURIComponent(m.threadId);
      satirlar.push(esc_(gonderenAdi_(m.from)) + " · <a href=\"" + link + "\"><b>" + esc_(kes_(m.subject || "(konu yok)", 80)) + "</b></a>");
      if (i < 2 && m.snippet) satirlar.push("<i>" + esc_(kes_(m.snippet, 120)) + "</i>");
    });
  });
  const parcalar = [];
  let cur = "";
  satirlar.forEach((s) => {
    if (cur && (cur + "\n" + s).length > 3800) { parcalar.push(cur); cur = s; } else cur = cur ? cur + "\n" + s : s;
  });
  if (cur) parcalar.push(cur);
  return parcalar;
}

// ---------------------------------------------------------------- Apps Script bölümü
function mailleriOku_() {
  const sinir = Math.floor(Date.now() / 1000) - AYARLAR.PENCERE_SAAT * 3600;
  const q = "after:" + sinir + " -in:spam -in:trash -in:sent -in:drafts -category:promotions -category:social";
  const ids = [];
  let token;
  do {
    const r = Gmail.Users.Messages.list("me", { q: q, maxResults: 100, pageToken: token });
    (r.messages || []).forEach((x) => ids.push(x));
    token = r.nextPageToken;
  } while (token && ids.length < AYARLAR.MAKS_MAIL);
  const goruldu = {}, out = [];
  ids.slice(0, AYARLAR.MAKS_MAIL).forEach((x) => {
    if (goruldu[x.threadId]) return; // list yeniden eskiye sıralı: thread'in en yeni mesajı
    goruldu[x.threadId] = true;
    const g = Gmail.Users.Messages.get("me", x.id, { format: "metadata", metadataHeaders: ["From", "Subject", "List-Unsubscribe", "Precedence"] });
    const h = {};
    ((g.payload && g.payload.headers) || []).forEach((e) => { h[e.name.toLowerCase()] = e.value; });
    out.push({
      threadId: x.threadId, from: h["from"] || "", subject: h["subject"] || "", snippet: g.snippet || "",
      labels: g.labelIds || [], ts: Number(g.internalDate) || 0,
      bulk: !!h["list-unsubscribe"] || /bulk|list/i.test(h["precedence"] || ""),
    });
  });
  return out;
}

function telegramGonder_(metin) {
  const p = PropertiesService.getScriptProperties();
  const token = p.getProperty("TELEGRAM_BOT_TOKEN"), chat = p.getProperty("TELEGRAM_CHAT_ID");
  if (!token || !chat) throw new Error("Script Properties: TELEGRAM_BOT_TOKEN ve TELEGRAM_CHAT_ID girilmeli.");
  const r = UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
    method: "post", contentType: "application/json", muteHttpExceptions: true,
    payload: JSON.stringify({ chat_id: chat, text: metin, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  if (r.getResponseCode() >= 300) throw new Error("Telegram " + r.getResponseCode() + ": " + r.getContentText());
}

function gunlukOzet() {
  const liste = ayikla_(mailleriOku_());
  const tarih = Utilities.formatDate(new Date(), "Europe/Istanbul", "d MMMM yyyy, HH:mm");
  ozetMetni_(liste, tarih).forEach(telegramGonder_);
}

function testOzet() { gunlukOzet(); }

// Bir kez çalıştırın: günlük tetikleyiciyi kurar (varsa eskisini siler, çift tetikleyici olmaz).
function kurulum() {
  ScriptApp.getProjectTriggers().filter((t) => t.getHandlerFunction() === "gunlukOzet").forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("gunlukOzet").timeBased().everyDays(1).atHour(AYARLAR.SAAT).nearMinute(0).inTimezone("Europe/Istanbul").create();
}
